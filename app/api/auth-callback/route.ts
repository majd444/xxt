import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/middleware/auth';

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
 * GET /api/auth-callback?provider=google&code=AUTHORIZATION_CODE&state=STATE
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Get user's stored state from cookies for verification
    const cookies = request.headers.get('cookie') || '';
    const storedState = cookies.split('; ')
      .find(cookie => cookie.startsWith('oauth_state='))
      ?.split('=')[1];
    
    // Check for errors or missing parameters
    if (error) {
      return NextResponse.redirect(`/auth-redirect?error=${error}`, {
        status: 302
      });
    }
    
    if (!provider || !code) {
      return NextResponse.redirect('/auth-redirect?error=missing_params', {
        status: 302
      });
    }
    
    // Verify state parameter to prevent CSRF attacks
    if (state !== storedState) {
      return NextResponse.redirect('/auth-redirect?error=invalid_state', {
        status: 302
      });
    }
    
    // Get provider configuration
    const config = OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS];
    if (!config) {
      return NextResponse.redirect(`/auth-redirect?error=invalid_provider`, {
        status: 302
      });
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(`/auth-redirect?error=token_exchange_failed`, {
        status: 302
      });
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    
    // Fetch user information
    const userInfoResponse = await fetch(config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      console.error('User info fetch error:', await userInfoResponse.text());
      return NextResponse.redirect(`/auth-redirect?error=user_info_fetch_failed`, {
        status: 302
      });
    }
    
    const userData = await userInfoResponse.json();
    
    // Extract user identity (varies by provider)
    let userEmail = '';
    let userId = '';
    let name = '';
    
    if (provider === 'google') {
      userEmail = userData.email;
      userId = userData.sub;
      name = userData.name || '';
    } else if (provider === 'microsoft') {
      userEmail = userData.mail || userData.userPrincipalName;
      userId = userData.id;
      name = userData.displayName || '';
    } else if (provider === 'zoom') {
      userEmail = userData.email;
      userId = userData.id;
      name = userData.first_name + ' ' + userData.last_name;
    }
    
    if (!userEmail) {
      return NextResponse.redirect(`/auth-redirect?error=missing_email`, {
        status: 302
      });
    }
    
    // Store user data and tokens in database
    try {
      // Create users table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          provider_user_id VARCHAR(255) NOT NULL,
          provider VARCHAR(50) NOT NULL,
          email VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(provider, provider_user_id)
        )
      `);
      
      // Calculate token expiry time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
      
      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE provider = $1 AND provider_user_id = $2',
        [provider, userId]
      );
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        await query(
          `UPDATE users SET 
           access_token = $1, 
           refresh_token = $2, 
           token_expires_at = $3,
           name = $4
           WHERE provider = $5 AND provider_user_id = $6`,
          [access_token, refresh_token, expiresAt, name, provider, userId]
        );
      } else {
        // Insert new user
        await query(
          `INSERT INTO users (
            provider_user_id, provider, email, name, 
            access_token, refresh_token, token_expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, provider, userEmail, name, access_token, refresh_token, expiresAt]
        );
      }
      
      // Generate a JWT for the authenticated user
      const jwt = generateToken({
        id: userId, // Using 'id' instead of 'sub' to match UserJwtPayload interface
        email: userEmail,
        name
        // provider is not in UserJwtPayload interface
      });
      
      // Set JWT in cookies and redirect to success page
      const headers = new Headers();
      headers.append('Set-Cookie', `auth_token=${jwt}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`); // 7 days
      
      return NextResponse.redirect('/auth-redirect?success=true', {
        headers,
        status: 302
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(`/auth-redirect?error=database_error`, {
        status: 302
      });
    }
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`/auth-redirect?error=server_error`, {
      status: 302
    });
  }
}
