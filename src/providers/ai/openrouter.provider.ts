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
import { BaseConfigurableProvider } from '../configurable.provider';
import { IAIProvider } from './ai-provider.interface';
import { AIModelConfig, ChatOptions, AIResponse, ITool } from '../../types';
import { logger } from '../../utils/logger';

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
/**
 * Popular OpenRouter models organized by provider
 */
export const OPENROUTER_MODELS = {
  openai: {
    gpt4Turbo: 'openai/gpt-4-turbo',
    gpt4: 'openai/gpt-4',
    gpt35Turbo: 'openai/gpt-3.5-turbo',
  },
  anthropic: {
    claude3Opus: 'anthropic/claude-3-opus',
    claude3Sonnet: 'anthropic/claude-3-sonnet',
    claude3Haiku: 'anthropic/claude-3-haiku',
    claude35Sonnet: 'anthropic/claude-3.5-sonnet',
  },
  google: {
    geminiPro: 'google/gemini-pro',
    geminiPro15: 'google/gemini-pro-1.5',
  },
  meta: {
    llama3_70b: 'meta-llama/llama-3-70b-instruct',
    llama3_8b: 'meta-llama/llama-3-8b-instruct',
  },
  mistral: {
    mistralLarge: 'mistralai/mistral-large',
    mistralMedium: 'mistralai/mistral-medium',
    mixtral: 'mistralai/mixtral-8x7b-instruct',
  },
} as const;

export class OpenRouterProvider extends BaseConfigurableProvider implements IAIProvider {
  readonly name = 'openrouter';
  readonly type = 'ai' as const;

  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  private static readonly DEFAULT_REFERER = 'https://localhost:3000';
  private static readonly SDK_TITLE = 'AI Receptionist SDK';

  private client: OpenAI | null = null;
  private currentModel: string;

  constructor(config: AIModelConfig) {
    super(config);
    this.currentModel = config.model;
  }

  async initialize(): Promise<void> {
    logger.info('[OpenRouterProvider] Initializing with model', { model: this.currentConfig.model });

    // OpenRouter uses OpenAI-compatible API with custom base URL
    this.client = new OpenAI({
      apiKey: this.currentConfig.apiKey,
      baseURL: OpenRouterProvider.BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || OpenRouterProvider.DEFAULT_REFERER,
        'X-Title': OpenRouterProvider.SDK_TITLE,
      },
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });

    this.initialized = true;
    logger.info('[OpenRouterProvider] Initialized successfully');
  }

  /**
   * Switch to a different model at runtime
   * @param model - The model identifier (e.g., 'anthropic/claude-3-opus', 'google/gemini-pro')
   * @throws Error if model identifier is invalid
   */
  async setModel(model: string): Promise<void> {
    if (!model || typeof model !== 'string') {
      throw new Error('Model identifier must be a non-empty string');
    }

    if (!model.includes('/')) {
      throw new Error(
        'Invalid model identifier format. Expected format: "provider/model-name" (e.g., "anthropic/claude-3-opus")'
      );
    }

    logger.info(`[OpenRouterProvider] Switching model from ${this.currentModel} to ${model}`);
    this.currentModel = model;
  }

  /**
   * Validate if a model is available on OpenRouter
   * @param model - The model identifier to validate
   * @returns True if the model is available, false otherwise
   */
  async validateModel(model: string): Promise<boolean> {
    try {
      const availableModels = await this.listAvailableModels();
      return availableModels.some(m => m.id === model);
    } catch (error) {
      logger.error('[OpenRouterProvider] Model validation failed:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get the currently active model
   */
  getCurrentModel(): string {
    return this.currentModel;
  }

  /**
   * List available models from OpenRouter
   * @returns Array of available model objects
   */
  async listAvailableModels(): Promise<Array<{ id: string; name: string; provider: string }>> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('OpenRouter client not initialized');
    }

    try {
      const response = await this.client.models.list();
      return response.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: model.id.split('/')[0] || 'unknown',
      }));
    } catch (error) {
      logger.error('[OpenRouterProvider] Failed to list models:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    this.ensureInitialized();

    if (!this.client) {
      throw new Error('OpenRouter client not initialized');
    }

    logger.info(`[OpenRouterProvider] Chat request for conversation: ${options.conversationId}`);
    logger.info(`[OpenRouterProvider] Model: ${this.currentModel}`);
    logger.info(`[OpenRouterProvider] User message: ${options.userMessage}`);
    logger.info(`[OpenRouterProvider] Available tools: ${options.availableTools?.length || 0}`);

    const messages = this.buildMessages(options);
    const tools = options.availableTools ? this.buildToolDefinitions(options.availableTools) : undefined;

    try {
      // OpenRouter supports OpenAI-compatible function calling
      const response = await this.client.chat.completions.create({
        model: this.currentModel,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        temperature: this.currentConfig.temperature ?? 0.7,
        max_tokens: this.currentConfig.maxTokens,
      });

      return this.parseResponse(response);
    } catch (error) {
      logger.error('[OpenRouterProvider] Chat error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Build messages array with proper OpenAI SDK types
   */
  private buildMessages(options: ChatOptions): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // System message (if provided)
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

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
      logger.error('[OpenRouterProvider] Health check failed:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async dispose(): Promise<void> {
    logger.info('[OpenRouterProvider] Disposing');
    this.client = null;
    this.initialized = false;
  }

  /**
   * Validate OpenRouter configuration
   */
  async validateConfig(config: any): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check required fields
      if (!config.apiKey) {
        return { valid: false, error: 'Missing API key' };
      }

      if (!config.model) {
        return { valid: false, error: 'Missing model name' };
      }

      // Validate API key format
      if (!config.apiKey.startsWith('sk-or-')) {
        return { valid: false, error: 'Invalid OpenRouter API key format (should start with "sk-or-")' };
      }

      // Validate model format
      if (!config.model.includes('/')) {
        return { 
          valid: false, 
          error: 'Invalid model format. Expected format: "provider/model-name" (e.g., "anthropic/claude-3-opus")' 
        };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Get default OpenRouter configuration
   */
  protected getDefaultConfig(): any {
    return {
      provider: 'openrouter',
      apiKey: '',
      model: 'anthropic/claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 2000
    };
  }

  /**
   * Update API key at runtime
   */
  async setApiKey(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }

    const newConfig = { ...this.currentConfig, apiKey };
    await this.updateConfig(newConfig);
    
    logger.info('[OpenRouterProvider] API key updated');
  }

  /**
   * Get model information
   */
  async getModelInfo(model: string): Promise<{ id: string; name: string; provider: string; capabilities?: string[] } | null> {
    const models = await this.listAvailableModels();
    const modelInfo = models.find(m => m.id === model);
    
    if (modelInfo) {
      return {
        ...modelInfo,
        capabilities: ['chat', 'function_calling', 'json_mode']
      };
    }
    
    return null;
  }
}
