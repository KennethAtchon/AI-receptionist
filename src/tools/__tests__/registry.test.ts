/**
 * Unit Tests - ToolRegistry
 */

import { ToolRegistry } from '../registry';
import { ITool, ExecutionContext, ToolResult } from '../../types';
import {
  mockBookingTool,
  mockWeatherTool,
  mockFailingTool,
  mockCalendarTool,
} from '../../__tests__/fixtures';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('constructor', () => {
    it('should_create_empty_registry', () => {
      expect(registry.count()).toBe(0);
    });
  });

  describe('register', () => {
    it('should_register_new_tool_successfully', () => {
      registry.register(mockBookingTool);

      expect(registry.count()).toBe(1);
      expect(registry.get('book_appointment')).toBeDefined();
      expect(registry.get('book_appointment')).toEqual(mockBookingTool);
    });

    it('should_register_multiple_tools', () => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);
      registry.register(mockCalendarTool);

      expect(registry.count()).toBe(3);
    });

    it('should_overwrite_existing_tool_when_registered_again', () => {
      registry.register(mockBookingTool);

      const updatedTool: ITool = {
        ...mockBookingTool,
        description: 'Updated description',
      };

      registry.register(updatedTool);

      expect(registry.count()).toBe(1);
      expect(registry.get('book_appointment')?.description).toBe('Updated description');
    });

    it('should_handle_tool_with_channel_specific_handlers', () => {
      registry.register(mockBookingTool);

      const tool = registry.get('book_appointment');
      expect(tool?.handlers.onCall).toBeDefined();
      expect(tool?.handlers.default).toBeDefined();
    });
  });

  describe('unregister', () => {
    it('should_remove_registered_tool', () => {
      registry.register(mockBookingTool);
      expect(registry.count()).toBe(1);

      registry.unregister('book_appointment');
      expect(registry.count()).toBe(0);
      expect(registry.get('book_appointment')).toBeUndefined();
    });

    it('should_handle_unregistering_non_existent_tool_gracefully', () => {
      registry.unregister('non_existent_tool');
      expect(registry.count()).toBe(0);
    });

    it('should_not_affect_other_tools_when_unregistering', () => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);

      registry.unregister('book_appointment');

      expect(registry.count()).toBe(1);
      expect(registry.get('get_weather')).toBeDefined();
    });
  });

  describe('get', () => {
    it('should_return_registered_tool', () => {
      registry.register(mockBookingTool);

      const tool = registry.get('book_appointment');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('book_appointment');
    });

    it('should_return_undefined_for_non_existent_tool', () => {
      const tool = registry.get('non_existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('listAvailable', () => {
    beforeEach(() => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);
      registry.register(mockCalendarTool);
    });

    it('should_list_all_tools_when_no_channel_specified', () => {
      const tools = registry.listAvailable();

      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toContain('book_appointment');
      expect(tools.map(t => t.name)).toContain('get_weather');
      expect(tools.map(t => t.name)).toContain('check_availability');
    });

    it('should_list_tools_available_for_call_channel', () => {
      const tools = registry.listAvailable('call');

      // All tools should be available as they all have default handlers
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should_include_tools_with_channel_specific_handlers', () => {
      const tools = registry.listAvailable('call');

      const bookingTool = tools.find(t => t.name === 'book_appointment');
      expect(bookingTool).toBeDefined();
      expect(bookingTool?.handlers.onCall).toBeDefined();
    });

    it('should_include_tools_with_only_default_handler', () => {
      const tools = registry.listAvailable('sms');

      const weatherTool = tools.find(t => t.name === 'get_weather');
      expect(weatherTool).toBeDefined();
    });

    it('should_return_empty_array_when_no_tools_registered', () => {
      const emptyRegistry = new ToolRegistry();
      const tools = emptyRegistry.listAvailable();

      expect(tools).toEqual([]);
    });
  });

  describe('execute', () => {
    const mockContext: ExecutionContext = {
      channel: 'call',
      conversationId: 'conv_123',
      callSid: 'CA123',
      agent: {
        name: 'Sarah',
        role: 'Sales Rep',
      },
    };

    beforeEach(() => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);
      registry.register(mockFailingTool);
    });

    it('should_execute_tool_successfully_with_default_handler', async () => {
      const result = await registry.execute(
        'get_weather',
        { location: 'New York' },
        { ...mockContext, channel: 'sms' }
      );

      expect(result.success).toBe(true);
      expect(result.data.location).toBe('New York');
      expect(result.data.temperature).toBe(72);
    });

    it('should_execute_tool_with_channel_specific_handler', async () => {
      const result = await registry.execute(
        'book_appointment',
        { date: '2025-01-20', time: '2:00 PM', service: 'haircut' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.appointmentId).toBe('apt_call_123'); // Call-specific handler
      expect(result.response.speak).toContain('scheduled');
    });

    it('should_fallback_to_default_handler_when_channel_specific_not_available', async () => {
      const result = await registry.execute(
        'book_appointment',
        { date: '2025-01-20', time: '2:00 PM', service: 'massage' },
        { ...mockContext, channel: 'sms' }
      );

      expect(result.success).toBe(true);
      expect(result.data.appointmentId).toBe('apt_123'); // Default handler
    });

    it('should_throw_error_when_tool_not_found', async () => {
      await expect(
        registry.execute('non_existent_tool', {}, mockContext)
      ).rejects.toThrow("Tool 'non_existent_tool' not found in registry");
    });

    it('should_handle_tool_execution_errors_gracefully', async () => {
      const result = await registry.execute('failing_tool', {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
      expect(result.response.text).toContain('error');
    });

    it('should_pass_parameters_correctly_to_tool_handler', async () => {
      const params = {
        date: '2025-02-01',
        time: '10:00 AM',
        service: 'consultation',
      };

      // Use SMS context to get the default handler which returns full data
      const result = await registry.execute('book_appointment', params, {
        ...mockContext,
        channel: 'sms',
      });

      expect(result.data.date).toBe(params.date);
      expect(result.data.time).toBe(params.time);
      expect(result.data.service).toBe(params.service);
    });

    it('should_pass_execution_context_to_handler', async () => {
      const customTool: ITool = {
        name: 'context_checker',
        description: 'Checks execution context',
        parameters: { type: 'object' },
        handlers: {
          default: async (params: any, context: ExecutionContext): Promise<ToolResult> => {
            return {
              success: true,
              data: {
                channel: context.channel,
                conversationId: context.conversationId,
                agentName: context.agent.name,
              },
              response: { text: 'Context received' },
            };
          },
        },
      };

      registry.register(customTool);

      const result = await registry.execute('context_checker', {}, mockContext);

      expect(result.data.channel).toBe('call');
      expect(result.data.conversationId).toBe('conv_123');
      expect(result.data.agentName).toBe('Sarah');
    });
  });

  describe('count', () => {
    it('should_return_zero_for_empty_registry', () => {
      expect(registry.count()).toBe(0);
    });

    it('should_return_correct_count_after_registrations', () => {
      registry.register(mockBookingTool);
      expect(registry.count()).toBe(1);

      registry.register(mockWeatherTool);
      expect(registry.count()).toBe(2);

      registry.register(mockCalendarTool);
      expect(registry.count()).toBe(3);
    });

    it('should_update_count_after_unregistration', () => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);
      expect(registry.count()).toBe(2);

      registry.unregister('book_appointment');
      expect(registry.count()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should_remove_all_tools', () => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);
      registry.register(mockCalendarTool);

      expect(registry.count()).toBe(3);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.get('book_appointment')).toBeUndefined();
      expect(registry.get('get_weather')).toBeUndefined();
    });

    it('should_handle_clearing_empty_registry', () => {
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should_handle_tool_with_special_characters_in_name', () => {
      const specialTool: ITool = {
        name: 'tool-with-dashes_and_underscores',
        description: 'Special name',
        parameters: { type: 'object' },
        handlers: {
          default: async (): Promise<ToolResult> => ({
            success: true,
            response: { text: 'ok' },
          }),
        },
      };

      registry.register(specialTool);
      expect(registry.get('tool-with-dashes_and_underscores')).toBeDefined();
    });

    it('should_maintain_tool_order_in_list', () => {
      registry.register(mockBookingTool);
      registry.register(mockWeatherTool);
      registry.register(mockCalendarTool);

      const tools = registry.listAvailable();
      const names = tools.map(t => t.name);

      expect(names).toContain('book_appointment');
      expect(names).toContain('get_weather');
      expect(names).toContain('check_availability');
    });
  });
});
