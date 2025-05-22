import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GOOGLE_SCOPES } from '@/lib/constants/google-scopes';

// Google OAuth2 credentials (should be stored in environment variables)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
// Client secret is used in the callback route, but declare it here for completeness
const _GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
// Use the redirect URI that's registered in the Google Cloud Console
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

// Helper to generate authorization URL
function getAuthUrl(service: keyof typeof GOOGLE_SCOPES, state: string) {
  const scopes = GOOGLE_SCOPES[service].join(' ');
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  // Log the redirect URI for debugging
  console.log('🔗 Using redirect URI:', REDIRECT_URI);
  
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  
  // Important: Set include_granted_scopes to true to avoid repeat consent prompts
  authUrl.searchParams.append('include_granted_scopes', 'true');
  
  // Force consent prompt to request refresh token
  authUrl.searchParams.append('prompt', 'consent select_account');
  
  // Adding state parameter with component info
  authUrl.searchParams.append('state', state);
  
  const finalUrl = authUrl.toString();
  console.log('🚀 Generated auth URL (truncated):', finalUrl.substring(0, 100) + '...');
  
  return finalUrl;
}

// Initiate OAuth flow
export async function GET(request: Request): Promise<NextResponse> {
  const searchParams = new URL(request.url).searchParams;
  const service = searchParams.get('service') as keyof typeof GOOGLE_SCOPES;
  
  if (!service || !GOOGLE_SCOPES[service]) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
  }
  
  // Create a state parameter with service info and workflow component ID
  const componentId = searchParams.get('componentId') || '';
  const state = Buffer.from(JSON.stringify({ service, componentId })).toString('base64');
  
  // Store state in a cookie for verification
  const cookieStore = await cookies();
  await cookieStore.set('oauth_state', state, { 
    path: '/',
    maxAge: 3600,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  
  const authUrl = getAuthUrl(service, state);
  return NextResponse.redirect(authUrl);
}
