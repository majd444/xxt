import { NextRequest, NextResponse } from 'next/server';
import calendarService from '../../../lib/services/calendar';

/**
 * Create a calendar event
 * 
 * POST /api/calendar/event
 * Body: { userId: number, provider: 'google' | 'microsoft', eventDetails: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, provider = 'google', eventDetails } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!eventDetails) {
      return NextResponse.json({ error: 'Event details are required' }, { status: 400 });
    }
    
    if (!eventDetails.summary) {
      return NextResponse.json({ error: 'Event summary/title is required' }, { status: 400 });
    }
    
    if (!eventDetails.start || !eventDetails.end) {
      return NextResponse.json({ error: 'Event start and end times are required' }, { status: 400 });
    }
    
    // Create calendar event based on provider
    let result;
    if (provider === 'google') {
      result = await calendarService.createGoogleEvent(userId, eventDetails);
    } else if (provider === 'microsoft') {
      result = await calendarService.createMicrosoftEvent(userId, eventDetails);
    } else {
      return NextResponse.json({ error: 'Invalid provider. Must be "google" or "microsoft"' }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      event: result
    });
  } catch (error: unknown) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}

/**
 * Get user calendar events
 * 
 * GET /api/calendar/events?userId={id}&provider={provider}&timeMin={timeMin}&timeMax={timeMax}&maxResults={maxResults}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const provider = (searchParams.get('provider') || 'google') as 'google' | 'microsoft';
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get calendar events
    const events = await calendarService.getEvents(
      parseInt(userId),
      provider,
      timeMin,
      timeMax,
      maxResults
    );
    
    return NextResponse.json({
      success: true,
      events
    });
  } catch (error: unknown) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
