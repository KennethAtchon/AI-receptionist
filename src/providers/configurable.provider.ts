/**
 * Configurable Provider Interface
 * Defines methods for providers that support runtime configuration changes
 */

import type { IProvider } from '../types';

/**
 * Interface for providers that support runtime configuration changes
 * Extends the base IProvider interface with configuration management capabilities
 */
export interface IConfigurableProvider extends IProvider {
  /**
   * Update the provider configuration at runtime
   * @param newConfig - New configuration object
   * @throws Error if configuration is invalid or update fails
   */
  updateConfig(newConfig: any): Promise<void>;

  /**
   * Get the current configuration
   * @returns Current configuration object
   */
  getConfig(): any;

  /**
   * Validate a new configuration without applying it
   * @param config - Configuration to validate
   * @returns Validation result
   */
  validateConfig(config: any): Promise<{ valid: boolean; error?: string }>;

  /**
   * Reset to default configuration
   * @throws Error if reset fails
   */
  resetConfig(): Promise<void>;
}

/**
 * Base class for configurable providers
 * Provides common implementation for configuration management
 */
export abstract class BaseConfigurableProvider implements IConfigurableProvider {
  abstract readonly name: string;
  abstract readonly type: 'communication' | 'ai' | 'api' | 'calendar' | 'crm' | 'storage' | 'custom';

  protected initialized = false;
  protected currentConfig: any;

  constructor(initialConfig: any) {
    this.currentConfig = { ...initialConfig };
  }

  abstract initialize(): Promise<void>;
  abstract dispose(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  /**
   * Update configuration and reinitialize if needed
   */
  async updateConfig(newConfig: any): Promise<void> {
    // Validate the new configuration
    const validation = await this.validateConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.error}`);
    }

    // Store old config for rollback
    const oldConfig = { ...this.currentConfig };
    
    try {
      // Update configuration
      this.currentConfig = { ...newConfig };
      
      // Reinitialize if provider was already initialized
      if (this.initialized) {
        await this.dispose();
        await this.initialize();
      }
    } catch (error) {
      // Rollback on failure
      this.currentConfig = oldConfig;
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): any {
    return { ...this.currentConfig };
  }

  /**
   * Validate configuration (to be implemented by subclasses)
   */
  abstract validateConfig(config: any): Promise<{ valid: boolean; error?: string }>;

  /**
   * Reset to default configuration
   */
  async resetConfig(): Promise<void> {
    const defaultConfig = this.getDefaultConfig();
    await this.updateConfig(defaultConfig);
  }

  /**
   * Get default configuration (to be implemented by subclasses)
   */
  protected abstract getDefaultConfig(): any;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} provider not initialized. Call initialize() first.`);
    }
  }
}
