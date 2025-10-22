/**
 * Google Provider - ULTRA-PURE API Wrapper
 * Just wraps the Google APIs SDK and returns it
 * Processor handles all initialization and logic
 */

import { BaseProvider } from '../base.provider';
import type { GoogleConfig } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Google Provider
 * ULTRA-PURE - just wraps googleapis SDK, no initialization or logic
 */
export class GoogleProvider extends BaseProvider {
  readonly name = 'google';
  readonly type = 'core' as const;

  private googleApis: any = null;

  constructor(private config: GoogleConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[GoogleProvider] Initializing (loading SDK)');
    
    try {
      // Just lazy-load the SDK, don't configure anything
      this.googleApis = await import('googleapis');
      this.initialized = true;
      logger.info('[GoogleProvider] SDK loaded');
    } catch (error) {
      logger.error('[GoogleProvider] Failed to load SDK:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get the raw Google APIs SDK
   * Processor will handle auth, calendar client creation, etc.
   */
  getApi(): any {
    this.ensureInitialized();
    return this.googleApis.google;
  }

  /**
   * Get config (credentials, etc.)
   * Processor will use this to set up auth
   */
  getConfig(): GoogleConfig {
    return this.config;
  }

  async dispose(): Promise<void> {
    logger.info('[GoogleProvider] Disposing');
    this.googleApis = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized && this.googleApis !== null;
  }
}
