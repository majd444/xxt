import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Google OAuth2 credentials (should be stored in environment variables)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
// Use the redirect URI that's registered in the Google Cloud Console
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

// Original GET handler for backward compatibility
export async function GET(request: NextRequest) {
  console.log('🔍 Google OAuth Callback - Started');
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  
  console.log('📝 Received parameters:', { 
    codeExists: !!code, 
    stateExists: !!stateParam 
  });
  
  // Get state from cookie to verify
  const cookieStore = await cookies();
  // State verification with cookies is now optional since we're handling this on the client side
  const _stateCookie = cookieStore.get('oauth_state')?.value;
  
  if (!code || !stateParam) {
    console.error('❌ Missing required parameters:', { code: !!code, state: !!stateParam });
    // For API route, return JSON instead of redirecting
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }
  
  try {
    console.log('🔄 Exchanging code for tokens, using redirect URI:', REDIRECT_URI);
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    const responseStatus = tokenResponse.status;
    console.log(`📊 Token exchange response status: ${responseStatus}`);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.statusText} - ${errorText}`);
    }
    
    console.log('✅ Successfully received token response');
    
    const tokenData = await tokenResponse.json();
    console.log('🔑 Token data received with fields:', Object.keys(tokenData).join(', '));
    
    // Parse the state to get component ID and service
    let service, componentId;
    try {
      const decodedState = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      service = decodedState.service;
      componentId = decodedState.componentId;
      console.log('🧩 Decoded state:', { service, componentId });
    } catch (error) {
      console.error('❌ Failed to decode state:', error);
      throw new Error('Failed to decode state parameter');
    }
    
    // For debugging only: log token info (don't log the actual token in production)
    console.log('💾 Storing token for service:', service);
    console.log('📅 Token expires in:', tokenData.expires_in, 'seconds');
    
    // Store tokens securely - in a real app, you'd store these in a database
    // For demo purposes, we're storing in a cookie, but this isn't secure for production
    try {
      cookieStore.set(`google_${service}_token`, JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expiry: Date.now() + (tokenData.expires_in || 3600) * 1000,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || '',
      }), { 
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      console.log('✅ Token successfully stored in cookie');
    } catch (error) {
      console.error('❌ Failed to store token in cookie:', error);
      throw new Error('Failed to store authentication token');
    }
    
    // Return success response with tokens and decoded state
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      service,
      componentId,
      redirectUri: REDIRECT_URI
    }, { status: 200 });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ 
      error: 'OAuth callback failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      redirectUri: REDIRECT_URI
    }, { status: 500 });
  }
}

// New POST handler to support client-side redirect handling
export async function POST(request: NextRequest) {
  console.log('🔍 Google OAuth Callback POST - Started');
  
  // Parse request body
  let body;
  try {
    body = await request.json();
    console.log('📝 Received POST parameters:', { 
      codeExists: !!body.code, 
      stateExists: !!body.state,
      redirectUri: body.redirectUri || 'not provided',
    });
  } catch (error) {
    console.error('❌ Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  const { code, state } = body;
  
  if (!code || !state) {
    console.error('❌ Missing required parameters in POST body:', { code: !!code, state: !!state });
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }
  
  // We'll use the client-provided redirectUri if available for debugging
  const effectiveRedirectUri = REDIRECT_URI;
  console.log('🔄 Using redirect URI:', effectiveRedirectUri);
  
  try {
    // Exchange code for tokens
    console.log('🔄 POST: Exchanging code for tokens');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: effectiveRedirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const responseStatus = tokenResponse.status;
    console.log(`📊 POST: Token exchange response status: ${responseStatus}`);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ POST: Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${responseStatus} - ${errorText}`);
    }
    
    console.log('✅ POST: Successfully received token response');
    
    const tokenData = await tokenResponse.json();
    console.log('🔑 POST: Token data received with fields:', Object.keys(tokenData).join(', '));
    
    // Parse the state to get component ID and service
    let service, componentId;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      service = decodedState.service;
      componentId = decodedState.componentId;
      console.log('🧩 POST: Decoded state:', { service, componentId });
    } catch (error) {
      console.error('❌ POST: Failed to decode state:', error);
      throw new Error('Failed to decode state parameter');
    }
    
    // Store tokens securely in both database and cookie (dual-storage approach)
    try {
      // 1. Always store in cookies for immediate availability
      const cookieStore = await cookies();
      await cookieStore.set(`google_${service}_token`, JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expiry: Date.now() + (tokenData.expires_in || 3600) * 1000, 
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || '',
      }), { 
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      console.log('✅ POST: Token successfully stored in cookie');
      
      // 2. Store in Sevalla database
      try {
        // Import the Sevalla database module
        const { storeOAuthToken } = await import('@/lib/sevalla-db');
        
        // Decode the ID token (if available) to get user information
        let userId = 'anonymous-user';
        if (tokenData.id_token) {
          try {
            // Simple decode of the JWT payload (middle part)
            const payload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64').toString());
            // Create a user ID based on the email or sub (subject) from the token
            userId = payload.email || payload.sub || `user-${Date.now()}`;
            console.log(`🔑 Using user identifier: ${userId}`);
          } catch (decodeError) {
            console.error('⚠️ Could not decode user info from ID token:', decodeError);
            // Fall back to unique identifier based on componentId and time
            userId = `${componentId}-${Date.now()}`;
          }
        } else {
          // Fall back to component-based identifier if no ID token
          userId = `${componentId}-${Date.now()}`;
        }
        
        // Store the token in user's personal schema in the database
        await storeOAuthToken(userId, 'google', service, {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in || 3600,
          token_type: tokenData.token_type || 'Bearer',
          scope: tokenData.scope || ''
        });
        
        // Store the userId in an additional cookie
        // Note: Since we're in the route handler, we need to set it in the response cookies
        const oauthCookies = new NextResponse(null);
        oauthCookies.cookies.set('user_id', userId, {
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
        
        console.log(`✅ POST: Token successfully stored in database for user: ${userId}`);
      } catch (dbError) {
        // Log database errors but continue using cookies
        console.warn('⚠️ POST: Could not store token in Sevalla database:', dbError);
        console.log(' Token is still available in cookies for immediate use');
      }
    } catch (error) {
      console.error('❌ POST: Failed to store authentication token:', error);
      throw new Error('Failed to store authentication token');
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      service,
      componentId,
      redirectUri: effectiveRedirectUri
    });
    
  } catch (error) {
    console.error('🚨 POST Authentication error:', error);
    
    // Return error response
    return NextResponse.json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      redirectUri: effectiveRedirectUri
    }, { status: 500 });
  }  
}
