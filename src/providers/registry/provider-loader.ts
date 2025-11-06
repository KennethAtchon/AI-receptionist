/**
 * Provider Loader
 * Automatically registers providers based on metadata configuration
 * 
 * This class implements the auto-discovery pattern, reading provider metadata
 * from PROVIDER_REGISTRY and registering providers that are configured in the
 * AIReceptionistConfig.
 * 
 * @example
 * ```typescript
 * const loader = new ProviderLoader(PROVIDER_REGISTRY);
 * await loader.registerProviders(registry, config);
 * ```
 */

import { ProviderRegistry } from '../core/provider-registry';
import type { ProviderMetadata } from './provider-metadata';
import type { AIReceptionistConfig } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Loads and registers providers automatically based on metadata
 * 
 * Uses the metadata system to:
 * 1. Determine which providers are configured
 * 2. Dynamically import provider classes and validators
 * 3. Register them with the ProviderRegistry
 */
export class ProviderLoader {
  constructor(private metadata: Record<string, ProviderMetadata>) {}

  /**
   * Register all configured providers
   * 
   * Registration process:
   * 1. AI provider is registered first based on model.provider
   * 2. Other providers are registered if their config path exists
   * 3. Providers are registered with lazy loading via ProviderProxy
   * 
   * @param registry - The ProviderRegistry to register providers with
   * @param config - The AIReceptionistConfig containing provider configurations
   */
  async registerProviders(
    registry: ProviderRegistry,
    config: AIReceptionistConfig
  ): Promise<void> {
    // Special handling for AI provider (selected via model.provider)
    const aiProvider = config.model.provider;
    if (aiProvider === 'openai' || aiProvider === 'openrouter') {
      await this.registerProvider(registry, this.metadata[aiProvider], config.model);
      logger.info(`[ProviderLoader] Registered AI provider: ${aiProvider}`);
    } else if (aiProvider === 'anthropic' || aiProvider === 'google') {
      throw new Error(`${aiProvider} provider not yet implemented`);
    } else {
      throw new Error(`Unknown AI provider: ${aiProvider}`);
    }

    // Register other providers based on config
    for (const [key, metadata] of Object.entries(this.metadata)) {
      // Skip AI providers (handled above)
      if (metadata.category === 'ai') {
        continue;
      }

      const providerConfig = this.getConfigValue(config, metadata.configPath);
      
      if (providerConfig) {
        await this.registerProvider(registry, metadata, providerConfig);
        logger.info(`[ProviderLoader] Registered ${metadata.category} provider: ${metadata.name}`);
      }
    }
  }

  /**
   * Register a single provider
   * 
   * Dynamically imports the provider class and validator, then registers
   * them with the registry using lazy loading.
   * 
   * @param registry - The ProviderRegistry instance
   * @param metadata - Provider metadata containing factory functions
   * @param config - Provider-specific configuration
   */
  private async registerProvider(
    registry: ProviderRegistry,
    metadata: ProviderMetadata,
    config: any
  ): Promise<void> {
    // Dynamically import provider class
    const ProviderModule = await metadata.factory();
    const ProviderClass = ProviderModule.default;
    
    // Dynamically import validator class
    const ValidatorModule = await metadata.validatorFactory();
    const ValidatorClass = ValidatorModule.default;

    // Register with lazy loading factory
    registry.registerIfConfigured(
      metadata.name,
      () => new ProviderClass(config),
      new ValidatorClass(),
      config
    );
  }

  /**
   * Get config value by path
   * Navigates object using dot notation (e.g., 'providers.email.postmark')
   * 
   * @param config - Configuration object to navigate
   * @param path - Dot-notation path (e.g., 'providers.communication.twilio')
   * @returns The value at the path, or undefined if not found
   */
  private getConfigValue(config: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], config);
  }
}

