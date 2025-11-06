/**
 * Provider Initialization Module
 * Handles registration and validation of all providers using metadata system
 */

import { ProviderRegistry } from './core/provider-registry';
import { PROVIDER_REGISTRY, ProviderLoader } from './registry';
import type { AIReceptionistConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * Initialize all configured providers
 * Returns registry with registered providers
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
 */
export async function getAIProvider(
  registry: ProviderRegistry
): Promise<any> {
  const aiProvider = await registry.get('openai').catch(() => 
    registry.get('openrouter')
  );
  return aiProvider;
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
