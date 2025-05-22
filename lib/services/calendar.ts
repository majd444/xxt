import axios from 'axios';
import { query } from '../db';

interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

/**
 * Create a calendar event using Google Calendar API
 * @param userId User ID in the database
 * @param eventDetails Calendar event details
 */
export async function createGoogleEvent(userId: number, eventDetails: CalendarEvent) {
  try {
    // Get user's access token from the database
    const userResult = await query(
      'SELECT access_token, token_expires_at FROM users WHERE id = $1 AND provider = $2',
      [userId, 'google']
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found or not authenticated with Google');
    }
    
    const user = userResult.rows[0];
    
    // Check if token is expired
    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      throw new Error('Google access token has expired. Please re-authenticate.');
    }
    
    // Format event data for Google Calendar API
    const eventData = {
      summary: eventDetails.summary,
      location: eventDetails.location,
      description: eventDetails.description,
      start: eventDetails.start,
      end: eventDetails.end,
      attendees: eventDetails.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name,
      })),
      reminders: eventDetails.reminders || {
        useDefault: true,
      },
    };
    
    // Create event using Google Calendar API
    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      eventData,
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Log event creation in database
    await query(
      `INSERT INTO calendar_logs (user_id, event_title, event_time, event_id, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, eventDetails.summary, eventDetails.start.dateTime, response.data.id]
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

/**
 * Create a calendar event using Microsoft Outlook Calendar API
 * @param userId User ID in the database
 * @param eventDetails Calendar event details
 */
export async function createMicrosoftEvent(userId: number, eventDetails: CalendarEvent) {
  try {
    // Get user's access token from the database
    const userResult = await query(
      'SELECT access_token, token_expires_at FROM users WHERE id = $1 AND provider = $2',
      [userId, 'microsoft']
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found or not authenticated with Microsoft');
    }
    
    const user = userResult.rows[0];
    
    // Check if token is expired
    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      throw new Error('Microsoft access token has expired. Please re-authenticate.');
    }
    
    // Format event data for Microsoft Graph API
    const eventData = {
      subject: eventDetails.summary,
      location: {
        displayName: eventDetails.location,
      },
      body: {
        contentType: 'text',
        content: eventDetails.description,
      },
      start: {
        dateTime: new Date(eventDetails.start.dateTime).toISOString(),
        timeZone: eventDetails.start.timeZone || 'UTC',
      },
      end: {
        dateTime: new Date(eventDetails.end.dateTime).toISOString(),
        timeZone: eventDetails.end.timeZone || 'UTC',
      },
      attendees: eventDetails.attendees?.map(attendee => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: 'required',
      })),
      isReminderOn: true,
    };
    
    // Create event using Microsoft Graph API
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/events',
      eventData,
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Log event creation in database
    await query(
      `INSERT INTO calendar_logs (user_id, event_title, event_time, event_id, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, eventDetails.summary, eventDetails.start.dateTime, response.data.id]
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating Microsoft Calendar event:', error);
    throw error;
  }
}

/**
 * Get calendar events for a specific user
 * @param userId User ID in the database
 * @param provider Authentication provider ('google' or 'microsoft')
 * @param timeMin Start time for events (defaults to now)
 * @param timeMax End time for events (defaults to 7 days from now)
 * @param maxResults Maximum number of events to return
 */
export async function getEvents(
  userId: number,
  provider: 'google' | 'microsoft',
  timeMin = new Date().toISOString(),
  timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  maxResults = 10
) {
  try {
    // Get user's access token from the database
    const userResult = await query(
      'SELECT access_token, token_expires_at FROM users WHERE id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error(`User not found or not authenticated with ${provider}`);
    }
    
    const user = userResult.rows[0];
    
    // Check if token is expired
    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      throw new Error(`${provider} access token has expired. Please re-authenticate.`);
    }
    
    let events;
    
    if (provider === 'google') {
      // Get events from Google Calendar API
      const response = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        },
        params: {
          timeMin,
          timeMax,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        },
      });
      
      events = response.data.items;
    } else {
      // Get events from Microsoft Graph API
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/calendarView', {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        },
        params: {
          startDateTime: timeMin,
          endDateTime: timeMax,
          $top: maxResults,
          $orderby: 'start/dateTime',
        },
      });
      
      events = response.data.value;
    }
    
    return events;
  } catch (error) {
    console.error(`Error fetching calendar events from ${provider}:`, error);
    throw error;
  }
}

export default {
  createGoogleEvent,
  createMicrosoftEvent,
  getEvents,
};
