import { NextRequest, NextResponse } from 'next/server';

// OAuth configurations
const OAUTH_CONFIGS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3130/auth/google/callback',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['email', 'profile', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/gmail.readonly'],
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
    authUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    scopes: [
      'https://outlook.office.com/IMAP.AccessAsUser.All',
      'https://outlook.office.com/POP.AccessAsUser.All',
      'https://outlook.office.com/SMTP.Send',
      'offline_access',
      'openid',
      'profile',
      'email'
    ],
  },
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
    redirectUri: process.env.ZOOM_REDIRECT_URI || 'http://localhost:3000/auth/zoom/callback',
    authUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    scopes: ['meeting:read', 'meeting:write'],
  }
};

// Initiates the OAuth2 authentication flow for the specified provider
// GET /api/auth-provider?provider=google
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }
    
    // Get provider config
    const config = OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }
    
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Build authorization URL
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    // Store state in cookie for verification in callback
    const headers = new Headers();
    headers.append('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`);
    
    // Redirect to provider's authorization page
    return NextResponse.redirect(authUrl.toString(), { headers });
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
