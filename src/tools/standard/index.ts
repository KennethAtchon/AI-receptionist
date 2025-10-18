/**
 * Standard Tool Library
 * Setup standard tools (calendar, booking, CRM)
 */

import { ToolRegistry } from '../registry';
import { ToolBuilder } from '../builder';
import { ToolConfig, ProviderConfig } from '../../types';

/**
 * Setup standard tools based on configuration
 */
export async function setupStandardTools(
  registry: ToolRegistry,
  toolConfig: ToolConfig,
  providerConfig: ProviderConfig
): Promise<void> {
  const defaults = toolConfig.defaults || [];

  for (const toolName of defaults) {
    switch (toolName) {
      case 'calendar':
        if (toolConfig.calendar || providerConfig.calendar?.google) {
          const calendarTool = createCalendarTool(toolConfig.calendar, providerConfig);
          registry.register(calendarTool);
        } else {
          console.warn('[StandardTools] Calendar tool requested but no calendar provider configured');
        }
        break;

      case 'booking':
        if (toolConfig.booking) {
          const bookingTool = createBookingTool(toolConfig.booking);
          registry.register(bookingTool);
        } else {
          console.warn('[StandardTools] Booking tool requested but no booking config provided');
        }
        break;

      case 'crm':
        if (toolConfig.crm) {
          const crmTool = createCRMTool(toolConfig.crm);
          registry.register(crmTool);
        } else {
          console.warn('[StandardTools] CRM tool requested but no CRM config provided');
        }
        break;

      default:
        console.warn(`[StandardTools] Unknown standard tool: ${toolName}`);
    }
  }
}

/**
 * Create calendar tool
 */
function createCalendarTool(calendarConfig: any, providerConfig: ProviderConfig) {
  return new ToolBuilder()
    .withName('check_calendar')
    .withDescription('Check calendar availability and book appointments')
    .withParameters({
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['check_availability', 'book', 'cancel'],
          description: 'The action to perform'
        },
        date: {
          type: 'string',
          format: 'date',
          description: 'Date for the appointment (YYYY-MM-DD)'
        },
        time: {
          type: 'string',
          format: 'time',
          description: 'Time for the appointment (HH:MM)'
        },
        duration: {
          type: 'number',
          description: 'Duration in minutes',
          default: 60
        },
        title: {
          type: 'string',
          description: 'Appointment title'
        }
      },
      required: ['action', 'date']
    })
    .onCall(async (params, ctx) => {
      // Voice call: Conversational response
      console.log(`[CalendarTool] Call: ${params.action} for ${params.date}`);

      // TODO: Actual calendar API integration
      const availableSlots = ['9:00 AM', '2:00 PM', '4:00 PM'];

      if (params.action === 'check_availability') {
        return {
          success: true,
          data: { slots: availableSlots },
          response: {
            speak: `I have availability on ${params.date} at ${availableSlots.join(', ')}. Which time works best for you?`
          }
        };
      }

      if (params.action === 'book') {
        return {
          success: true,
          data: { bookingId: 'BOOK_123' },
          response: {
            speak: `Perfect! I've booked your appointment for ${params.date} at ${params.time}. You'll receive a confirmation shortly.`
          }
        };
      }

      return {
        success: false,
        error: 'Unknown action',
        response: { speak: 'Sorry, I could not complete that action.' }
      };
    })
    .onSMS(async (params, ctx) => {
      // SMS: Brief, structured response
      console.log(`[CalendarTool] SMS: ${params.action} for ${params.date}`);

      const availableSlots = ['9:00 AM', '2:00 PM', '4:00 PM'];

      if (params.action === 'check_availability') {
        return {
          success: true,
          data: { slots: availableSlots },
          response: {
            message: `Available times for ${params.date}:\n1. 9:00 AM\n2. 2:00 PM\n3. 4:00 PM\n\nReply with a number to book.`
          }
        };
      }

      if (params.action === 'book') {
        return {
          success: true,
          data: { bookingId: 'BOOK_123' },
          response: {
            message: `✓ Booked!\n${params.date} at ${params.time}\nConfirmation: BOOK_123`
          }
        };
      }

      return {
        success: false,
        error: 'Unknown action',
        response: { message: 'Error: Could not complete action.' }
      };
    })
    .onEmail(async (params, ctx) => {
      // Email: Formal with calendar invite
      console.log(`[CalendarTool] Email: ${params.action} for ${params.date}`);

      const availableSlots = ['9:00 AM', '2:00 PM', '4:00 PM'];

      if (params.action === 'check_availability') {
        return {
          success: true,
          data: { slots: availableSlots },
          response: {
            html: `
              <h3>Available Appointment Times</h3>
              <p>We have the following times available on ${params.date}:</p>
              <ul>
                <li>9:00 AM</li>
                <li>2:00 PM</li>
                <li>4:00 PM</li>
              </ul>
              <p>Please reply with your preferred time.</p>
            `,
            text: `Available times for ${params.date}: 9:00 AM, 2:00 PM, 4:00 PM`
          }
        };
      }

      if (params.action === 'book') {
        return {
          success: true,
          data: { bookingId: 'BOOK_123' },
          response: {
            html: `
              <h2>Appointment Confirmed</h2>
              <p><strong>Date:</strong> ${params.date}</p>
              <p><strong>Time:</strong> ${params.time}</p>
              <p><strong>Confirmation Number:</strong> BOOK_123</p>
              <p>Please find the calendar invite attached.</p>
            `,
            text: `Appointment confirmed for ${params.date} at ${params.time}. Confirmation: BOOK_123`
          }
        };
      }

      return {
        success: false,
        error: 'Unknown action',
        response: { text: 'Error: Could not complete action.' }
      };
    })
    .default(async (params, ctx) => {
      // Fallback handler
      console.log(`[CalendarTool] Default: ${params.action} for ${params.date}`);

      return {
        success: true,
        data: {},
        response: {
          text: `Calendar action ${params.action} processed for ${params.date}`
        }
      };
    })
    .build();
}

/**
 * Create booking tool
 */
function createBookingTool(bookingConfig: any) {
  return new ToolBuilder()
    .withName('booking')
    .withDescription('Manage booking reservations')
    .withParameters({
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'cancel', 'modify'] },
        serviceType: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' }
      },
      required: ['action']
    })
    .default(async (params, ctx) => {
      console.log('[BookingTool] Processing booking action:', params.action);

      // TODO: Integrate with actual booking API
      return {
        success: true,
        data: { bookingId: 'BOOKING_123' },
        response: {
          text: `Booking ${params.action} completed successfully.`
        }
      };
    })
    .build();
}

/**
 * Create CRM tool
 */
function createCRMTool(crmConfig: any) {
  return new ToolBuilder()
    .withName('crm')
    .withDescription('Manage customer records in CRM')
    .withParameters({
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_lead', 'update_contact', 'add_note'] },
        data: { type: 'object' }
      },
      required: ['action']
    })
    .default(async (params, ctx) => {
      console.log('[CRMTool] Processing CRM action:', params.action);

      // TODO: Integrate with actual CRM API
      return {
        success: true,
        data: { recordId: 'CRM_123' },
        response: {
          text: `CRM ${params.action} completed successfully.`
        }
      };
    })
    .build();
}
