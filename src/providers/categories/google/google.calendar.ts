/**
 * Google Calendar Helper Functions
 * Contains all calendar-specific logic and operations
 */

import { logger } from '../../../utils/logger';

// Types
export interface CreateCalendarMeeting {
  host: string;
  mainGuest: string;
  thirdPartyGuests: string[];
  startingTime: string;
  endingTime: string;
  summary?: string;
  description?: string;
}

export interface UpdateCalendarMeeting {
  meetingId: string;
  host: string;
  mainGuest: string;
  thirdPartyGuests: string[];
  startingTime: string;
  endingTime: string;
  summary?: string;
  description?: string;
}

export interface DeleteCalendarMeeting {
  meetingId: string;
}

export interface CalendarResult {
  success: boolean;
  error?: string;
  data?: Record<string, any>;
  response: Record<string, string>;
}

export interface EventObject {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    organizer?: boolean;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
  };
  [key: string]: any;
}

/**
 * Check availability for a list of email addresses in a time range
 * Uses Google Calendar Freebusy API to check if attendees are available
 */
export async function checkAvailability(
  calendarClient: any,
  emails: string[],
  startTime: string,
  endTime: string
): Promise<{ available: boolean; conflicts: Array<{ email: string; busy: boolean }> }> {
  try {
    // Parse dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format. Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)');
    }

    // Query freebusy for all attendees
    const freebusyResponse = await calendarClient.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: emails.map(email => ({ id: email }))
      }
    });

    const conflicts: Array<{ email: string; busy: boolean }> = [];
    let allAvailable = true;

    // Check each calendar for conflicts
    if (freebusyResponse.data.calendars) {
      for (const [email, calendarData] of Object.entries(freebusyResponse.data.calendars)) {
        const calendarInfo = calendarData as { busy?: Array<{ start?: string; end?: string }> };
        const busy = calendarInfo.busy && calendarInfo.busy.length > 0;
        if (busy) {
          allAvailable = false;
          conflicts.push({ email, busy: true });
        } else {
          conflicts.push({ email, busy: false });
        }
      }
    }

    logger.info('[GoogleCalendar] Availability check completed', {
      allAvailable,
      conflictCount: conflicts.filter(c => c.busy).length,
      totalAttendees: emails.length
    });

    return {
      available: allAvailable,
      conflicts
    };
  } catch (error: any) {
    logger.error('[GoogleCalendar] Failed to check availability:', error);
    // If availability check fails, assume available
    return {
      available: true,
      conflicts: []
    };
  }
}

/**
 * Parse calendar meeting parameters into Google Calendar event object
 */
export function parseGoogleCalendarEvent(
  params: CreateCalendarMeeting | UpdateCalendarMeeting | DeleteCalendarMeeting
): EventObject {
  if ('meetingId' in params && !('host' in params)) {
    // This is a DeleteCalendarMeeting - just return the ID
    return {
      id: params.meetingId
    };
  }

  const { host, mainGuest, thirdPartyGuests, startingTime, endingTime, summary, description } = params as CreateCalendarMeeting | UpdateCalendarMeeting;

  // Build attendees list
  const attendees = [
    { email: host, organizer: true, responseStatus: 'accepted' },
    { email: mainGuest, responseStatus: 'needsAction' },
    ...(thirdPartyGuests || []).map(email => ({
      email,
      responseStatus: 'needsAction' as const
    }))
  ];

  // Parse dates - support ISO 8601 format
  const startDate = new Date(startingTime);
  const endDate = new Date(endingTime);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)');
  }

  const event: EventObject = {
    summary: summary || `Meeting with ${mainGuest}`,
    description: description || `Calendar meeting organized by ${host}`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'UTC'
    },
    attendees: attendees,
    organizer: {
      email: host
    }
  };

  // If it's an update, include the meeting ID
  if ('meetingId' in params) {
    event.id = params.meetingId;
  }

  return event;
}

/**
 * Create a Google Calendar event
 */
export async function createCalendarEvent(
  calendarClient: any,
  calendarId: string,
  eventObject: EventObject
): Promise<CalendarResult> {
  try {
    // Use 'none' instead of 'all' to avoid Domain-Wide Delegation requirement
    // Service accounts cannot send invitations without Domain-Wide Delegation
    // The event will still be created with attendees, but invitations won't be sent automatically
    const response = await calendarClient.events.insert({
      calendarId: calendarId,
      requestBody: eventObject,
      sendUpdates: 'none' // Don't send invitations (avoids Domain-Wide Delegation requirement)
    });

    logger.info('[GoogleCalendar] Calendar event created successfully', {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink
    });

    return {
      success: true,
      data: {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        iCalUID: response.data.iCalUID,
        start: response.data.start,
        end: response.data.end
      },
      response: {
        text: `Calendar meeting created successfully. Meeting ID: ${response.data.id}`,
        htmlLink: response.data.htmlLink || ''
      }
    };
  } catch (error: any) {
    logger.error('[GoogleCalendar] Failed to create calendar event:', error);
    return {
      success: false,
      error: error?.message || 'Failed to create calendar meeting',
      response: {
        text: `Failed to create calendar meeting: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Update a Google Calendar event
 */
export async function updateCalendarEvent(
  calendarClient: any,
  calendarId: string,
  eventId: string,
  eventObject: EventObject
): Promise<CalendarResult> {
  try {
    // Use 'none' instead of 'all' to avoid Domain-Wide Delegation requirement
    // Service accounts cannot send invitations without Domain-Wide Delegation
    const response = await calendarClient.events.update({
      calendarId: calendarId,
      eventId: eventId,
      requestBody: eventObject,
      sendUpdates: 'none' // Don't send notifications (avoids Domain-Wide Delegation requirement)
    });

    logger.info('[GoogleCalendar] Calendar event updated successfully', {
      eventId: response.data.id
    });

    return {
      success: true,
      data: {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        start: response.data.start,
        end: response.data.end
      },
      response: {
        text: `Calendar meeting updated successfully. Meeting ID: ${response.data.id}`,
        htmlLink: response.data.htmlLink || ''
      }
    };
  } catch (error: any) {
    logger.error('[GoogleCalendar] Failed to update calendar event:', error);
    return {
      success: false,
      error: error?.message || 'Failed to update calendar meeting',
      response: {
        text: `Failed to update calendar meeting: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(
  calendarClient: any,
  calendarId: string,
  eventId: string
): Promise<CalendarResult> {
  try {
    // Use 'none' instead of 'all' to avoid Domain-Wide Delegation requirement
    // Service accounts cannot send invitations without Domain-Wide Delegation
    await calendarClient.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      sendUpdates: 'none' // Don't send cancellation notifications (avoids Domain-Wide Delegation requirement)
    });

    logger.info('[GoogleCalendar] Calendar event deleted successfully', { eventId });

    return {
      success: true,
      data: {
        eventId: eventId
      },
      response: {
        text: `Calendar meeting deleted successfully. Meeting ID: ${eventId}`
      }
    };
  } catch (error: any) {
    logger.error('[GoogleCalendar] Failed to delete calendar event:', error);
    
    // Handle case where event doesn't exist
    if (error?.code === 404) {
      return {
        success: false,
        error: 'Meeting not found',
        response: {
          text: `Calendar meeting not found. Meeting ID: ${eventId}`
        }
      };
    }
    
    return {
      success: false,
      error: error?.message || 'Failed to delete calendar meeting',
      response: {
        text: `Failed to delete calendar meeting: ${error?.message || 'Unknown error'}`
      }
    };
  }
}

