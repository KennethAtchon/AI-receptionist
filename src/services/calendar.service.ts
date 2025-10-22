/**
 * Calendar Service
 * High-level calendar operations using CalendarProcessor
 */

import type { CalendarProcessor } from '../processors/calendar.processor';
import { logger } from '../utils/logger';

export interface AvailabilityRule {
  timeZone: string;
  workingHours: Array<{ day: number; start: string; end: string }>;
  slotDurationMinutes: number;
  minLeadMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  allowOverlapping?: boolean;
}

export interface BookingRequest {
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees?: Array<{ email: string; optional?: boolean }>;
  metadata?: Record<string, unknown>;
}

/**
 * CalendarService
 * Delegates to CalendarProcessor for AI-driven calendar operations
 */
export class CalendarService {
  constructor(private readonly calendarProcessor: CalendarProcessor) {}

  /**
   * Find available slots using AI-driven processor
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

    logger.info('[CalendarService] Finding available slots', {
      duration: params.duration,
      dateCount: params.preferredDates.length
    });

    // Delegate to processor
    const result = await this.calendarProcessor.findAndBook({
      ...params,
      attendees: [] // No booking yet, just finding slots
    });

    // Extract slots from result
    if (result.success && result.slot) {
      return [result.slot.start];
    }

    logger.warn('[CalendarService] No slots found', { error: result.error });
    return [];
  }

  /**
   * Book appointment using AI-driven processor
   */
  async bookAppointment(params: {
    calendarId: string;
    title: string;
    start: Date;
    end: Date;
    attendees?: string[];
    description?: string;
  }): Promise<{ id: string }> {
    // Validate params
    if (params.start >= params.end) {
      throw new Error('Start time must be before end time');
    }

    logger.info('[CalendarService] Booking appointment', {
      title: params.title,
      start: params.start.toISOString()
    });

    // Calculate duration
    const duration = (params.end.getTime() - params.start.getTime()) / (60 * 1000);

    // Delegate to processor
    const result = await this.calendarProcessor.findAndBook({
      calendarId: params.calendarId,
      preferredDates: [params.start],
      duration,
      attendees: params.attendees
    });

    if (!result.success) {
      throw new Error(result.error || 'Booking failed');
    }

    logger.info('[CalendarService] Appointment booked', { eventId: result.eventId });

    return { id: result.eventId! };
  }

  /**
   * Find next available slot
   */
  async findNextAvailable(params: {
    calendarId: string;
    after: Date;
    duration: number;
    userPreferences?: string;
  }): Promise<Date | null> {
    logger.info('[CalendarService] Finding next available slot');

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
