/**
 * Calendar Processor
 * AI-driven orchestration for calendar operations using Google Calendar
 */

import { BaseProcessor } from './base.processor';
import type { GoogleProvider } from '../providers/core/google.provider';
import type { IAIProvider } from '../types';
import type { BookingResult, FindAndBookParams } from '../types/processors';
import { logger } from '../utils/logger';

/**
 * CalendarProcessor
 * Uses AI to orchestrate calendar operations (availability, booking)
 */
export class CalendarProcessor extends BaseProcessor {
  readonly name = 'calendar';
  readonly type = 'calendar' as const;

  private calendar: any = null;
  private auth: any = null;

  constructor(
    aiProvider: IAIProvider,
    private googleProvider: GoogleProvider
  ) {
    super(aiProvider);
  }

  /**
   * Initialize Google Calendar client using the provider
   */
  private async ensureCalendarClient(): Promise<any> {
    if (!this.calendar) {
      const google = this.googleProvider.getApi();
      const config = this.googleProvider.getConfig();

      // Set up auth using provider's config
      this.auth = new google.auth.GoogleAuth({
        credentials: config.credentials,
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      });

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      this.logger.info('[CalendarProcessor] Google Calendar client created');
    }
    return this.calendar;
  }

  /**
   * Find and book available slot using AI guidance
   */
  async findAndBook(params: FindAndBookParams): Promise<BookingResult> {
    this.logger.info('[CalendarProcessor] Finding slot', { 
      duration: params.duration,
      preferredDates: params.preferredDates.length 
    });

    try {
      const calendar = await this.ensureCalendarClient();

      // 1. Get free/busy information
      const busySlots = await this.getFreeBusy(
        params.calendarId,
        params.preferredDates[0],
        new Date(params.preferredDates[params.preferredDates.length - 1].getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      // 2. Ask AI to pick the best slot based on preferences
      const slotGuidance = await this.consultAI({
        context: `Find best ${params.duration}min slot.
User preferences: ${params.userPreferences || 'any time'}
Busy periods: ${JSON.stringify(busySlots)}
Available dates: ${params.preferredDates.map(d => d.toISOString()).join(', ')}
Suggest a specific date and time in ISO format.`,
        options: ['suggest_slot', 'request_more_info', 'no_availability']
      });

      // 3. Parse AI's slot suggestion
      const suggestedSlot = this.parseSlotFromAI(slotGuidance.content, params.duration);

      if (!suggestedSlot) {
        return {
          success: false,
          error: 'No suitable slot found',
          suggestion: slotGuidance.content
        };
      }

      // 4. Verify slot is available
      const isAvailable = this.verifySlotAvailability(
        suggestedSlot.start,
        suggestedSlot.end,
        busySlots
      );

      if (!isAvailable) {
        this.logger.warn('[CalendarProcessor] Suggested slot not available');
        
        // Ask AI for alternative
        const alternative = await this.consultAI({
          context: `Suggested slot ${suggestedSlot.start.toISOString()} is not available. Find alternative.`,
          options: ['suggest_alternative', 'no_availability'],
          history: [slotGuidance.content]
        });

        return { 
          success: false, 
          error: 'Slot not available', 
          suggestion: alternative.content 
        };
      }

      // 5. Book the slot
      const eventId = await this.createEvent(calendar, {
        calendarId: params.calendarId,
        summary: 'Meeting',
        start: suggestedSlot.start,
        end: suggestedSlot.end,
        attendees: params.attendees
      });

      this.logger.info('[CalendarProcessor] Slot booked', { eventId });

      return {
        success: true,
        eventId,
        slot: suggestedSlot,
        message: `Booked ${params.duration}min meeting at ${suggestedSlot.start.toISOString()}`
      };
    } catch (error) {
      this.logger.error('[CalendarProcessor] Booking failed:', error instanceof Error ? error : new Error(String(error)));

      // Ask AI how to handle booking error
      const errorGuidance = await this.consultAI({
        context: `Booking failed: ${error instanceof Error ? error.message : String(error)}. What should I do?`,
        options: ['retry_different_slot', 'inform_user', 'escalate']
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: errorGuidance.content
      };
    }
  }

  /**
   * Get free/busy information from Google Calendar
   */
  private async getFreeBusy(
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<Array<{ start: Date; end: Date }>> {
    const calendar = await this.ensureCalendarClient();

    this.logger.info('[CalendarProcessor] Querying free/busy', {
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString()
    });

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone: 'UTC',
          items: [{ id: calendarId }]
        }
      });

      const busySlots = response.data.calendars?.[calendarId]?.busy || [];
      const result = busySlots.map((slot: any) => ({
        start: new Date(slot.start),
        end: new Date(slot.end)
      }));

      this.logger.info('[CalendarProcessor] Found busy slots', { count: result.length });
      return result;
    } catch (error) {
      this.logger.error('[CalendarProcessor] Free/busy query failed:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create event in Google Calendar
   */
  private async createEvent(
    calendar: any,
    params: {
      calendarId: string;
      summary: string;
      start: Date;
      end: Date;
      attendees?: string[];
    }
  ): Promise<string> {
    this.logger.info('[CalendarProcessor] Creating event', {
      calendarId: params.calendarId,
      summary: params.summary,
      start: params.start.toISOString()
    });

    try {
      const response = await calendar.events.insert({
        calendarId: params.calendarId,
        requestBody: {
          summary: params.summary,
          start: {
            dateTime: params.start.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: params.end.toISOString(),
            timeZone: 'UTC'
          },
          attendees: params.attendees?.map(email => ({ email }))
        }
      });

      const eventId = response.data.id!;
      this.logger.info('[CalendarProcessor] Event created', { eventId });
      return eventId;
    } catch (error) {
      this.logger.error('[CalendarProcessor] Failed to create event:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Parse AI's response to extract a time slot
   */
  private parseSlotFromAI(aiResponse: string, durationMinutes: number): { start: Date; end: Date } | null {
    // Try to extract ISO date from AI response
    const isoMatch = aiResponse.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      const start = new Date(isoMatch[1]);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      return { start, end };
    }

    // Try to extract date and time separately
    const dateMatch = aiResponse.match(/(\d{4}-\d{2}-\d{2})/);
    const timeMatch = aiResponse.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    
    if (dateMatch && timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const meridiem = timeMatch[3];

      if (meridiem && meridiem.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (meridiem && meridiem.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }

      const start = new Date(`${dateMatch[1]}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00Z`);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      return { start, end };
    }

    this.logger.warn('[CalendarProcessor] Could not parse slot from AI response', { response: aiResponse });
    return null;
  }

  /**
   * Verify slot is available (no conflicts with busy slots)
   */
  private verifySlotAvailability(
    start: Date,
    end: Date,
    busySlots: Array<{ start: Date; end: Date }>
  ): boolean {
    return !busySlots.some(busy =>
      (start >= busy.start && start < busy.end) ||
      (end > busy.start && end <= busy.end) ||
      (start <= busy.start && end >= busy.end)
    );
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI calendar assistant. Help find the best meeting slot.
Consider user preferences, time zones, and availability.
Available actions: ${options.join(', ')}
Always respond with a specific date/time in ISO format (YYYY-MM-DDTHH:MM:SS) when suggesting slots.`;
  }
}

