/**
 * Calendar Processor
 * Thin administrative wrapper for calendar operations.
 * No AI consultation - just provider operations for services.
 */

import type { GoogleProvider } from '../providers/core/google.provider';
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
}