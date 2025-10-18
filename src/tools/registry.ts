/**
 * Tool Registry
 * Centralized management of AI tools/capabilities
 */

import { ITool, ExecutionContext, ToolResult } from '../types';

export class ToolRegistry {
  private tools = new Map<string, ITool>();

  /**
   * Register a new tool
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool '${tool.name}' already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): void {
    const removed = this.tools.delete(toolName);
    if (removed) {
      console.log(`[ToolRegistry] Unregistered tool: ${toolName}`);
    }
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
  listAvailable(channel?: 'call' | 'sms' | 'email'): ITool[] {
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

    console.log(`[ToolRegistry] Executing tool '${toolName}' on channel '${context.channel}'`);

    try {
      const result = await handler(parameters, context);
      return result;
    } catch (error) {
      console.error(`[ToolRegistry] Tool execution failed:`, error);
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
    console.log(`[ToolRegistry] Clearing ${this.tools.size} tools`);
    this.tools.clear();
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
