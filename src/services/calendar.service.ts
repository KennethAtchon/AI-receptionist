/**
 * Calendar Service
 * High-level calendar operations using Agent + Processor
 */

import type { Agent } from '../agent/core/Agent';
import type { CalendarProcessor } from '../processors/calendar.processor';
import type { AgentRequest } from '../types';
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
 * Uses Agent for AI decisions, Processor for admin operations
 */
export class CalendarService {
  constructor(
    private readonly agent: Agent,
    private readonly calendarProcessor: CalendarProcessor
  ) {}

  /**
   * Find available slots using processor
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

    // Use processor for administrative free/busy query
    const startDate = params.preferredDates[0];
    const endDate = new Date(params.preferredDates[params.preferredDates.length - 1]);
    endDate.setDate(endDate.getDate() + 1); // Add one day to include the last date

    const busySlots = await this.calendarProcessor.getFreeBusy(
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
    
    logger.info('[CalendarService] Found slots', { count: availableSlots.length });
    return availableSlots;
  }

  /**
   * Book appointment using processor
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

    // Use processor for administrative event creation
    const result = await this.calendarProcessor.createEvent({
      calendarId: params.calendarId,
      title: params.title,
      start: params.start,
      end: params.end,
      description: params.description,
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
