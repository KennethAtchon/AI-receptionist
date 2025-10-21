/**
 * ToolStore
 * Centralized persistence and querying for tool executions backed by Agent memory
 */

import type { ExecutionContext, ToolResult } from '../types';
import type { Agent } from '../agent/core/Agent';
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
import { logger } from '../utils/logger';

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
 * A lightweight facade that writes tool execution events into the Agent's memory
 * and provides simple query helpers.
 */
export class ToolStore {
  private agent?: Agent;

  constructor(agent?: Agent) {
    this.agent = agent;
  }

  setAgent(agent: Agent): void {
    this.agent = agent;
  }

  // ================= Registry/System Logs =================
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
          status: 'failed'
        },
        toolCall: {
          id: generateId('call'),
          name: toolName,
          parameters
        },
        metadata: {
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
   * Convenience: get last successful execution of a tool in a conversation
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


