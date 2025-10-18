/**
 * OpenRouter Provider
 * Provides access to multiple AI models through OpenRouter's unified API
 *
 * Supported Models:
 * - OpenAI: GPT-4, GPT-4 Turbo, GPT-3.5
 * - Anthropic: Claude 3 Opus, Sonnet, Haiku
 * - Google: Gemini Pro
 * - Meta: Llama 2, Llama 3
 * - Mistral: Mistral Large, Medium, Small
 * - And many more...
 *
 * OpenRouter uses OpenAI-compatible API, so we leverage the OpenAI SDK
 * with a custom base URL.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { BaseProvider } from '../base.provider';
import { AIModelConfig, AgentConfig, ChatOptions, AIResponse, ITool } from '../../types';

/**
 * OpenRouter Provider - Multi-model AI access through unified API
 *
 * Features:
 * - Access to 100+ AI models through single API
 * - OpenAI-compatible interface
 * - Automatic fallback and load balancing
 * - Cost optimization
 * - Full type safety
 */
export class OpenRouterProvider extends BaseProvider {
  readonly name = 'openrouter';
  readonly type = 'ai' as const;

  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  private static readonly DEFAULT_REFERER = 'https://localhost:3000';
  private static readonly SDK_TITLE = 'AI Receptionist SDK';

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
    console.log('[OpenRouterProvider] Initializing with model:', this.config.model);

    // OpenRouter uses OpenAI-compatible API with custom base URL
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: OpenRouterProvider.BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || OpenRouterProvider.DEFAULT_REFERER,
        'X-Title': OpenRouterProvider.SDK_TITLE,
      },
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });

    this.initialized = true;
    console.log('[OpenRouterProvider] Initialized successfully');
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('OpenRouter client not initialized');
    }

    console.log(`[OpenRouterProvider] Chat request for conversation: ${options.conversationId}`);
    console.log(`[OpenRouterProvider] Model: ${this.config.model}`);
    console.log(`[OpenRouterProvider] User message: ${options.userMessage}`);
    console.log(`[OpenRouterProvider] Available tools: ${options.availableTools?.length || 0}`);

    const messages = this.buildMessages(options);
    const tools = options.availableTools ? this.buildToolDefinitions(options.availableTools) : undefined;

    try {
      // OpenRouter supports OpenAI-compatible function calling
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens,
      });

      return this.parseResponse(response);
    } catch (error) {
      console.error('[OpenRouterProvider] Chat error:', error);
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
   * Parse OpenRouter response into SDK response format
   */
  private parseResponse(response: OpenAI.Chat.Completions.ChatCompletion): AIResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response choices from OpenRouter');
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
   * Map OpenRouter finish reasons to SDK finish reasons
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
      // Simple health check - list available models
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('[OpenRouterProvider] Health check failed:', error);
      return false;
    }
  }

  async dispose(): Promise<void> {
    console.log('[OpenRouterProvider] Disposing');
    this.client = null;
    this.initialized = false;
  }
}
