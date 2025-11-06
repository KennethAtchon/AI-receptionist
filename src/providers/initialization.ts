/**
 * Provider Initialization Module
 * Handles registration and validation of all providers using metadata system
 * 
 * This module provides the main entry point for provider initialization.
 * It uses the ProviderLoader to auto-discover and register providers based
 * on the PROVIDER_REGISTRY metadata, then validates all registered providers.
 * 
 * @module providers/initialization
 */

import { ProviderRegistry } from './core/provider-registry';
import { PROVIDER_REGISTRY, ProviderLoader } from './registry';
import type { AIReceptionistConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * Initialize all configured providers
 * 
 * This function:
 * 1. Creates a new ProviderRegistry
 * 2. Uses ProviderLoader to auto-register providers from metadata
 * 3. Validates all registered providers (fail-fast approach)
 * 4. Returns the initialized registry
 * 
 * @param config - The AIReceptionistConfig containing provider configurations
 * @returns Promise resolving to initialized ProviderRegistry
 * @throws Error if provider validation fails
 * 
 * @example
 * ```typescript
 * const registry = await initializeProviders(config);
 * const aiProvider = await getAIProvider(registry);
 * ```
 */
export async function initializeProviders(
  config: AIReceptionistConfig
): Promise<ProviderRegistry> {
  const registry = new ProviderRegistry();
  const loader = new ProviderLoader(PROVIDER_REGISTRY);

  logger.info('[ProviderInit] Auto-registering providers from metadata...');
  
  // Auto-register all configured providers
  await loader.registerProviders(registry, config);

  // Validate all registered providers (fail fast)
  logger.info('[ProviderInit] Validating provider credentials...');
  await registry.validateAll();
  logger.info('[ProviderInit] All credentials validated successfully');

  return registry;
}

/**
 * Get AI provider from registry
 * Checks for 'openai' or 'openrouter' based on what was registered
 */
export async function getAIProvider(
  registry: ProviderRegistry
): Promise<any> {
  // Try to get the AI provider that was actually registered
  if (registry.has('openrouter')) {
    return registry.get('openrouter');
  }
  if (registry.has('openai')) {
    return registry.get('openai');
  }
  throw new Error('No AI provider configured. Please configure either OpenAI or OpenRouter in model.provider');
}

/**
 * Get Twilio provider from registry (if exists)
 */
export async function getTwilioProvider(
  registry: ProviderRegistry
): Promise<any | undefined> {
  return registry.has('twilio')
    ? registry.get('twilio')
    : undefined;
}

/**
 * Get Google provider from registry (if exists)
 */
export async function getGoogleProvider(
  registry: ProviderRegistry
): Promise<any | undefined> {
  return registry.has('google')
    ? registry.get('google')
    : undefined;
}

/**
 * Get Postmark provider from registry (if exists)
 */
export async function getPostmarkProvider(
  registry: ProviderRegistry
): Promise<any | undefined> {
  return registry.has('postmark')
    ? registry.get('postmark')
    : undefined;
}
