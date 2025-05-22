import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Check authentication status for a specific Google service
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const service = searchParams.get('service');
  
  if (!service) {
    return NextResponse.json({ error: 'Service parameter is required' }, { status: 400 });
  }

  // Get the token from the cookie
  const cookieStore = await cookies();
  const tokenCookie = await cookieStore.get(`google_${service}_token`)?.value;
  
  if (!tokenCookie) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const tokenData = JSON.parse(tokenCookie);
    const isExpired = Date.now() > tokenData.expiry;
    
    if (isExpired) {
      // In a real app, you'd use the refresh token to get a new access token
      // For now, we'll just report that authentication is needed
      return NextResponse.json({ authenticated: false, reason: 'expired' });
    }
    
    return NextResponse.json({ 
      authenticated: true,
      scope: tokenData.scope,
      expiresIn: Math.floor((tokenData.expiry - Date.now()) / 1000)
    });
  } catch (error) {
    console.error('Error parsing token data:', error);
    return NextResponse.json({ authenticated: false, reason: 'invalid_token' });
  }
}
