/**
 * Twilio Provider - ULTRA-PURE API Wrapper
 * Just wraps the Twilio SDK and returns it
 * Processor handles all initialization and logic
 */

import { BaseProvider } from '../base.provider';
import type { TwilioConfig } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Twilio Provider
 * ULTRA-PURE - just wraps Twilio SDK, no initialization or logic
 */
export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio';
  readonly type = 'core' as const;

  private twilioSdk: any = null;

  constructor(private config: TwilioConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[TwilioProvider] Initializing (loading SDK)');

    try {
      // Just lazy-load the SDK, don't create client
      this.twilioSdk = (await import('twilio')).default;
      this.initialized = true;
      logger.info('[TwilioProvider] SDK loaded');
    } catch (error) {
      logger.error('[TwilioProvider] Failed to load SDK:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get the raw Twilio SDK constructor
   * Processor will create client with credentials
   */
  getSdk(): any {
    this.ensureInitialized();
    return this.twilioSdk;
  }

  /**
   * Get config (credentials, etc.)
   * Processor will use this to create client
   */
  getConfig(): TwilioConfig {
    return this.config;
  }

  /**
   * Create and return a Twilio client instance
   * Processor can call this to get a configured client
   */
  createClient(): any {
    this.ensureInitialized();
    return this.twilioSdk(this.config.accountSid, this.config.authToken);
  }

  async dispose(): Promise<void> {
    logger.info('[TwilioProvider] Disposing');
    this.twilioSdk = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized && this.twilioSdk !== null;
  }
}

