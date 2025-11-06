/**
 * Provider Loader
 * Automatically registers providers based on metadata configuration
 */

import { ProviderRegistry } from '../core/provider-registry';
import type { ProviderMetadata } from './provider-metadata';
import type { AIReceptionistConfig } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Loads and registers providers automatically based on metadata
 */
export class ProviderLoader {
  constructor(private metadata: Record<string, ProviderMetadata>) {}

  /**
   * Register all configured providers
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
   */
  private async registerProvider(
    registry: ProviderRegistry,
    metadata: ProviderMetadata,
    config: any
  ): Promise<void> {
    const ProviderModule = await metadata.factory();
    const ValidatorModule = await metadata.validatorFactory();
    
    const ProviderClass = ProviderModule.default;
    const ValidatorClass = ValidatorModule.default;

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
   */
  private getConfigValue(config: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], config);
  }
}

