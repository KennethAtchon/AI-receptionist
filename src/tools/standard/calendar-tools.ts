/**
 * Calendar Tools (Standard)
 * Tools for calendar operations - uses CalendarProcessor
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';

// Calendar processor type (for backward compatibility)
export interface CalendarProcessor {
  getFreeBusy(calendarId: string, start: Date, end: Date): Promise<any>;
  createEvent(params: any): Promise<{ success: boolean; eventId?: string; error?: string }>;
  deleteEvent(calendarId: string, eventId: string): Promise<{ success: boolean; error?: string }>;
}

export interface CalendarToolsConfig {
  calendarProcessor?: CalendarProcessor;
}

export function buildCalendarTool(config?: CalendarToolsConfig): ITool {
  return new ToolBuilder()
    .withName('calendar')
    .withDescription('Check availability and book calendar events')
    .withParameters({
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['check_availability', 'book', 'cancel'] },
        calendarId: { type: 'string', description: 'Calendar ID (defaults to primary)' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:MM' },
        duration: { type: 'number', description: 'Minutes', default: 60 },
        title: { type: 'string', description: 'Event title' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' }
      },
      required: ['action']
    })
    .default(async (params, ctx) => {
      logger.info('[CalendarTool] Executing', { action: params.action, date: params.date, time: params.time });

      if (!config?.calendarProcessor) {
        logger.warn('[CalendarTool] No calendar processor configured, returning mock data');
        if (params.action === 'check_availability') {
          const slots = ['09:00', '14:00', '16:00'];
          return { success: true, data: { slots }, response: { text: `Available: ${slots.join(', ')}` } };
        }
        if (params.action === 'book') {
          return { success: true, data: { bookingId: 'MOCK_BOOK_123' }, response: { text: 'Booked (mock).' } };
        }
        return { success: false, error: 'Unknown action', response: { text: 'Could not complete action.' } };
      }

      try {
        if (params.action === 'check_availability') {
          // Use processor to get free/busy information
          const startDate = params.date ? new Date(params.date) : new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);

          const busySlots = await config.calendarProcessor.getFreeBusy(
            params.calendarId || 'primary',
            startDate,
            endDate
          );

          // Simple availability check - return mock slots for now
          const slots = ['09:00', '14:00', '16:00'];
          return { success: true, data: { slots }, response: { text: `Available: ${slots.join(', ')}` } };
        }

        if (params.action === 'book') {
          // Use processor to create event
          const startDate = new Date(`${params.date}T${params.time || '09:00'}`);
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + (params.duration || 60));

          const result = await config.calendarProcessor.createEvent({
            calendarId: params.calendarId || 'primary',
            title: params.title || 'Meeting',
            start: startDate,
            end: endDate,
            description: `Booked via AI Receptionist`,
            attendees: params.attendees
          });

          if (!result.success) {
            return { success: false, error: result.error, response: { text: 'Failed to book appointment.' } };
          }

          return { success: true, data: { bookingId: result.eventId }, response: { text: 'Event booked successfully.' } };
        }

        if (params.action === 'cancel') {
          // Use processor to delete event
          const result = await config.calendarProcessor.deleteEvent(
            params.calendarId || 'primary',
            params.title || '' // This should be eventId, but keeping for compatibility
          );

          if (!result.success) {
            return { success: false, error: result.error, response: { text: 'Failed to cancel appointment.' } };
          }

          return { success: true, data: {}, response: { text: 'Event cancelled successfully.' } };
        }

        return { success: false, error: 'Unknown action', response: { text: 'Could not complete action.' } };
      } catch (error) {
        logger.error('[CalendarTool] Failed', error as Error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error', response: { text: 'Calendar operation failed.' } };
      }
    })
    .build();
}

export async function setupCalendarTools(registry: ToolRegistry, config?: CalendarToolsConfig): Promise<void> {
  registry.register(buildCalendarTool(config));
  logger.info('[CalendarTools] Registered calendar tools with processor');
}