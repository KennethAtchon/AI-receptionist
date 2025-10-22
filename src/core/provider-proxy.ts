/**
 * Provider Proxy - Lazy Loading Pattern
 * Defers provider initialization until first access
 */

import type { IProvider } from '../types';
import type { ICredentialValidator } from '../validation/credential-validator.interface';
import { CredentialValidationError, ProviderInitializationError } from '../errors/provider.errors';
import { logger } from '../utils/logger';

/**
 * Proxy wrapper for lazy provider initialization
 * Implements the Proxy Pattern for transparent lazy loading
 *
 * Features:
 * - Defers instantiation until first access
 * - Validates credentials after initialization
 * - Prevents concurrent initialization
 * - Provides cleanup on disposal
 *
 * @example
 * ```typescript
 * const proxy = new ProviderProxy(
 *   'twilio',
 *   async () => new TwilioProvider(config),
 *   new TwilioValidator()
 * );
 *
 * // Provider not yet loaded
 * await proxy.validate(); // Validates credentials
 *
 * // Provider loads on first access
 * const provider = await proxy.getInstance();
 * ```
 */
export class ProviderProxy<T extends IProvider> {
  private instance?: T;
  private initPromise?: Promise<T>;
  private validated = false;

  constructor(
    private readonly name: string,
    private readonly factory: () => T | Promise<T>, // this is a factory function that creates a new instance of the provider
    private readonly validator: ICredentialValidator,
    private readonly config?: any
  ) {}

  /**
   * Get provider instance (lazy loads on first call)
   * Thread-safe: prevents concurrent initialization
   *
   * @returns Promise resolving to provider instance
   * @throws ProviderInitializationError if initialization fails
   */
  async getInstance(): Promise<T> {
    // Return existing instance if already loaded
    if (this.instance) {
      return this.instance;
    }

    // Prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    return this.initPromise;
  }

  /**
   * Validate credentials without fully loading the provider
   * Performs both format and connection validation
   *
   * @throws CredentialValidationError if validation fails
   */
  async validate(): Promise<void> {
    if (this.validated) {
      return;
    }

    try {
      // Step 1: Format validation (lightweight, no API calls)
      if (this.config) {
        logger.info(`[ProviderProxy] Validating ${this.name} credential format`);
        const formatResult = this.validator.validateFormat(this.config);

        if (!formatResult.valid) {
          throw new CredentialValidationError(
            this.name,
            formatResult.error || 'Invalid credential format',
            formatResult.details
          );
        }
      }

      // Step 2: Connection validation (makes API call)
      logger.info(`[ProviderProxy] Validating ${this.name} connection`);
      const instance = await this.getInstance();
      const connectionResult = await this.validator.validateConnection(instance);

      if (!connectionResult.valid) {
        throw new CredentialValidationError(
          this.name,
          connectionResult.error || 'Connection validation failed',
          connectionResult.details
        );
      }

      this.validated = true;
      logger.info(`[ProviderProxy] ${this.name} credentials validated successfully`);
    } catch (error) {
      if (error instanceof CredentialValidationError) {
        throw error;
      }

      logger.error(`[ProviderProxy] Validation failed for ${this.name}:`, error instanceof Error ? error : new Error(String(error)));
      throw new CredentialValidationError(
        this.name,
        error instanceof Error ? error.message : 'Unknown validation error',
        { originalError: error }
      );
    }
  }

  /**
   * Internal initialization logic
   * Creates and initializes the provider instance
   */
  private async initialize(): Promise<T> {
    try {
      logger.info(`[ProviderProxy] Lazy loading ${this.name} provider`);

      // Create instance via factory
      const instance = await this.factory();

      // Initialize the provider
      await instance.initialize();

      this.instance = instance;
      logger.info(`[ProviderProxy] ${this.name} provider loaded successfully`);

      return instance;
    } catch (error) {
      logger.error(`[ProviderProxy] Failed to initialize ${this.name}:`, error instanceof Error ? error : new Error(String(error)));

      // Clear failed initialization state
      this.instance = undefined;
      this.initPromise = undefined;

      throw new ProviderInitializationError(
        this.name,
        error instanceof Error ? error.message : 'Unknown initialization error',
        { originalError: error }
      );
    }
  }

  /**
   * Dispose provider if loaded
   * Cleans up resources and resets state
   */
  async dispose(): Promise<void> {
    if (this.instance) {
      logger.info(`[ProviderProxy] Disposing ${this.name} provider`);
      await this.instance.dispose();
      this.instance = undefined;
      this.initPromise = undefined;
      this.validated = false;
    }
  }

  /**
   * Check if provider has been loaded
   */
  isLoaded(): boolean {
    return this.instance !== undefined;
  }

  /**
   * Check if credentials have been validated
   */
  isValidated(): boolean {
    return this.validated;
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }
}
