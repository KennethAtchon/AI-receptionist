/**
 * Tool Execution Service
 * Handles tool execution with monitoring and error handling
 */

import { ToolRegistry } from '../tools/registry';
import { ExecutionContext, ToolResult, ToolExecutionEvent, ToolErrorEvent } from '../types';

export class ToolExecutionService {
  constructor(
    private registry: ToolRegistry,
    private onToolExecute?: (event: ToolExecutionEvent) => void,
    private onToolError?: (event: ToolErrorEvent) => void
  ) {}

  /**
   * Get tools available for a specific channel
   */
  getToolsForChannel(channel: 'call' | 'sms' | 'email') {
    return this.registry.listAvailable(channel);
  }

  /**
   * Execute a tool with monitoring
   */
  async execute(
    toolName: string,
    parameters: any,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      console.log(`[ToolExecutionService] Executing '${toolName}' on ${context.channel}`);

      const result = await this.registry.execute(toolName, parameters, context);

      const duration = Date.now() - startTime;

      // Fire success event
      if (this.onToolExecute) {
        this.onToolExecute({
          toolName,
          parameters,
          result,
          duration,
          timestamp: new Date()
        });
      }

      console.log(`[ToolExecutionService] Tool '${toolName}' executed in ${duration}ms`);

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Fire error event
      if (this.onToolError) {
        this.onToolError({
          toolName,
          parameters,
          error: errorObj,
          timestamp: new Date()
        });
      }

      console.error(`[ToolExecutionService] Tool '${toolName}' failed:`, errorObj);

      return {
        success: false,
        error: errorObj.message,
        response: {
          text: 'Sorry, I encountered an error while performing that action.'
        }
      };
    }
  }

  /**
   * Get the underlying tool registry
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }
}
