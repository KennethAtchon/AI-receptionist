/**
 * Test Fixtures - Tool Definitions
 */

import { ITool, ToolResult, ExecutionContext } from '../../types';

export const mockBookingTool: ITool = {
  name: 'book_appointment',
  description: 'Book an appointment for the user',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Appointment date' },
      time: { type: 'string', description: 'Appointment time' },
      service: { type: 'string', description: 'Service type' },
    },
    required: ['date', 'time', 'service'],
  },
  handlers: {
    default: async (params: any, context: ExecutionContext): Promise<ToolResult> => {
      return {
        success: true,
        data: {
          appointmentId: 'apt_123',
          date: params.date,
          time: params.time,
          service: params.service,
        },
        response: {
          text: `Appointment booked for ${params.date} at ${params.time}`,
          speak: `Great! I've booked your ${params.service} appointment for ${params.date} at ${params.time}.`,
        },
      };
    },
    onCall: async (params: any, context: ExecutionContext): Promise<ToolResult> => {
      return {
        success: true,
        data: { appointmentId: 'apt_call_123' },
        response: {
          speak: `Perfect! I've scheduled your appointment for ${params.date}.`,
        },
      };
    },
  },
};

export const mockWeatherTool: ITool = {
  name: 'get_weather',
  description: 'Get current weather information',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or zip code' },
    },
    required: ['location'],
  },
  handlers: {
    default: async (params: any): Promise<ToolResult> => {
      return {
        success: true,
        data: {
          location: params.location,
          temperature: 72,
          conditions: 'sunny',
        },
        response: {
          text: `Weather in ${params.location}: 72°F, sunny`,
        },
      };
    },
  },
};

export const mockFailingTool: ITool = {
  name: 'failing_tool',
  description: 'A tool that always fails',
  parameters: {
    type: 'object',
    properties: {},
  },
  handlers: {
    default: async (): Promise<ToolResult> => {
      throw new Error('Tool execution failed');
    },
  },
};

export const mockCalendarTool: ITool = {
  name: 'check_availability',
  description: 'Check calendar availability',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string' },
      duration: { type: 'number' },
    },
    required: ['date'],
  },
  handlers: {
    default: async (params: any): Promise<ToolResult> => {
      return {
        success: true,
        data: {
          available: true,
          slots: ['9:00 AM', '2:00 PM', '4:00 PM'],
        },
        response: {
          text: `Available slots for ${params.date}: 9:00 AM, 2:00 PM, 4:00 PM`,
        },
      };
    },
  },
};
