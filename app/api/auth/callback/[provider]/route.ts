import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { generateToken } from '../../../../../lib/middleware/auth';

// OAuth configurations - same as in the provider route
const OAUTH_CONFIGS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3130/auth/google/callback',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
    tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  },
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
    redirectUri: process.env.ZOOM_REDIRECT_URI || 'http://localhost:3000/auth/zoom/callback',
    tokenUrl: 'https://zoom.us/oauth/token',
    userInfoUrl: 'https://api.zoom.us/v2/users/me',
  }
};

/**
 * Handles the OAuth2 callback from the authentication provider
 * Exchanges authorization code for access token and refresh token
 */
export async function GET(request: Request): Promise<NextResponse> {
  const provider = request.url.split('/callback/')[1].split('?')[0].toLowerCase();
  
  // Check if provider is supported
  if (!OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS]) {
    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }
  
  const config = OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS];
  
  // Get URL parameters
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Check for errors from OAuth provider
  if (error) {
    console.error(`OAuth error: ${error}`);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=${error}`);
  }
  
  // Validate required parameters
  if (!code) {
    return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
  }
  
  // Validate state parameter to prevent CSRF
  const cookieHeader = request.headers.get('cookie');
  const cookies = new Map(cookieHeader?.split(';').map(cookie => {
    const [key, value] = cookie.trim().split('=');
    return [key, value];
  }) || []);
  const storedState = cookies.get('oauth_state');
  if (storedState !== state) {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
  }
  
  try {
    // Exchange the code for access and refresh tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error || 'Failed to exchange authorization code');
    }

    // Get user information using the access token
    const userInfoResponse = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to retrieve user information');
    }

    const userInfo = await userInfoResponse.json();
    
    // Extract user details based on provider
    let email, name, providerId;
    
    switch (provider) {
      case 'google':
        email = userInfo.email;
        name = userInfo.name;
        providerId = userInfo.sub;
        break;
      case 'microsoft':
        email = userInfo.mail || userInfo.userPrincipalName;
        name = userInfo.displayName;
        providerId = userInfo.id;
        break;
      case 'zoom':
        email = userInfo.email;
        name = `${userInfo.first_name} ${userInfo.last_name}`;
        providerId = userInfo.id;
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!email) {
      throw new Error('Email not found in user info');
    }

    // Calculate token expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

    // Store user in database or update if exists
    const existingUserResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    let userId;
    
    if (existingUserResult.rows.length > 0) {
      // Update existing user
      const user = existingUserResult.rows[0];
      userId = user.id;
      
      await query(
        `UPDATE users 
         SET name = $1, provider = $2, provider_id = $3, 
             access_token = $4, refresh_token = $5, token_expires_at = $6, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          name, 
          provider, 
          providerId, 
          tokenData.access_token, 
          tokenData.refresh_token || null, 
          expiresAt, 
          userId
        ]
      );
    } else {
      // Create new user
      const result = await query(
        `INSERT INTO users 
         (email, name, provider, provider_id, access_token, refresh_token, token_expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          email, 
          name, 
          provider, 
          providerId, 
          tokenData.access_token, 
          tokenData.refresh_token || null, 
          expiresAt
        ]
      );
      
      userId = result.rows[0].id;
    }

    // Generate JWT for the user
    const jwt = generateToken({ id: userId, email, name });

    // Set JWT as an HTTP-only cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
    response.cookies.set('token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    // Clear the oauth_state cookie
    response.cookies.set('oauth_state', '', {
      maxAge: -1,
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/error?error=authentication_failed`);
  }
}
