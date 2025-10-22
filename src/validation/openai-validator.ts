/**
 * OpenAI Credential Validator
 * Validates OpenAI and OpenRouter API credentials using Strategy Pattern
 */

import type { IProvider, AIModelConfig } from '../types';
import type { ICredentialValidator, ValidationResult } from './credential-validator.interface';
import { logger } from '../utils/logger';

/**
 * Validator for OpenAI and OpenRouter AI provider credentials
 * Implements ICredentialValidator strategy
 *
 * Validates:
 * - API key format (starts with 'sk-' for OpenAI, 'sk-or-' for OpenRouter)
 * - Model name presence
 * - API connectivity via health check
 *
 * @example
 * ```typescript
 * const validator = new OpenAIValidator();
 *
 * // Format validation
 * const formatResult = validator.validateFormat(config);
 * if (!formatResult.valid) {
 *   console.error(formatResult.error);
 * }
 *
 * // Connection validation
 * const provider = new OpenAIProvider(config);
 * await provider.initialize();
 * const connResult = await validator.validateConnection(provider);
 * ```
 */
export class OpenAIValidator implements ICredentialValidator {
  /**
   * Validate AI provider credential format
   * Checks structure without making API calls
   */
  validateFormat(config: AIModelConfig): ValidationResult {
    // Check required fields
    if (!config.apiKey) {
      return {
        valid: false,
        error: 'Missing API key for AI provider',
        details: { provider: config.provider }
      };
    }

    if (!config.model) {
      return {
        valid: false,
        error: 'Missing model name for AI provider',
        details: { provider: config.provider }
      };
    }

    // Validate API key format based on provider
    const formatResult = this.validateApiKeyFormat(config.provider, config.apiKey);
    if (!formatResult.valid) {
      return formatResult;
    }

    // Validate model name is not empty
    if (config.model.trim().length === 0) {
      return {
        valid: false,
        error: 'Model name cannot be empty',
        details: { provider: config.provider }
      };
    }

    logger.info(`[OpenAIValidator] Format validation passed for ${config.provider}`);
    return { valid: true };
  }

  /**
   * Validate API key format based on provider type
   */
  private validateApiKeyFormat(provider: string, apiKey: string): ValidationResult {
    switch (provider) {
      case 'openai':
        // OpenAI keys start with 'sk-' or 'sk-proj-' (project keys)
        if (!apiKey.startsWith('sk-')) {
          return {
            valid: false,
            error: 'Invalid OpenAI API key format (should start with "sk-" or "sk-proj-")',
            details: { keyPrefix: apiKey.substring(0, 3) }
          };
        }

        // OpenAI keys are typically 48+ characters
        if (apiKey.length < 20) {
          return {
            valid: false,
            error: 'OpenAI API key appears too short',
            details: { length: apiKey.length }
          };
        }
        break;

      case 'openrouter':
        // OpenRouter keys start with 'sk-or-'
        if (!apiKey.startsWith('sk-or-')) {
          return {
            valid: false,
            error: 'Invalid OpenRouter API key format (should start with "sk-or-")',
            details: { keyPrefix: apiKey.substring(0, 6) }
          };
        }
        break;

      case 'anthropic':
        // Anthropic keys start with 'sk-ant-'
        if (!apiKey.startsWith('sk-ant-')) {
          return {
            valid: false,
            error: 'Invalid Anthropic API key format (should start with "sk-ant-")',
            details: { keyPrefix: apiKey.substring(0, 7) }
          };
        }
        break;

      case 'google':
        // Google AI keys vary in format, just check it's not empty
        if (apiKey.length < 10) {
          return {
            valid: false,
            error: 'Google AI API key appears too short',
            details: { length: apiKey.length }
          };
        }
        break;

      default:
        logger.warn(`[OpenAIValidator] Unknown provider type: ${provider}, skipping format validation`);
    }

    return { valid: true };
  }

  /**
   * Validate AI provider credentials by testing API connectivity
   * Makes a lightweight API call to verify credentials work
   */
  async validateConnection(provider: IProvider): Promise<ValidationResult> {
    try {
      logger.info(`[OpenAIValidator] Testing ${provider.name} API connection`);

      // Use provider's health check to verify credentials
      const isHealthy = await provider.healthCheck();

      if (!isHealthy) {
        return {
          valid: false,
          error: `${provider.name} credentials are invalid or API quota exceeded. Please verify your API key.`,
          details: {
            providerName: provider.name,
            healthCheckFailed: true
          }
        };
      }

      logger.info(`[OpenAIValidator] Connection validation passed for ${provider.name}`);
      return { valid: true };
    } catch (error) {
      logger.error(`[OpenAIValidator] Connection validation failed for ${provider.name}:`, error instanceof Error ? error : new Error(String(error)));

      return {
        valid: false,
        error: this.parseErrorMessage(provider.name, error),
        details: {
          originalError: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      };
    }
  }

  /**
   * Parse error message into user-friendly format
   */
  private parseErrorMessage(providerName: string, error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Authentication errors
      if (message.includes('unauthorized') || message.includes('401')) {
        return `${providerName} authentication failed. Please verify your API key.`;
      }

      // Invalid API key
      if (message.includes('invalid') && message.includes('api key')) {
        return `Invalid ${providerName} API key. Please check your credentials.`;
      }

      // Rate limiting / quota
      if (message.includes('rate limit') || message.includes('429')) {
        return `${providerName} rate limit exceeded. Please try again later or upgrade your plan.`;
      }

      if (message.includes('quota') || message.includes('insufficient')) {
        return `${providerName} quota exceeded. Please check your billing and usage limits.`;
      }

      // Network errors
      if (message.includes('network') || message.includes('enotfound')) {
        return `Network error connecting to ${providerName} API. Please check your internet connection.`;
      }

      if (message.includes('timeout')) {
        return `${providerName} API request timed out. Please try again.`;
      }

      // Service errors
      if (message.includes('503') || message.includes('service unavailable')) {
        return `${providerName} service is temporarily unavailable. Please try again later.`;
      }

      return error.message;
    }

    return `Unknown error validating ${providerName} credentials`;
  }
}
