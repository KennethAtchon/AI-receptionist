/**
 * Base AI Provider
 * Common base class for all AI providers
 */

import { BaseConfigurableProvider } from '../../../base/configurable-provider';
import type { IAIProvider } from '../ai-provider.interface';
import type { ChatOptions, AIResponse } from '../../../../types';

/**
 * Base class for all AI providers
 * Provides common functionality and type safety
 */
export abstract class BaseAIProvider extends BaseConfigurableProvider implements IAIProvider {
  readonly type = 'ai' as const;

  /**
   * Send a chat completion request
   */
  abstract chat(options: ChatOptions): Promise<AIResponse>;

  /**
   * Set the AI model at runtime
   */
  abstract setModel(model: string): Promise<void>;

  /**
   * Get the current model
   */
  abstract getCurrentModel(): string;

  /**
   * Set the API key at runtime
   */
  abstract setApiKey(apiKey: string): Promise<void>;

  /**
   * Validate if a model is available/supported
   */
  abstract validateModel(model: string): Promise<boolean>;

  /**
   * List available models (if supported by provider)
   */
  abstract listAvailableModels(): Promise<Array<{ id: string; name: string; provider: string }>>;

  /**
   * Get model information
   */
  abstract getModelInfo(model: string): Promise<{ id: string; name: string; provider: string; capabilities?: string[] } | null>;
}

