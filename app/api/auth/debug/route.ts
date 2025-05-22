import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple debug endpoint to check token status
export async function GET(request: NextRequest) {
  console.log('🔍 Debug API called');
  
  const searchParams = request.nextUrl.searchParams;
  const service = searchParams.get('service') || 'gmail';
  
  try {
    // Get token from cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(`google_${service}_token`)?.value;
    
    if (!tokenCookie) {
      console.log('⚠️ No token found for service:', service);
      return NextResponse.json({
        tokenExists: false,
        message: `No token found for ${service}`
      });
    }
    
    // Parse token data
    const tokenData = JSON.parse(tokenCookie);
    
    // Check if token is expired
    const now = Date.now();
    const isExpired = tokenData.expiry < now;
    
    console.log('📋 Token debug info:', {
      service,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      isExpired,
      expiresIn: isExpired ? 'Expired' : `${Math.floor((tokenData.expiry - now) / 1000)} seconds`,
      scope: tokenData.scope
    });
    
    return NextResponse.json({
      tokenExists: true,
      isExpired,
      accessTokenExists: !!tokenData.access_token,
      refreshTokenExists: !!tokenData.refresh_token,
      expiresIn: isExpired ? 'Expired' : `${Math.floor((tokenData.expiry - now) / 1000)} seconds`,
      scope: tokenData.scope,
      // For security, we don't return the actual tokens
    });
  } catch (error) {
    console.error('❌ Error in debug endpoint:', error);
    return NextResponse.json({
      error: 'Failed to get token information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
