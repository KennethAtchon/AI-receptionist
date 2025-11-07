/**
 * ToolStore
 * Centralized persistence and querying for tool executions backed by Agent memory
 * 
 * The ToolStore provides a lightweight facade for logging tool executions and errors
 * into the Agent's memory system. All tool executions are automatically logged when
 * a ToolStore is attached to a ToolRegistry.
 * 
 * @example
 * ```typescript
 * const toolStore = new ToolStore(agent);
 * registry.setToolStore(toolStore);
 * 
 * // Tool executions are now automatically logged
 * await registry.execute('my_tool', params, context);
 * 
 * // Query execution history
 * const executions = await toolStore.findExecutions({
 *   toolName: 'my_tool',
 *   limit: 10
 * });
 * ```
 */

import type { ExecutionContext, ToolResult } from '../types';
import type { Agent } from '../agent/core/Agent';
import { logger } from '../utils/logger';
import { generateId } from '../utils/id-generator';

/**
 * Tool execution record interface
 * Represents a logged tool execution in memory
 */
export interface ToolExecutionRecord {
  id: string;
  toolName: string;
  parameters: any;
  result?: ToolResult;
  error?: string;
  success: boolean;
  timestamp: Date;
  durationMs?: number;
  context: ExecutionContext;
}

/**
 * ToolStore
 * A lightweight facade that writes tool execution events into the Agent's memory
 * and provides simple query helpers.
 */
export class ToolStore {
  private agent?: Agent;

  /**
   * Create a new ToolStore instance
   * 
   * @param agent - Optional agent instance. Can be set later with setAgent()
   * 
   * @example
   * ```typescript
   * const toolStore = new ToolStore(agent);
   * // or
   * const toolStore = new ToolStore();
   * toolStore.setAgent(agent);
   * ```
   */
  constructor(agent?: Agent) {
    this.agent = agent;
  }

  /**
   * Set the agent instance for logging
   * 
   * @param agent - The agent instance to use for memory storage
   * 
   * @example
   * ```typescript
   * toolStore.setAgent(agent);
   * ```
   */
  setAgent(agent: Agent): void {
    this.agent = agent;
  }

  // ================= Registry/System Logs =================
  
  /**
   * Log when a tool is registered
   * 
   * @param toolName - Name of the registered tool
   * @internal This is called automatically by ToolRegistry
   */
  async logToolRegistered(toolName: string): Promise<void> {
    if (!this.agent) return;
    try {
      await this.agent.getMemory().store({
        id: generateId('log-tool-registered'),
        content: `Tool registered: ${toolName}`,
        timestamp: new Date(),
        type: 'system',
        importance: 4,
        role: 'system',
        metadata: { toolName, event: 'tool_registered' }
      });
    } catch (err) {
      logger.warn('[ToolStore] Failed to log tool registration', {
        cause: err instanceof Error ? err.message : String(err)
      });
    }
  }

  /**
   * Log when a tool is unregistered
   * 
   * @param toolName - Name of the unregistered tool
   * @internal This is called automatically by ToolRegistry
   */
  async logToolUnregistered(toolName: string): Promise<void> {
    if (!this.agent) return;
    try {
      await this.agent.getMemory().store({
        id: generateId('log-tool-unregistered'),
        content: `Tool unregistered: ${toolName}`,
        timestamp: new Date(),
        type: 'system',
        importance: 4,
        role: 'system',
        metadata: { toolName, event: 'tool_unregistered' }
      });
    } catch (err) {
      logger.warn('[ToolStore] Failed to log tool unregistration', {
        cause: err instanceof Error ? err.message : String(err)
      });
    }
  }

  /**
   * Persist a successful tool execution into memory
   * 
   * @param toolName - Name of the executed tool
   * @param parameters - Parameters passed to the tool
   * @param result - Tool execution result
   * @param context - Execution context
   * @param durationMs - Execution duration in milliseconds
   * @internal This is called automatically by ToolRegistry
   */
  async logExecution(
    toolName: string,
    parameters: any,
    result: ToolResult,
    context: ExecutionContext,
    durationMs?: number
  ): Promise<void> {
    if (!this.agent) return;

    try {
      await this.agent.getMemory().store({
        id: generateId(`tool-exec-${toolName}`),
        content: `Tool '${toolName}' executed with parameters: ${JSON.stringify(parameters)}`,
        timestamp: new Date(),
        type: 'tool_execution',
        importance: 5,
        channel: context.channel,
        role: 'tool',
        sessionMetadata: {
          conversationId: context.conversationId,
          callSid: context.callSid,
          messageSid: context.messageSid
        },
        toolCall: {
          id: generateId('call'),
          name: toolName,
          parameters
        },
        toolResult: {
          success: result.success,
          data: result.data,
          error: result.error
        },
        metadata: {
          durationMs,
          response: result.response
        }
      });
    } catch (err) {
      logger.warn('[ToolStore] Failed to log execution', {
        cause: err instanceof Error ? err.message : String(err)
      });
    }
  }

  /**
   * Persist a failed tool execution into memory
   * 
   * @param toolName - Name of the tool that failed
   * @param parameters - Parameters passed to the tool
   * @param error - Error that occurred
   * @param context - Execution context
   * @param durationMs - Execution duration in milliseconds
   * @internal This is called automatically by ToolRegistry
   */
  async logError(
    toolName: string,
    parameters: any,
    error: Error | string,
    context: ExecutionContext,
    durationMs?: number
  ): Promise<void> {
    if (!this.agent) return;

    const errorMessage = error instanceof Error ? error.message : String(error);

    try {
      await this.agent.getMemory().store({
        id: generateId(`tool-error-${toolName}`),
        content: `Tool '${toolName}' failed: ${errorMessage}`,
        timestamp: new Date(),
        type: 'error',
        importance: 8,
        channel: context.channel,
        role: 'tool',
        sessionMetadata: {
          conversationId: context.conversationId,
          callSid: context.callSid,
          messageSid: context.messageSid,
        },
        toolCall: {
          id: generateId('call'),
          name: toolName,
          parameters
        },
        metadata: {
          status: 'failed', // Moved to metadata
          durationMs
        }
      });
    } catch (err) {
      logger.warn('[ToolStore] Failed to log error', {
        cause: err instanceof Error ? err.message : String(err)
      });
    }
  }

  /**
   * Query recent tool executions from memory
   * 
   * @param params - Query parameters
   * @param params.conversationId - Optional conversation ID to filter by
   * @param params.toolName - Optional tool name to filter by
   * @param params.success - Optional success filter (true for successes, false for errors)
   * @param params.limit - Maximum number of results (default: 20)
   * @returns Array of memory entries matching the query
   * 
   * @example
   * ```typescript
   * // Get all executions for a conversation
   * const executions = await toolStore.findExecutions({
   *   conversationId: 'conv-123',
   *   limit: 50
   * });
   * 
   * // Get failed executions for a specific tool
   * const errors = await toolStore.findExecutions({
   *   toolName: 'send_email',
   *   success: false,
   *   limit: 10
   * });
   * ```
   */
  async findExecutions(params: {
    conversationId?: string;
    toolName?: string;
    success?: boolean;
    limit?: number;
  }) {
    if (!this.agent) return [];

    const memories = await this.agent.getMemory().search({
      type: params.success === false ? ['error'] : ['tool_execution', 'error'],
      conversationId: params.conversationId,
      keywords: params.toolName ? [params.toolName] : [],
      limit: params.limit || 20,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    return memories;
  }

  /**
   * Get the last successful execution of a tool in a conversation
   * 
   * Convenience method to retrieve the most recent successful execution.
   * 
   * @param toolName - Name of the tool
   * @param conversationId - Optional conversation ID to filter by
   * @returns The most recent successful execution, or null if none found
   * 
   * @example
   * ```typescript
   * const lastExecution = await toolStore.getLastExecution('send_email', 'conv-123');
   * if (lastExecution) {
   *   console.log('Last email sent:', lastExecution.toolResult?.data);
   * }
   * ```
   */
  async getLastExecution(toolName: string, conversationId?: string) {
    const list = await this.findExecutions({
      conversationId,
      toolName,
      success: true,
      limit: 1
    });
    return list[0] || null;
  }
}


