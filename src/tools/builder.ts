/**
 * Tool Builder
 * Fluent API for creating tools with channel-specific handlers
 */

import { ITool, ToolHandler, JSONSchema } from '../types';

export class ToolBuilder {
  private tool: Partial<ITool> = {
    handlers: {} as any
  };

  /**
   * Set tool name
   */
  withName(name: string): this {
    this.tool.name = name;
    return this;
  }

  /**
   * Set tool description
   */
  withDescription(description: string): this {
    this.tool.description = description;
    return this;
  }

  /**
   * Set tool parameters schema
   */
  withParameters(schema: JSONSchema): this {
    this.tool.parameters = schema;
    return this;
  }

  /**
   * Set handler for voice calls
   */
  onCall(handler: ToolHandler): this {
    this.tool.handlers!.onCall = handler;
    return this;
  }

  /**
   * Set handler for SMS
   */
  onSMS(handler: ToolHandler): this {
    this.tool.handlers!.onSMS = handler;
    return this;
  }

  /**
   * Set handler for email
   */
  onEmail(handler: ToolHandler): this {
    this.tool.handlers!.onEmail = handler;
    return this;
  }

  /**
   * Set default handler (fallback for all channels)
   */
  default(handler: ToolHandler): this {
    this.tool.handlers!.default = handler;
    return this;
  }

  /**
   * Build the tool
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
