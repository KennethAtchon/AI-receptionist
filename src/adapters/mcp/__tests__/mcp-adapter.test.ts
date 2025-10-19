/**
 * MCP Adapter Tests
 */

import { MCPAdapter } from '../mcp-adapter';
import { ToolRegistry } from '../../../tools/registry';
import { ToolBuilder } from '../../../tools/builder';
import type { ITool, ExecutionContext, ToolResult } from '../../../types';

describe('MCPAdapter', () => {
  let toolRegistry: ToolRegistry;
  let adapter: MCPAdapter;

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
    adapter = new MCPAdapter(toolRegistry, {
      defaultChannel: 'call',
      metadata: { test: true }
    });
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  describe('constructor', () => {
    it('should create adapter with default options', () => {
      const defaultAdapter = new MCPAdapter(toolRegistry);
      const stats = defaultAdapter.getStats();

      expect(stats.defaultChannel).toBe('call');
      expect(stats.metadata.protocol).toBe('mcp');
      expect(stats.metadata.sdk).toBe('ai-receptionist');
    });

    it('should create adapter with custom options', () => {
      const customAdapter = new MCPAdapter(toolRegistry, {
        defaultChannel: 'sms',
        metadata: { custom: 'value' }
      });

      const stats = customAdapter.getStats();
      expect(stats.defaultChannel).toBe('sms');
      expect(stats.metadata.custom).toBe('value');
    });
  });

  describe('handleToolsList', () => {
    it('should return empty list when no tools registered', async () => {
      const response = await adapter.handleToolsList();

      expect(response.tools).toEqual([]);
    });

    it('should return all tools in MCP format', async () => {
      // Register a test tool
      const testTool = new ToolBuilder()
        .withName('test_tool')
        .withDescription('A test tool')
        .withParameters({
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' }
          },
          required: ['param1']
        })
        .default(async (params) => ({
          success: true,
          data: { result: 'ok' },
          response: { text: 'Success' }
        }))
        .build();

      toolRegistry.register(testTool);

      const response = await adapter.handleToolsList();

      expect(response.tools).toHaveLength(1);
      expect(response.tools[0]).toEqual({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' }
          },
          required: ['param1']
        }
      });
    });

    it('should filter tools by channel', async () => {
      // Tool with only SMS handler
      const smsTool = new ToolBuilder()
        .withName('sms_tool')
        .withDescription('SMS only tool')
        .withParameters({ type: 'object', properties: {} })
        .default(async () => ({
          success: true,
          data: {},
          response: { text: 'default' }
        }))
        .onSMS(async () => ({
          success: true,
          data: {},
          response: { message: 'SMS response' }
        }))
        .build();

      // Tool with default handler (works on all channels)
      const defaultTool = new ToolBuilder()
        .withName('default_tool')
        .withDescription('Default tool')
        .withParameters({ type: 'object', properties: {} })
        .default(async () => ({
          success: true,
          data: {},
          response: { text: 'default' }
        }))
        .build();

      toolRegistry.register(smsTool);
      toolRegistry.register(defaultTool);

      // Get SMS tools
      const smsResponse = await adapter.handleToolsList('sms');
      expect(smsResponse.tools).toHaveLength(2); // Both tools work on SMS

      // Get all tools
      const allResponse = await adapter.handleToolsList();
      expect(allResponse.tools).toHaveLength(2);
    });
  });

  describe('handleToolCall', () => {
    it('should execute tool successfully', async () => {
      const testTool = new ToolBuilder()
        .withName('add_numbers')
        .withDescription('Adds two numbers')
        .withParameters({
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' }
          },
          required: ['a', 'b']
        })
        .default(async (params) => ({
          success: true,
          data: { sum: params.a + params.b },
          response: { text: `The sum is ${params.a + params.b}` }
        }))
        .build();

      toolRegistry.register(testTool);

      const response = await adapter.handleToolCall({
        name: 'add_numbers',
        arguments: { a: 5, b: 3 }
      });

      expect(response.isError).toBeUndefined();
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const result = JSON.parse(response.content[0].text!);
      expect(result.success).toBe(true);
      expect(result.data.sum).toBe(8);
      expect(result.response.text).toBe('The sum is 8');
    });

    it('should handle tool execution errors', async () => {
      const errorTool = new ToolBuilder()
        .withName('error_tool')
        .withDescription('Always fails')
        .withParameters({ type: 'object', properties: {} })
        .default(async () => {
          throw new Error('Tool execution failed');
        })
        .build();

      toolRegistry.register(errorTool);

      const response = await adapter.handleToolCall({
        name: 'error_tool',
        arguments: {}
      });

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);

      const result = JSON.parse(response.content[0].text!);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });

    it('should handle tool not found', async () => {
      const response = await adapter.handleToolCall({
        name: 'nonexistent_tool',
        arguments: {}
      });

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);

      const result = JSON.parse(response.content[0].text!);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle tool returning error result', async () => {
      const failTool = new ToolBuilder()
        .withName('fail_tool')
        .withDescription('Returns error')
        .withParameters({ type: 'object', properties: {} })
        .default(async () => ({
          success: false,
          error: 'Something went wrong',
          response: { text: 'Error occurred' }
        }))
        .build();

      toolRegistry.register(failTool);

      const response = await adapter.handleToolCall({
        name: 'fail_tool',
        arguments: {}
      });

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);

      const result = JSON.parse(response.content[0].text!);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('should use correct execution context', async () => {
      let capturedContext: ExecutionContext | undefined;

      const contextTool = new ToolBuilder()
        .withName('context_tool')
        .withDescription('Captures context')
        .withParameters({ type: 'object', properties: {} })
        .default(async (params, context) => {
          capturedContext = context;
          return {
            success: true,
            data: { context },
            response: { text: 'ok' }
          };
        })
        .build();

      toolRegistry.register(contextTool);

      await adapter.handleToolCall({
        name: 'context_tool',
        arguments: {}
      });

      expect(capturedContext).toBeDefined();
      expect(capturedContext!.channel).toBe('call'); // default channel
      expect(capturedContext!.conversationId).toMatch(/^mcp-/);
      expect(capturedContext!.metadata?.protocol).toBe('mcp');
      expect(capturedContext!.metadata?.mcpRequest).toBe(true);
    });

    it('should allow context overrides', async () => {
      let capturedContext: ExecutionContext | undefined;

      const contextTool = new ToolBuilder()
        .withName('context_tool')
        .withDescription('Captures context')
        .withParameters({ type: 'object', properties: {} })
        .default(async (params, context) => {
          capturedContext = context;
          return {
            success: true,
            data: {},
            response: { text: 'ok' }
          };
        })
        .build();

      toolRegistry.register(contextTool);

      await adapter.handleToolCall(
        {
          name: 'context_tool',
          arguments: {}
        },
        {
          channel: 'sms',
          conversationId: 'custom-id',
          metadata: { custom: 'value' }
        }
      );

      expect(capturedContext!.channel).toBe('sms');
      expect(capturedContext!.conversationId).toBe('custom-id');
      expect(capturedContext!.metadata?.custom).toBe('value');
      expect(capturedContext!.metadata?.protocol).toBe('mcp'); // Still has default metadata
    });
  });

  describe('getTool', () => {
    it('should return tool in MCP format', async () => {
      const testTool = new ToolBuilder()
        .withName('test_tool')
        .withDescription('A test tool')
        .withParameters({
          type: 'object',
          properties: { param1: { type: 'string' } }
        })
        .default(async () => ({
          success: true,
          data: {},
          response: { text: 'ok' }
        }))
        .build();

      toolRegistry.register(testTool);

      const tool = await adapter.getTool('test_tool');

      expect(tool).toEqual({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: { param1: { type: 'string' } }
        }
      });
    });

    it('should return null for nonexistent tool', async () => {
      const tool = await adapter.getTool('nonexistent');
      expect(tool).toBeNull();
    });
  });

  describe('getToolCount', () => {
    it('should return correct tool count', () => {
      expect(adapter.getToolCount()).toBe(0);

      const tool1 = new ToolBuilder()
        .withName('tool1')
        .withDescription('Tool 1')
        .withParameters({ type: 'object', properties: {} })
        .default(async () => ({ success: true, data: {}, response: { text: 'ok' } }))
        .build();

      const tool2 = new ToolBuilder()
        .withName('tool2')
        .withDescription('Tool 2')
        .withParameters({ type: 'object', properties: {} })
        .default(async () => ({ success: true, data: {}, response: { text: 'ok' } }))
        .build();

      toolRegistry.register(tool1);
      expect(adapter.getToolCount()).toBe(1);

      toolRegistry.register(tool2);
      expect(adapter.getToolCount()).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return adapter statistics', () => {
      const stats = adapter.getStats();

      expect(stats.toolCount).toBe(0);
      expect(stats.defaultChannel).toBe('call');
      expect(stats.metadata.protocol).toBe('mcp');
      expect(stats.metadata.test).toBe(true);
    });
  });
});
