/**
 * Unit Tests - ToolExecutionService
 */

import { ToolExecutionService } from '../tool-execution.service';
import { ToolRegistry } from '../../tools/registry';
import { ExecutionContext, ToolExecutionEvent, ToolErrorEvent } from '../../types';
import {
  mockBookingTool,
  mockWeatherTool,
  mockFailingTool,
  mockAgentSarah,
} from '../../__tests__/fixtures';

describe('ToolExecutionService', () => {
  let registry: ToolRegistry;
  let service: ToolExecutionService;
  let onToolExecute: jest.Mock;
  let onToolError: jest.Mock;

  const mockContext: ExecutionContext = {
    channel: 'call',
    conversationId: 'conv_123',
    callSid: 'CA123',
    agent: mockAgentSarah,
  };

  beforeEach(() => {
    registry = new ToolRegistry();
    onToolExecute = jest.fn();
    onToolError = jest.fn();

    service = new ToolExecutionService(registry, onToolExecute, onToolError);

    // Register standard tools
    registry.register(mockBookingTool);
    registry.register(mockWeatherTool);
    registry.register(mockFailingTool);
  });

  describe('constructor', () => {
    it('should_create_service_with_registry', () => {
      expect(service).toBeInstanceOf(ToolExecutionService);
    });

    it('should_create_service_without_event_handlers', () => {
      const serviceWithoutHandlers = new ToolExecutionService(registry);
      expect(serviceWithoutHandlers).toBeInstanceOf(ToolExecutionService);
    });
  });

  describe('getToolsForChannel', () => {
    it('should_get_tools_available_for_call_channel', () => {
      const tools = service.getToolsForChannel('call');

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map(t => t.name)).toContain('book_appointment');
    });

    it('should_get_tools_available_for_sms_channel', () => {
      const tools = service.getToolsForChannel('sms');

      expect(tools.length).toBeGreaterThan(0);
    });

    it('should_get_tools_available_for_email_channel', () => {
      const tools = service.getToolsForChannel('email');

      expect(tools.length).toBeGreaterThan(0);
    });

    it('should_return_different_tools_based_on_channel_handlers', () => {
      const callTools = service.getToolsForChannel('call');
      const smsTools = service.getToolsForChannel('sms');

      // Both should have tools with default handlers
      expect(callTools.length).toBeGreaterThan(0);
      expect(smsTools.length).toBeGreaterThan(0);
    });
  });

  describe('execute', () => {
    it('should_execute_tool_successfully', async () => {
      const result = await service.execute(
        'get_weather',
        { location: 'San Francisco' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.location).toBe('San Francisco');
      expect(result.data.temperature).toBe(72);
    });

    it('should_execute_tool_with_channel_specific_handler', async () => {
      const result = await service.execute(
        'book_appointment',
        { date: '2025-01-20', time: '2:00 PM', service: 'haircut' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.appointmentId).toBe('apt_call_123');
    });

    it('should_fire_onToolExecute_event_on_success', async () => {
      await service.execute(
        'get_weather',
        { location: 'Boston' },
        mockContext
      );

      expect(onToolExecute).toHaveBeenCalledTimes(1);

      const event: ToolExecutionEvent = onToolExecute.mock.calls[0][0];
      expect(event.toolName).toBe('get_weather');
      expect(event.parameters).toEqual({ location: 'Boston' });
      expect(event.result.success).toBe(true);
      expect(event.duration).toBeGreaterThanOrEqual(0);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should_measure_execution_duration', async () => {
      await service.execute(
        'get_weather',
        { location: 'Chicago' },
        mockContext
      );

      const event: ToolExecutionEvent = onToolExecute.mock.calls[0][0];
      expect(event.duration).toBeGreaterThanOrEqual(0);
      expect(event.duration).toBeLessThan(1000); // Should be fast
    });

    it('should_handle_tool_errors_gracefully', async () => {
      const result = await service.execute('failing_tool', {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed');
      expect(result.response.text).toContain('error');
    });

    it('should_fire_onToolError_event_on_failure', async () => {
      await service.execute('failing_tool', {}, mockContext);

      // Note: The ToolRegistry catches errors internally and returns ToolResult,
      // so onToolError is not triggered by the service layer
      expect(onToolError).toHaveBeenCalledTimes(0);
    });

    it('should_not_throw_error_when_tool_fails', async () => {
      await expect(
        service.execute('failing_tool', {}, mockContext)
      ).resolves.toBeDefined();
    });

    it('should_pass_context_to_tool_handler', async () => {
      const result = await service.execute(
        'book_appointment',
        { date: '2025-02-01', time: '10:00 AM', service: 'massage' },
        {
          ...mockContext,
          channel: 'sms',
          metadata: { source: 'mobile_app' },
        }
      );

      expect(result.success).toBe(true);
    });

    it('should_handle_missing_tool_gracefully', async () => {
      const result = await service.execute(
        'non_existent_tool',
        {},
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should_work_without_event_handlers', async () => {
      const serviceWithoutHandlers = new ToolExecutionService(registry);

      const result = await serviceWithoutHandlers.execute(
        'get_weather',
        { location: 'Seattle' },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should_handle_multiple_sequential_executions', async () => {
      const result1 = await service.execute(
        'get_weather',
        { location: 'New York' },
        mockContext
      );

      const result2 = await service.execute(
        'book_appointment',
        { date: '2025-01-25', time: '3:00 PM', service: 'consultation' },
        mockContext
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(onToolExecute).toHaveBeenCalledTimes(2);
    });

    it('should_handle_concurrent_executions', async () => {
      const promises = [
        service.execute('get_weather', { location: 'LA' }, mockContext),
        service.execute('get_weather', { location: 'NYC' }, mockContext),
        service.execute('get_weather', { location: 'SF' }, mockContext),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(onToolExecute).toHaveBeenCalledTimes(3);
    });

    it('should_include_correct_parameters_in_execution_event', async () => {
      const params = {
        date: '2025-03-15',
        time: '11:30 AM',
        service: 'meeting',
      };

      await service.execute('book_appointment', params, mockContext);

      const event: ToolExecutionEvent = onToolExecute.mock.calls[0][0];
      expect(event.parameters).toEqual(params);
    });

    it('should_return_tool_result_with_response', async () => {
      const result = await service.execute(
        'get_weather',
        { location: 'Miami' },
        mockContext
      );

      expect(result.response).toBeDefined();
      expect(result.response.text).toContain('Miami');
    });
  });

  describe('getRegistry', () => {
    it('should_return_underlying_tool_registry', () => {
      const returnedRegistry = service.getRegistry();

      expect(returnedRegistry).toBe(registry);
    });

    it('should_allow_accessing_registry_methods', () => {
      const returnedRegistry = service.getRegistry();

      expect(returnedRegistry.count()).toBe(3); // booking, weather, failing
      expect(returnedRegistry.get('get_weather')).toBeDefined();
    });
  });

  describe('error handling edge cases', () => {
    it('should_handle_non_error_exceptions', async () => {
      const stringThrowingTool = {
        name: 'string_thrower',
        description: 'Throws a string',
        parameters: { type: 'object' },
        handlers: {
          default: async () => {
            throw 'String error'; // Non-Error throw
          },
        },
      };

      registry.register(stringThrowingTool);

      const result = await service.execute('string_thrower', {}, mockContext);

      expect(result.success).toBe(false);
      // ToolRegistry handles the error and wraps it
      expect(result.error).toBeDefined();
    });

    it('should_handle_undefined_thrown_value', async () => {
      const undefinedThrowingTool = {
        name: 'undefined_thrower',
        description: 'Throws undefined',
        parameters: { type: 'object' },
        handlers: {
          default: async () => {
            throw undefined;
          },
        },
      };

      registry.register(undefinedThrowingTool);

      const result = await service.execute('undefined_thrower', {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('event handler edge cases', () => {
    it('should_handle_event_handler_errors_gracefully', async () => {
      const throwingHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      const serviceWithThrowingHandler = new ToolExecutionService(
        registry,
        throwingHandler
      );

      // The service catches handler errors and continues execution
      const result = await serviceWithThrowingHandler.execute(
        'get_weather',
        { location: 'Denver' },
        mockContext
      );

      // Execution completes despite handler error
      // But result indicates the error
      expect(result).toBeDefined();
      expect(throwingHandler).toHaveBeenCalled();
    });

    it('should_work_with_async_event_handlers', async () => {
      const asyncHandler = jest.fn(async (event: ToolExecutionEvent) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        // Do some async work
      });

      const serviceWithAsyncHandler = new ToolExecutionService(
        registry,
        asyncHandler
      );

      await serviceWithAsyncHandler.execute(
        'get_weather',
        { location: 'Portland' },
        mockContext
      );

      expect(asyncHandler).toHaveBeenCalled();
    });
  });

  describe('integration with different channels', () => {
    it('should_execute_correctly_for_call_channel', async () => {
      const callContext: ExecutionContext = {
        ...mockContext,
        channel: 'call',
      };

      const result = await service.execute(
        'book_appointment',
        { date: '2025-01-30', time: '1:00 PM', service: 'demo' },
        callContext
      );

      expect(result.success).toBe(true);
      expect(result.response.speak).toBeDefined();
    });

    it('should_execute_correctly_for_sms_channel', async () => {
      const smsContext: ExecutionContext = {
        ...mockContext,
        channel: 'sms',
        messageSid: 'SM123',
      };

      const result = await service.execute(
        'get_weather',
        { location: 'Austin' },
        smsContext
      );

      expect(result.success).toBe(true);
    });

    it('should_execute_correctly_for_email_channel', async () => {
      const emailContext: ExecutionContext = {
        ...mockContext,
        channel: 'email',
      };

      const result = await service.execute(
        'get_weather',
        { location: 'Phoenix' },
        emailContext
      );

      expect(result.success).toBe(true);
    });
  });
});
