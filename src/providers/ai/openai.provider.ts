/**
 * OpenAI Provider
 * Handles AI chat completions with tool calling support using OpenAI SDK
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { BaseConfigurableProvider } from '../configurable.provider';
import { IAIProvider } from './ai-provider.interface';
import { AIModelConfig, ChatOptions, AIResponse, ITool } from '../../types';
import { logger } from '../../utils/logger';

/**
 * OpenAI Provider - Leverages the official OpenAI SDK
 *
 * Features:
 * - Full type safety with OpenAI SDK types
 * - Function calling / tool support
 * - Streaming support (future)
 * - Automatic retry with exponential backoff
 */
export class OpenAIProvider extends BaseConfigurableProvider implements IAIProvider {
  readonly name = 'openai';
  readonly type = 'ai' as const;

  private client: OpenAI | null = null;

  constructor(config: AIModelConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    logger.info('[OpenAIProvider] Initializing with model', { model: this.currentConfig.model });

    this.client = new OpenAI({
      apiKey: this.currentConfig.apiKey,
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

    logger.info(`[OpenAIProvider] Chat request for conversation: ${options.conversationId}`);
    logger.info(`[OpenAIProvider] User message: ${options.userMessage}`);
    logger.info(`[OpenAIProvider] Available tools: ${options.availableTools?.length || 0}`);

    const messages = this.buildMessages(options);
    const tools = options.availableTools ? this.buildToolDefinitions(options.availableTools) : undefined;

    try {
      // Use OpenAI SDK with proper types
      const response = await this.client.chat.completions.create({
        model: this.currentConfig.model,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
        temperature: this.currentConfig.temperature ?? 0.7,
        max_tokens: this.currentConfig.maxTokens,
      });

      const parsedResponse = this.parseResponse(response);

      // Log AI response
      logger.info('[OpenAIProvider] AI response received', {
        conversationId: options.conversationId,
        hasToolCalls: !!parsedResponse.toolCalls && parsedResponse.toolCalls.length > 0,
        toolCallCount: parsedResponse.toolCalls?.length || 0,
        contentLength: parsedResponse.content.length,
        contentPreview: parsedResponse.content.substring(0, 150) + (parsedResponse.content.length > 150 ? '...' : ''),
        finishReason: parsedResponse.finishReason
      });

      return parsedResponse;
    } catch (error) {
      logger.error('[OpenAIProvider] Chat error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Build messages array with proper OpenAI SDK types
   *
   * OpenAI best practice: Use a single system message at the start,
   * followed by user/assistant conversation history.
   * We merge context messages into the main system prompt.
   */
  private buildMessages(options: ChatOptions): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // Build comprehensive system message
    let systemContent = options.systemPrompt || '';

    // Extract context from conversation history (system role messages)
    const contextMessages: string[] = [];
    const conversationMessages: ChatCompletionMessageParam[] = [];

    if (options.conversationHistory) {
      for (const msg of options.conversationHistory) {
        if (msg.role === 'system') {
          // Collect system/context messages
          contextMessages.push(msg.content);
        } else if (msg.role === 'user' || msg.role === 'assistant') {
          // Keep user/assistant conversation
          conversationMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Merge context into system prompt
    if (contextMessages.length > 0) {
      systemContent += '\n\n# RELEVANT CONTEXT\n' + contextMessages.join('\n\n');
    }

    // Add single comprehensive system message
    if (systemContent) {
      messages.push({
        role: 'system',
        content: systemContent
      });
    }

    // Add conversation history (user/assistant only)
    messages.push(...conversationMessages);

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
          parameters: tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
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
      logger.error('[OpenAIProvider] Health check failed:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async dispose(): Promise<void> {
    logger.info('[OpenAIProvider] Disposing');
    this.client = null;
    this.initialized = false;
  }

  /**
   * Validate OpenAI configuration
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
      if (!config.apiKey.startsWith('sk-')) {
        return { valid: false, error: 'Invalid OpenAI API key format (should start with "sk-")' };
      }

      // Validate model name
      if (typeof config.model !== 'string' || config.model.trim().length === 0) {
        return { valid: false, error: 'Model name must be a non-empty string' };
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
   * Get default OpenAI configuration
   */
  protected getDefaultConfig(): any {
    return {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000
    };
  }

  /**
   * Update model at runtime
   */
  async setModel(model: string): Promise<void> {
    if (!model || typeof model !== 'string') {
      throw new Error('Model name must be a non-empty string');
    }

    const newConfig = { ...this.currentConfig, model };
    await this.updateConfig(newConfig);
    
    logger.info(`[OpenAIProvider] Model updated to: ${model}`);
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
    
    logger.info('[OpenAIProvider] API key updated');
  }

  /**
   * Get the current model
   */
  getCurrentModel(): string {
    return this.currentConfig.model;
  }

  /**
   * Validate if a model is available (OpenAI models)
   */
  async validateModel(model: string): Promise<boolean> {
    // OpenAI has a limited set of models, check against known models
    const validModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4-1106-preview',
      'gpt-4-0125-preview'
    ];
    
    return validModels.includes(model);
  }

  /**
   * List available OpenAI models
   */
  async listAvailableModels(): Promise<Array<{ id: string; name: string; provider: string }>> {
    return [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview', provider: 'openai' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', provider: 'openai' },
      { id: 'gpt-4-1106-preview', name: 'GPT-4 1106 Preview', provider: 'openai' },
      { id: 'gpt-4-0125-preview', name: 'GPT-4 0125 Preview', provider: 'openai' }
    ];
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
