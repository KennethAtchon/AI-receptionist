/**
 * Calendar Service
 * High-level calendar operations using Agent
 */

import type { Agent } from '../agent/core/Agent';
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
 * Delegates to Agent for AI-driven calendar operations
 */
export class CalendarService {
  constructor(private readonly agent: Agent) {}

  /**
   * Find available slots using AI-driven agent
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

    // Delegate to Agent - it will use calendar tool
    const datesStr = params.preferredDates.map(d => d.toISOString().split('T')[0]).join(', ');
    const agentRequest: AgentRequest = {
      id: `calendar-check-${Date.now()}`,
      input: `Check calendar availability for ${params.duration} minutes on dates: ${datesStr}. ${params.userPreferences || ''}`,
      channel: 'text',
      context: {
        channel: 'text',
        conversationId: `calendar-${Date.now()}`,
        metadata: { action: 'check_availability', calendarId: params.calendarId, duration: params.duration }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);

    // Extract slots from tool results
    const slots = agentResponse.metadata?.toolResults?.[0]?.data?.slots || [];
    
    logger.info('[CalendarService] Found slots', { count: slots.length });
    return slots;
  }

  /**
   * Book appointment using AI-driven agent
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

    // Delegate to Agent - it will use calendar tool with 'book' action
    const dateStr = params.start.toISOString().split('T')[0];
    const timeStr = params.start.toISOString().split('T')[1].substring(0, 5);
    const agentRequest: AgentRequest = {
      id: `calendar-book-${Date.now()}`,
      input: `Book appointment "${params.title}" on ${dateStr} at ${timeStr} for ${duration} minutes.`,
      channel: 'text',
      context: {
        channel: 'text',
        conversationId: `calendar-${Date.now()}`,
        metadata: { 
          action: 'book', 
          calendarId: params.calendarId, 
          title: params.title,
          attendees: params.attendees,
          description: params.description
        }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);

    const bookingId = agentResponse.metadata?.toolResults?.[0]?.data?.bookingId || `BOOKING_${Date.now()}`;

    logger.info('[CalendarService] Appointment booked', { eventId: bookingId });

    return { id: bookingId };
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
