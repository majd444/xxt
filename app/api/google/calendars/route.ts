import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(_req: NextRequest) {
  try {
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('google_calendar_token');
    
    if (!tokenCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated with Google Calendar' }, { status: 401 });
    }
    
    const tokenData = JSON.parse(tokenCookie.value);
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Fetch calendar list directly from Google API
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch calendars from Google' }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Extract relevant data
    const calendars = data.items?.map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description,
      primary: calendar.primary,
      backgroundColor: calendar.backgroundColor
    })) || [];
    
    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}
