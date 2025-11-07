/**
 * Tool Builder
 * Fluent API for creating tools with channel-specific handlers
 * 
 * The ToolBuilder provides a chainable interface for constructing tools.
 * Tools can have channel-specific handlers (call, SMS, email, text) or use a default handler.
 * 
 * @example
 * ```typescript
 * const tool = new ToolBuilder()
 *   .withName('send_notification')
 *   .withDescription('Send a notification to the user')
 *   .withParameters({
 *     type: 'object',
 *     properties: {
 *       message: { type: 'string' }
 *     },
 *     required: ['message']
 *   })
 *   .onCall(async (params, ctx) => {
 *     // Voice-specific implementation
 *     return { success: true, response: { speak: params.message } };
 *   })
 *   .default(async (params, ctx) => {
 *     // Default implementation for other channels
 *     return { success: true, response: { text: params.message } };
 *   })
 *   .build();
 * ```
 */

import { ITool, ToolHandler, JSONSchema } from '../types';

/**
 * Tool Builder
 * Fluent API for creating tools with channel-specific handlers
 */
export class ToolBuilder {
  private tool: Partial<ITool> = {
    handlers: {} as any
  };

  /**
   * Set the tool name
   * 
   * @param name - Unique name for the tool (e.g., 'send_email', 'calculate')
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.withName('my_tool');
   * ```
   */
  withName(name: string): this {
    this.tool.name = name;
    return this;
  }

  /**
   * Set the tool description
   * 
   * This description is used by the AI to understand when to call the tool.
   * Should be clear and concise.
   * 
   * @param description - Human-readable description of what the tool does
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.withDescription('Sends an email message to the specified recipient');
   * ```
   */
  withDescription(description: string): this {
    this.tool.description = description;
    return this;
  }

  /**
   * Set the tool parameters schema (JSONSchema)
   * 
   * Defines the expected parameters for the tool. The AI will use this schema
   * to generate appropriate parameter values when calling the tool.
   * 
   * @param schema - JSONSchema definition for tool parameters
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.withParameters({
   *   type: 'object',
   *   properties: {
   *     email: { type: 'string', format: 'email' },
   *     subject: { type: 'string' }
   *   },
   *   required: ['email', 'subject']
   * });
   * ```
   */
  withParameters(schema: JSONSchema): this {
    this.tool.parameters = schema;
    return this;
  }

  /**
   * Set handler for voice call channel
   * 
   * This handler is used when the tool is called during a voice conversation.
   * The response should include a 'speak' field for text-to-speech.
   * 
   * @param handler - Async function that handles tool execution for voice calls
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.onCall(async (params, ctx) => {
   *   return {
   *     success: true,
   *     response: { speak: 'Email sent successfully' }
   *   };
   * });
   * ```
   */
  onCall(handler: ToolHandler): this {
    this.tool.handlers!.onCall = handler;
    return this;
  }

  /**
   * Set handler for SMS channel
   * 
   * This handler is used when the tool is called during an SMS conversation.
   * The response should include a 'message' field for SMS text.
   * 
   * @param handler - Async function that handles tool execution for SMS
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.onSMS(async (params, ctx) => {
   *   return {
   *     success: true,
   *     response: { message: '✓ Email sent' }
   *   };
   * });
   * ```
   */
  onSMS(handler: ToolHandler): this {
    this.tool.handlers!.onSMS = handler;
    return this;
  }

  /**
   * Set handler for email channel
   * 
   * This handler is used when the tool is called during an email conversation.
   * The response should include 'text' and optionally 'html' fields.
   * 
   * @param handler - Async function that handles tool execution for email
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```typescript
   * builder.onEmail(async (params, ctx) => {
   *   return {
   *     success: true,
   *     response: {
   *       text: 'Email sent',
   *       html: '<p>Email sent</p>'
   *     }
   *   };
   * });
   * ```
   */
  onEmail(handler: ToolHandler): this {
    this.tool.handlers!.onEmail = handler;
    return this;
  }

  /**
   * Set handler for text channel
   * 
   * This handler is used when the tool is called during a text-based conversation.
   * The response should include a 'text' field.
   * 
   * @param handler - Async function that handles tool execution for text
   * @returns The builder instance for method chaining
   */
  onText(handler: ToolHandler): this {
    this.tool.handlers!.onText = handler;
    return this;
  }

  /**
   * Set default handler (fallback for all channels)
   * 
   * The default handler is used when:
   * - No channel-specific handler is defined for the current channel
   * - The channel-specific handler is not available
   * 
   * **Required:** Every tool must have a default handler.
   * 
   * @param handler - Async function that handles tool execution
   * @returns The builder instance for method chaining
   * @throws Error if handler is not provided
   * 
   * @example
   * ```typescript
   * builder.default(async (params, ctx) => {
   *   return {
   *     success: true,
   *     response: { text: 'Operation completed' }
   *   };
   * });
   * ```
   */
  default(handler: ToolHandler): this {
    this.tool.handlers!.default = handler;
    return this;
  }

  /**
   * Build and validate the tool
   * 
   * Validates that all required fields are set and returns the completed tool.
   * 
   * @returns The built ITool instance
   * @throws Error if required fields are missing (name, description, parameters, or default handler)
   * 
   * @example
   * ```typescript
   * const tool = builder
   *   .withName('my_tool')
   *   .withDescription('Does something')
   *   .withParameters({ type: 'object', properties: {} })
   *   .default(async () => ({ success: true, response: { text: 'Done' } }))
   *   .build();
   * ```
   */
  build(): ITool {
    // Validation
    if (!this.tool.name) {
      throw new Error('Tool must have a name');
    }
    if (!this.tool.description) {
      throw new Error('Tool must have a description');
    }
    if (!this.tool.parameters) {
      throw new Error('Tool must have parameters schema');
    }
    if (!this.tool.handlers!.default) {
      throw new Error('Tool must have a default handler');
    }

    return this.tool as ITool;
  }
}
