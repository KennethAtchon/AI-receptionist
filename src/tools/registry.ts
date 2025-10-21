/**
 * Tool Registry
 * Centralized management of AI tools/capabilities
 */

import { ITool, ExecutionContext, ToolResult, Channel } from '../types';
import { logger } from '../utils/logger';
import { ToolStore } from './tool-store';

export class ToolRegistry {
  private tools = new Map<string, ITool>();
  private toolStore?: ToolStore;

  /**
   * Register a new tool
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`[ToolRegistry] Tool '${tool.name}' already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    logger.info(`[ToolRegistry] Registered tool: ${tool.name}`);
    if (this.toolStore) {
      void this.toolStore.logToolRegistered(tool.name);
    }
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): void {
    const removed = this.tools.delete(toolName);
    if (removed) {
      logger.info(`[ToolRegistry] Unregistered tool: ${toolName}`);
      if (this.toolStore) {
        void this.toolStore.logToolUnregistered(toolName);
      }
    }
  }

  /**
   * Attach a ToolStore for automatic execution logging
   */
  setToolStore(store: ToolStore): void {
    this.toolStore = store;
  }

  /**
   * Get a specific tool
   */
  get(toolName: string): ITool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * List all available tools, optionally filtered by channel
   */
  listAvailable(channel?: Channel): ITool[] {
    const allTools = Array.from(this.tools.values());

    if (!channel) {
      return allTools;
    }

    // Filter tools that have handlers for this channel or a default handler
    return allTools.filter(tool => {
      const handlerKey = `on${this.capitalizeFirst(channel)}` as keyof typeof tool.handlers;
      return tool.handlers[handlerKey] || tool.handlers.default;
    });
  }

  /**
   * Execute a tool
   */
  async execute(
    toolName: string,
    parameters: any,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in registry`);
    }

    // Get channel-specific handler or fall back to default
    const handlerKey = `on${this.capitalizeFirst(context.channel)}` as keyof typeof tool.handlers;
    const handler = tool.handlers[handlerKey] || tool.handlers.default;

    logger.info(`[ToolRegistry] Executing tool '${toolName}' on channel '${context.channel}'`);
    const startTime = Date.now();

    try {
      const result = await handler(parameters, context);
      const duration = Date.now() - startTime;

      // Persist to ToolStore (if configured)
      if (this.toolStore) {
        await this.toolStore.logExecution(toolName, parameters, result, context, duration);
      }

      return result;
    } catch (error) {
      logger.error(`[ToolRegistry] Tool execution failed:`, error instanceof Error ? error : new Error(String(error)));
      const duration = Date.now() - startTime;

      // Log error to ToolStore (if configured)
      if (this.toolStore) {
        await this.toolStore.logError(toolName, parameters, error as any, context, duration);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: {
          text: 'Sorry, I encountered an error while performing that action.'
        }
      };
    }
  }

  /**
   * Get count of registered tools
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    logger.info(`[ToolRegistry] Clearing ${this.tools.size} tools`);
    this.tools.clear();
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
