/**
 * AI Provider Interface
 * Defines the common interface for all AI providers (OpenAI, OpenRouter, etc.)
 */

import { IConfigurableProvider } from '../../base/configurable-provider';
import { ChatOptions, AIResponse } from '../../../types';

/**
 * Common interface for all AI providers
 * Ensures consistent API across OpenAI, OpenRouter, and future AI providers
 */
export interface IAIProvider extends IConfigurableProvider {
  /**
   * Send a chat completion request
   * @param options - Chat options including message, conversation history, tools, etc.
   * @returns Promise resolving to AI response
   */
  chat(options: ChatOptions): Promise<AIResponse>;

  /**
   * Set the AI model at runtime
   * @param model - Model identifier (provider-specific format)
   * @throws Error if model is invalid or not supported
   */
  setModel(model: string): Promise<void>;

  /**
   * Get the current model
   * @returns Current model identifier
   */
  getCurrentModel(): string;

  /**
   * Set the API key at runtime
   * @param apiKey - New API key
   * @throws Error if API key is invalid
   */
  setApiKey(apiKey: string): Promise<void>;

  /**
   * Validate if a model is available/supported
   * @param model - Model identifier to validate
   * @returns True if model is available, false otherwise
   */
  validateModel(model: string): Promise<boolean>;

  /**
   * List available models (if supported by provider)
   * @returns Array of available model objects
   */
  listAvailableModels(): Promise<Array<{ id: string; name: string; provider: string }>>;

  /**
   * Get model information
   * @param model - Model identifier
   * @returns Model information object
   */
  getModelInfo(model: string): Promise<{ id: string; name: string; provider: string; capabilities?: string[] } | null>;
}
