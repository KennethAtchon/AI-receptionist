/**
 * Tool Registry
 * Centralized management of AI tools/capabilities
 * 
 * The ToolRegistry is responsible for:
 * - Registering and managing tool instances
 * - Validating tool parameters against JSONSchema
 * - Executing tools with timeout protection
 * - Logging tool executions via ToolStore
 * 
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 * registry.register(myTool);
 * const result = await registry.execute('my_tool', { param: 'value' }, context);
 * ```
 */

import { ITool, ExecutionContext, ToolResult, Channel } from '../types';
import { logger } from '../utils/logger';
import { validateParameters } from '../utils/schema-validator';
import { sanitizeErrorMessage } from '../utils/error-sanitizer';
import { ToolStore } from './tool-store';

export interface ToolRegistryConfig {
  /**
   * Default timeout for tool execution in milliseconds
   * @default 30000 (30 seconds)
   */
  defaultTimeout?: number;
  
  /**
   * Whether to validate parameters against JSONSchema before execution
   * @default true
   */
  validateParameters?: boolean;
}

/**
 * Tool Registry
 * Centralized management of AI tools/capabilities
 */
export class ToolRegistry {
  private tools = new Map<string, ITool>();
  private toolStore?: ToolStore;
  private config: Required<ToolRegistryConfig>;

  /**
   * Create a new ToolRegistry instance
   * @param config - Optional configuration for the registry
   */
  constructor(config: ToolRegistryConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout ?? 30000,
      validateParameters: config.validateParameters ?? true
    };
  }

  /**
   * Register a new tool
   * 
   * If a tool with the same name already exists, it will be overwritten with a warning.
   * 
   * @param tool - The tool to register
   * @throws Error if tool is invalid (missing name, description, or handlers)
   * 
   * @example
   * ```typescript
   * registry.register({
   *   name: 'my_tool',
   *   description: 'Does something',
   *   parameters: { type: 'object', properties: {} },
   *   handlers: { default: async (params, ctx) => ({ success: true, response: { text: 'Done' } }) }
   * });
   * ```
   */
  register(tool: ITool): void {
    // Validate tool structure
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }
    if (!tool.description) {
      throw new Error('Tool must have a description');
    }
    if (!tool.handlers || !tool.handlers.default) {
      throw new Error('Tool must have a default handler');
    }

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
   * 
   * @param toolName - Name of the tool to unregister
   * @returns true if tool was found and removed, false otherwise
   * 
   * @example
   * ```typescript
   * const removed = registry.unregister('my_tool');
   * ```
   */
  unregister(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      logger.info(`[ToolRegistry] Unregistered tool: ${toolName}`);
      if (this.toolStore) {
        void this.toolStore.logToolUnregistered(toolName);
      }
    }
    return removed;
  }

  /**
   * Attach a ToolStore for automatic execution logging
   * 
   * @param store - The ToolStore instance to use for logging
   * 
   * @example
   * ```typescript
   * const toolStore = new ToolStore(agent);
   * registry.setToolStore(toolStore);
   * ```
   */
  setToolStore(store: ToolStore): void {
    this.toolStore = store;
  }

  /**
   * Get a specific tool by name
   * 
   * @param toolName - Name of the tool to retrieve
   * @returns The tool if found, undefined otherwise
   * 
   * @example
   * ```typescript
   * const tool = registry.get('my_tool');
   * if (tool) {
   *   console.log(tool.description);
   * }
   * ```
   */
  get(toolName: string): ITool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * List all available tools, optionally filtered by channel
   * 
   * @param channel - Optional channel to filter by (call, sms, email, text)
   * @returns Array of tools available for the specified channel, or all tools if no channel specified
   * 
   * @example
   * ```typescript
   * // Get all tools
   * const allTools = registry.listAvailable();
   * 
   * // Get tools available for voice calls
   * const callTools = registry.listAvailable('call');
   * ```
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
   * Execute a tool with parameter validation and timeout protection
   * 
   * @param toolName - Name of the tool to execute
   * @param parameters - Parameters to pass to the tool
   * @param context - Execution context (channel, conversationId, etc.)
   * @param timeoutMs - Optional timeout in milliseconds (overrides default)
   * @returns ToolResult with success status, data, and response
   * @throws Error if tool not found, context invalid, or validation fails
   * 
   * @example
   * ```typescript
   * const result = await registry.execute(
   *   'send_email',
   *   { to: 'user@example.com', subject: 'Hello', body: 'World' },
   *   { channel: 'email', conversationId: 'conv-123' }
   * );
   * 
   * if (result.success) {
   *   console.log('Email sent:', result.data.messageId);
   * } else {
   *   console.error('Error:', result.error);
   * }
   * ```
   */
  async execute<T = any>(
    toolName: string,
    parameters: any,
    context: ExecutionContext,
    timeoutMs?: number
  ): Promise<ToolResult<T>> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      const error = `Tool '${toolName}' not found in registry`;
      logger.error(`[ToolRegistry] ${error}`);
      throw new Error(error);
    }

    // Validate execution context
    if (!context.channel) {
      const error = 'Execution context must have a channel property';
      logger.error(`[ToolRegistry] ${error}`);
      throw new Error(error);
    }

    // Validate parameters against JSONSchema if enabled
    if (this.config.validateParameters && tool.parameters) {
      const validation = validateParameters(tool.parameters, parameters);
      if (!validation.valid) {
        const error = `Invalid parameters for tool '${toolName}': ${validation.errors.join(', ')}`;
        logger.error(`[ToolRegistry] ${error}`, { parameters, errors: validation.errors });
        throw new Error(error);
      }
    }

    // Get channel-specific handler or fall back to default
    const handlerKey = `on${this.capitalizeFirst(context.channel)}` as keyof typeof tool.handlers;
    const handler = tool.handlers[handlerKey] || tool.handlers.default;

    if (!handler) {
      const error = `No handler available for tool '${toolName}' on channel '${context.channel}'`;
      logger.error(`[ToolRegistry] ${error}`);
      throw new Error(error);
    }

    logger.info(`[ToolRegistry] Executing tool '${toolName}' on channel '${context.channel}'`);
    const startTime = Date.now();
    const timeout = timeoutMs ?? this.config.defaultTimeout;

    try {
      // Execute with timeout
      const result = await Promise.race([
        handler(parameters, context),
        new Promise<ToolResult<T>>((_, reject) => 
          setTimeout(() => reject(new Error(`Tool execution timeout after ${timeout}ms`)), timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      // Persist to ToolStore (if configured)
      if (this.toolStore) {
        await this.toolStore.logExecution(toolName, parameters, result, context, duration);
      }

      logger.info(`[ToolRegistry] Tool '${toolName}' executed successfully in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const sanitizedError = sanitizeErrorMessage(errorMessage);
      
      logger.error(`[ToolRegistry] Tool '${toolName}' execution failed: ${sanitizedError}`, 
        error instanceof Error ? error : new Error(String(error)), 
        { toolName, parameters, errorMessage, errorStack, duration }
      );

      // Log error to ToolStore (if configured)
      if (this.toolStore) {
        await this.toolStore.logError(toolName, parameters, error as any, context, duration);
      }

      return {
        success: false,
        error: sanitizedError,
        response: {
          text: `Sorry, I encountered an error while performing that action. Please try again.`
        }
      };
    }
  }

  /**
   * Get count of registered tools
   * 
   * @returns Number of registered tools
   * 
   * @example
   * ```typescript
   * const count = registry.count();
   * console.log(`Registered ${count} tools`);
   * ```
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools
   * 
   * @example
   * ```typescript
   * registry.clear();
   * console.log(registry.count()); // 0
   * ```
   */
  clear(): void {
    logger.info(`[ToolRegistry] Clearing ${this.tools.size} tools`);
    this.tools.clear();
  }

  /**
   * Capitalize first letter of a string
   * @private
   */
  private capitalizeFirst(str: string | undefined): string {
    if (!str) {
      return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
