/**
 * MCP Adapter
 *
 * Exposes the existing tool registry via Model Context Protocol.
 * This adapter provides a thin translation layer between MCP protocol
 * and the SDK's function-calling based tool system.
 */

import { ToolRegistry } from '../../tools/registry';
import { ExecutionContext, ITool, Channel } from '../../types';
import { logger } from '../../utils/logger';
import type {
  MCPToolListResponse,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPTool,
  MCPAdapterOptions
} from './types';

/**
 * MCPAdapter - Protocol translation layer
 *
 * Translates MCP protocol requests into standard SDK tool calls.
 * No modification to existing tools required!
 *
 * @example
 * ```typescript
 * const adapter = new MCPAdapter(toolRegistry, {
 *   defaultChannel: 'call',
 *   metadata: { protocol: 'mcp' }
 * });
 *
 * // List tools in MCP format
 * const tools = await adapter.handleToolsList();
 *
 * // Execute a tool via MCP
 * const result = await adapter.handleToolCall({
 *   name: 'check_availability',
 *   arguments: { date: '2025-10-19' }
 * });
 * ```
 */
export class MCPAdapter {
  private readonly defaultChannel: Channel;
  private readonly defaultMetadata: Record<string, any>;

  constructor(
    private readonly toolRegistry: ToolRegistry,
    options: MCPAdapterOptions = {}
  ) {
    this.defaultChannel = options.defaultChannel || 'call';
    this.defaultMetadata = {
      protocol: 'mcp',
      sdk: 'ai-receptionist',
      ...options.metadata
    };

    logger.info('[MCPAdapter] Initialized', {
      defaultChannel: this.defaultChannel,
      toolCount: this.toolRegistry.count()
    });
  }

  /**
   * Handle MCP tools/list request
   *
   * Returns all tools in MCP format. Tools are filtered by channel
   * to ensure only relevant tools are exposed.
   *
   * @param channel - Optional channel filter
   * @returns MCP-formatted tool list
   */
  async handleToolsList(channel?: Channel): Promise<MCPToolListResponse> {
    logger.info('[MCPAdapter] Handling tools/list request', { channel });

    const tools = this.toolRegistry.listAvailable(channel);

    return {
      tools: tools.map(tool => this.convertToMCPTool(tool))
    };
  }

  /**
   * Handle MCP tools/call request
   *
   * Executes a tool through the registry and returns result in MCP format.
   * Automatically creates execution context and handles errors.
   *
   * @param request - MCP tool call request
   * @param contextOverrides - Optional execution context overrides
   * @returns MCP-formatted response
   */
  async handleToolCall(
    request: MCPToolCallRequest,
    contextOverrides: Partial<ExecutionContext> = {}
  ): Promise<MCPToolCallResponse> {
    logger.info('[MCPAdapter] Handling tools/call request', {
      toolName: request.name,
      arguments: request.arguments
    });

    try {
      // Build execution context
      const context: ExecutionContext = {
        channel: contextOverrides.channel || this.defaultChannel,
        conversationId: contextOverrides.conversationId || this.generateConversationId(),
        callSid: contextOverrides.callSid,
        messageSid: contextOverrides.messageSid,
        metadata: {
          ...this.defaultMetadata,
          ...contextOverrides.metadata,
          timestamp: new Date().toISOString(),
          mcpRequest: true
        }
      };

      // Execute tool through existing registry
      const result = await this.toolRegistry.execute(
        request.name,
        request.arguments,
        context
      );

      // Convert to MCP response format
      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: result.error,
              success: false
            }, null, 2)
          }],
          isError: true
        };
      }

      // Success response
      const responseData: any = {
        success: true,
        data: result.data
      };

      // Include channel-specific response if available
      if (result.response) {
        responseData.response = result.response;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(responseData, null, 2)
        }]
      };

    } catch (error) {
      logger.error('[MCPAdapter] Tool call failed', error instanceof Error ? error : new Error(String(error)));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            stack: error instanceof Error ? error.stack : undefined
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Get tool by name in MCP format
   *
   * @param toolName - Name of the tool
   * @returns MCP tool definition or null if not found
   */
  async getTool(toolName: string): Promise<MCPTool | null> {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      return null;
    }

    return this.convertToMCPTool(tool);
  }

  /**
   * Get count of available tools
   *
   * @returns Number of registered tools
   */
  getToolCount(): number {
    return this.toolRegistry.count();
  }

  /**
   * Get adapter statistics
   *
   * @returns Statistics about the adapter
   */
  getStats(): {
    toolCount: number;
    defaultChannel: string;
    metadata: Record<string, any>;
  } {
    return {
      toolCount: this.toolRegistry.count(),
      defaultChannel: this.defaultChannel,
      metadata: this.defaultMetadata
    };
  }

  /**
   * Convert ITool to MCP format
   *
   * The SDK tools already use JSON Schema for parameters,
   * so this conversion is straightforward!
   */
  private convertToMCPTool(tool: ITool): MCPTool {
    const { type: _type, ...paramProps } = tool.parameters;
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        ...paramProps
      }
    };
  }

  /**
   * Generate a unique conversation ID for MCP calls
   */
  private generateConversationId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
