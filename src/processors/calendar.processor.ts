/**
 * Calendar Processor
 * Thin administrative wrapper for calendar operations.
 * No AI consultation - just provider operations for services.
 */

import type { GoogleProvider } from '../providers/api/google.provider';
import { logger } from '../utils/logger';

export interface FindAndBookParams {
  calendarId: string;
  preferredDates: Date[];
  duration: number;
  attendees?: string[];
  userPreferences?: string;
}

export interface BookingResult {
  success: boolean;
  eventId?: string;
  slot?: { start: Date; end: Date };
  error?: string;
  suggestion?: string;
}

/**
 * CalendarProcessor
 * Administrative helper for calendar operations via Google Calendar
 */
export class CalendarProcessor {
  readonly name = 'calendar';
  readonly type = 'calendar' as const;

  private calendar: any = null;

  constructor(private googleProvider: GoogleProvider) {}

  /**
   * Initialize Google Calendar client using the provider
   */
  private async ensureCalendarClient(): Promise<any> {
    if (!this.calendar) {
      // TODO: Implement Google Calendar client creation
      // this.calendar = await this.googleProvider.createClient();
      logger.info('[CalendarProcessor] Google Calendar client would be created');
    }
    return this.calendar;
  }

  /**
   * Get free/busy information (administrative operation)
   */
  async getFreeBusy(calendarId: string, start: Date, end: Date): Promise<Array<{ start: Date; end: Date }>> {
    logger.info('[CalendarProcessor] Getting free/busy', { calendarId, start, end });

    const calendar = await this.ensureCalendarClient();

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: calendarId }]
        }
      });

      const busyTimes = response.data.calendars[calendarId]?.busy || [];
      const busySlots = busyTimes.map((slot: any) => ({
        start: new Date(slot.start),
        end: new Date(slot.end)
      }));

      logger.info('[CalendarProcessor] Free/busy retrieved', { busyCount: busySlots.length });
      return busySlots;
    } catch (error) {
      logger.error('[CalendarProcessor] Failed to get free/busy:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Create calendar event (administrative operation)
   */
  async createEvent(params: {
    calendarId: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    attendees?: string[];
  }): Promise<BookingResult> {
    logger.info('[CalendarProcessor] Creating event', { 
      calendarId: params.calendarId, 
      title: params.title,
      start: params.start 
    });

    const calendar = await this.ensureCalendarClient();

    try {
      const event = {
        summary: params.title,
        description: params.description || '',
        start: {
          dateTime: params.start.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: params.end.toISOString(),
          timeZone: 'UTC'
        },
        attendees: params.attendees?.map(email => ({ email })) || []
      };

      const response = await calendar.events.insert({
        calendarId: params.calendarId,
        requestBody: event
      });

      logger.info('[CalendarProcessor] Event created', { eventId: response.data.id });
      
      return {
        success: true,
        eventId: response.data.id
      };
    } catch (error) {
      logger.error('[CalendarProcessor] Failed to create event:', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete calendar event (administrative operation)
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<BookingResult> {
    logger.info('[CalendarProcessor] Deleting event', { calendarId, eventId });

    const calendar = await this.ensureCalendarClient();

    try {
      await calendar.events.delete({
        calendarId,
        eventId
      });

      logger.info('[CalendarProcessor] Event deleted', { eventId });
      
      return {
        success: true
      };
    } catch (error) {
      logger.error('[CalendarProcessor] Failed to delete event:', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List events in date range (administrative operation)
   */
  async listEvents(calendarId: string, start: Date, end: Date): Promise<Array<{ id: string; title: string; start: Date; end: Date }>> {
    logger.info('[CalendarProcessor] Listing events', { calendarId, start, end });

    const calendar = await this.ensureCalendarClient();

    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = (response.data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled',
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date)
      }));

      logger.info('[CalendarProcessor] Events listed', { count: events.length });
      return events;
    } catch (error) {
      logger.error('[CalendarProcessor] Failed to list events:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Find available slots using business logic algorithm
   * Moved from CalendarService to preserve functionality
   */
  async findAvailableSlots(params: {
    calendarId: string;
    preferredDates: Date[];
    duration: number;
    userPreferences?: string;
  }): Promise<Date[]> {
    // Validate params
    if (params.duration < 15 || params.duration > 480) {
      throw new Error('Duration must be between 15 and 480 minutes');
    }

    if (params.preferredDates.length === 0) {
      throw new Error('At least one preferred date is required');
    }

    logger.info('[CalendarProcessor] Finding available slots', {
      duration: params.duration,
      dateCount: params.preferredDates.length
    });

    // Use processor for administrative free/busy query
    const startDate = params.preferredDates[0];
    const endDate = new Date(params.preferredDates[params.preferredDates.length - 1]);
    endDate.setDate(endDate.getDate() + 1); // Add one day to include the last date

    const busySlots = await this.getFreeBusy(
      params.calendarId,
      startDate,
      endDate
    );

    // Simple algorithm to find available slots
    const availableSlots: Date[] = [];
    for (const date of params.preferredDates) {
      // Check each hour from 9 AM to 5 PM
      for (let hour = 9; hour <= 17; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + params.duration);

        // Check if this slot conflicts with busy times
        const hasConflict = busySlots.some(busy => 
          (slotStart < busy.end && slotEnd > busy.start)
        );

        if (!hasConflict) {
          availableSlots.push(slotStart);
        }
      }
    }
    
    logger.info('[CalendarProcessor] Found slots', { count: availableSlots.length });
    return availableSlots;
  }

  /**
   * Find next available slot
   * Moved from CalendarService to preserve functionality
   */
  async findNextAvailable(params: {
    calendarId: string;
    after: Date;
    duration: number;
    userPreferences?: string;
  }): Promise<Date | null> {
    logger.info('[CalendarProcessor] Finding next available slot');

    // Generate date range (next 7 days)
    const preferredDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(params.after);
      date.setDate(date.getDate() + i);
      preferredDates.push(date);
    }

    const slots = await this.findAvailableSlots({
      calendarId: params.calendarId,
      preferredDates,
      duration: params.duration,
      userPreferences: params.userPreferences
    });

    return slots.length > 0 ? slots[0] : null;
  }
}