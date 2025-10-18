/**
 * OpenAI Provider
 * Handles AI chat completions with tool calling support using OpenAI SDK
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { BaseProvider } from '../base.provider';
import { AIModelConfig, AgentConfig, ChatOptions, AIResponse, ITool } from '../../types';

/**
 * OpenAI Provider - Leverages the official OpenAI SDK
 *
 * Features:
 * - Full type safety with OpenAI SDK types
 * - Function calling / tool support
 * - Streaming support (future)
 * - Automatic retry with exponential backoff
 */
export class OpenAIProvider extends BaseProvider {
  readonly name = 'openai';
  readonly type = 'ai' as const;

  private client: OpenAI | null = null;
  private readonly agentConfig: AgentConfig;

  constructor(
    private readonly config: AIModelConfig,
    agentConfig: AgentConfig
  ) {
    super();
    this.agentConfig = agentConfig;
  }

  async initialize(): Promise<void> {
    console.log('[OpenAIProvider] Initializing with model:', this.config.model);

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });

    this.initialized = true;
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    console.log(`[OpenAIProvider] Chat request for conversation: ${options.conversationId}`);
    console.log(`[OpenAIProvider] User message: ${options.userMessage}`);
    console.log(`[OpenAIProvider] Available tools: ${options.availableTools?.length || 0}`);

    const messages = this.buildMessages(options);
    const tools = options.availableTools ? this.buildToolDefinitions(options.availableTools) : undefined;

    try {
      // Use OpenAI SDK with proper types
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens,
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error('[OpenAIProvider] Chat error:', error);
      throw error;
    }
  }

  /**
   * Build messages array with proper OpenAI SDK types
   */
  private buildMessages(options: ChatOptions): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // System message with agent personality
    messages.push({
      role: 'system',
      content: this.agentConfig.systemPrompt ||
        `You are ${this.agentConfig.name}, a ${this.agentConfig.role}. ${this.agentConfig.personality || ''}\n\n${this.agentConfig.instructions || ''}`
    });

    // Conversation history
    if (options.conversationHistory) {
      for (const msg of options.conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Current user message
    messages.push({
      role: 'user',
      content: options.userMessage
    });

    return messages;
  }

  /**
   * Build tool definitions with proper OpenAI SDK types
   */
  private buildToolDefinitions(tools: ITool[]): ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Parse OpenAI response into SDK response format
   */
  private parseResponse(response: OpenAI.Chat.Completions.ChatCompletion): AIResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response choices from OpenAI');
    }

    const message = choice.message;

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        content: message.content || '',
        toolCalls: message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments)
        })),
        finishReason: 'tool_calls'
      };
    }

    // Regular message
    return {
      content: message.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason)
    };
  }

  /**
   * Map OpenAI finish reasons to SDK finish reasons
   */
  private mapFinishReason(reason: string | null): 'stop' | 'tool_calls' | 'length' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      default:
        return 'stop';
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.client) return false;

    try {
      // Simple health check - list models
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('[OpenAIProvider] Health check failed:', error);
      return false;
    }
  }

  async dispose(): Promise<void> {
    console.log('[OpenAIProvider] Disposing');
    this.client = null;
    this.initialized = false;
  }
}
