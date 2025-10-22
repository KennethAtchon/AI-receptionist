/**
 * Provider Registry - Service Locator Pattern
 * Centralized management of provider instances with lazy loading
 */

import type { IProvider } from '../../types';
import type { ICredentialValidator } from '../validation/credential-validator.interface';
import { ProviderProxy } from './provider-proxy';
import { ProviderNotConfiguredError } from './provider.errors';
import { logger } from '../../utils/logger';

/**
 * Service Locator for managing provider instances
 * Implements lazy loading and credential validation
 *
 * Features:
 * - Lazy provider instantiation via Proxy Pattern
 * - Early credential validation
 * - Centralized provider lifecycle management
 * - Type-safe provider retrieval
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry();
 *
 * // Register providers (not loaded yet)
 * registry.registerIfConfigured(
 *   'twilio',
 *   () => new TwilioProvider(config),
 *   new TwilioValidator(),
 *   config
 * );
 *
 * // Validate all registered providers early
 * await registry.validateAll();
 *
 * // Get provider (loads on first access)
 * const twilio = await registry.get<TwilioProvider>('twilio');
 * ```
 */
export class ProviderRegistry {
  private providers: Map<string, ProviderProxy<IProvider>> = new Map();
  private validated = false;

  /**
   * Register a provider with lazy loading
   * Provider won't be instantiated until first access
   *
   * @param name - Unique identifier for the provider
   * @param factory - Factory function to create the provider
   * @param validator - Credential validator for this provider
   * @param config - Provider configuration (optional, used for format validation)
   *
   * @example
   * ```typescript
   * registry.registerIfConfigured(
   *   'twilio',
   *   async () => {
   *     const { TwilioProvider } = await import('./providers/twilio');
   *     return new TwilioProvider(config);
   *   },
   *   new TwilioValidator(),
   *   config
   * );
   * ```
   */
  registerIfConfigured<T extends IProvider>(
    name: string,
    factory: () => T | Promise<T>,
    validator: ICredentialValidator,
    config?: any
  ): void {
    if (this.providers.has(name)) {
      logger.warn(`[ProviderRegistry] Provider '${name}' already registered, replacing`);
    }

    const proxy = new ProviderProxy(name, factory, validator, config);
    this.providers.set(name, proxy);

    logger.info(`[ProviderRegistry] Registered provider: ${name}`);
  }

  /**
   * Get provider instance (lazy loads on first access)
   * Type-safe retrieval with generic parameter
   *
   * @param name - Provider identifier
   * @returns Promise resolving to provider instance
   * @throws ProviderNotConfiguredError if provider not registered
   *
   * @example
   * ```typescript
   * const twilio = await registry.get<TwilioProvider>('twilio');
   * await twilio.sendSMS('+1234567890', 'Hello!');
   * ```
   */
  async get<T extends IProvider>(name: string): Promise<T> {
    const proxy = this.providers.get(name);

    if (!proxy) {
      throw new ProviderNotConfiguredError(name);
    }

    return proxy.getInstance() as Promise<T>;
  }

  /**
   * Validate all registered providers early
   * Call this during SDK initialization to fail fast
   *
   * Validates providers in parallel for performance
   *
   * @throws CredentialValidationError if any provider fails validation
   *
   * @example
   * ```typescript
   * // During SDK initialization
   * await registry.validateAll();
   * // All credentials are valid, safe to proceed
   * ```
   */
  async validateAll(): Promise<void> {
    if (this.validated) {
      logger.warn('[ProviderRegistry] Providers already validated');
      return;
    }

    logger.info(`[ProviderRegistry] Validating ${this.providers.size} provider(s)`);

    const validations = Array.from(this.providers.values()).map(proxy =>
      proxy.validate().catch(error => {
        // Re-throw to fail fast, but log first
        logger.error(`[ProviderRegistry] Validation failed for ${proxy.getName()}:`, error);
        throw error;
      })
    );

    // Validate all providers in parallel
    await Promise.all(validations);

    this.validated = true;
    logger.info('[ProviderRegistry] All providers validated successfully');
  }

  /**
   * Check if a provider is registered
   * Useful for conditional logic based on available providers
   *
   * @param name - Provider identifier
   * @returns True if provider is registered
   *
   * @example
   * ```typescript
   * if (registry.has('twilio')) {
   *   // Initialize SMS resource
   *   this.sms = new SMSResource(() => registry.get('twilio'));
   * }
   * ```
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get list of registered provider names
   *
   * @returns Array of provider names
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get count of registered providers
   *
   * @returns Number of registered providers
   */
  count(): number {
    return this.providers.size;
  }

  /**
   * Check if a provider has been loaded
   *
   * @param name - Provider identifier
   * @returns True if provider instance has been created
   */
  isLoaded(name: string): boolean {
    const proxy = this.providers.get(name);
    return proxy?.isLoaded() ?? false;
  }

  /**
   * Check if a provider has been validated
   *
   * @param name - Provider identifier
   * @returns True if provider credentials have been validated
   */
  isValidated(name: string): boolean {
    const proxy = this.providers.get(name);
    return proxy?.isValidated() ?? false;
  }

  /**
   * Dispose all providers
   * Cleans up resources for all loaded providers
   *
   * Call this during SDK shutdown
   */
  async disposeAll(): Promise<void> {
    logger.info(`[ProviderRegistry] Disposing ${this.providers.size} provider(s)`);

    const disposals = Array.from(this.providers.values()).map(proxy =>
      proxy.dispose().catch(error => {
        logger.error(`[ProviderRegistry] Error disposing ${proxy.getName()}:`, error);
        // Don't throw, continue disposing other providers
      })
    );

    await Promise.all(disposals);

    this.providers.clear();
    this.validated = false;

    logger.info('[ProviderRegistry] All providers disposed');
  }

  /**
   * Unregister a specific provider
   * Disposes the provider if loaded
   *
   * @param name - Provider identifier
   */
  async unregister(name: string): Promise<void> {
    const proxy = this.providers.get(name);

    if (proxy) {
      await proxy.dispose();
      this.providers.delete(name);
      logger.info(`[ProviderRegistry] Unregistered provider: ${name}`);
    }
  }
}
