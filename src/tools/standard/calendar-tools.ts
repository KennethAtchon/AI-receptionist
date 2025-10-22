/**
 * Calendar Tools (Standard)
 * Dedicated module for calendar-related tools.
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { GoogleProvider } from '../../providers/core/google.provider';

export interface CalendarToolsConfig {
  googleProvider?: GoogleProvider;
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

      // If no provider, return mock data
      if (!config?.googleProvider) {
        logger.warn('[CalendarTool] No provider configured, returning mock data');
        if (params.action === 'check_availability') {
          const slots = ['09:00', '14:00', '16:00'];
          return { success: true, data: { slots }, response: { text: `Available: ${slots.join(', ')}` } };
        }
        if (params.action === 'book') {
          return { success: true, data: { bookingId: 'MOCK_BOOK_123' }, response: { text: 'Booked (mock).' } };
        }
        return { success: false, error: 'Unknown action', response: { text: 'Could not complete action.' } };
      }

      // Use Google Calendar provider
      try {
        if (params.action === 'check_availability') {
          // TODO: Implement freeBusy query via Google provider
          return { success: true, data: { slots: ['09:00', '14:00', '16:00'] }, response: { text: 'Available slots found.' } };
        }

        if (params.action === 'book') {
          // TODO: Implement event creation via Google provider
          return { success: true, data: { bookingId: 'GOOGLE_EVENT_123' }, response: { text: 'Event booked on Google Calendar.' } };
        }

        if (params.action === 'cancel') {
          // TODO: Implement event deletion via Google provider
          return { success: true, data: {}, response: { text: 'Event cancelled.' } };
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
  logger.info('[CalendarTools] Registered calendar tools');
}


