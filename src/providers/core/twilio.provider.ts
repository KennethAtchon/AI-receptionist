/**
 * Twilio Communication Provider
 * Handles phone calls and SMS via Twilio API
 */

import { BaseProvider } from '../base.provider';
import { TwilioConfig } from '../../types';
import { logger } from '../../utils/logger';

export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio';
  readonly type = 'communication' as const;

  private client: any = null; // TODO: Import actual Twilio client type

  constructor(private config: TwilioConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[TwilioProvider] Initializing with account', { accountSid: this.config.accountSid });

    try {
      // Dynamically import Twilio SDK (lazy loading)
      const twilio = (await import('twilio')).default;
      this.client = twilio(this.config.accountSid, this.config.authToken);

      this.initialized = true;
      logger.info('[TwilioProvider] Initialized successfully');
    } catch (error) {
      logger.error('[TwilioProvider] Initialization failed:', error);
      throw new Error(`Failed to initialize Twilio provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      // Lightweight API call to verify credentials
      // Fetches account details - minimal cost, verifies authentication
      await this.client.api.v2010.accounts(this.config.accountSid).fetch();
      logger.info('[TwilioProvider] Health check passed');
      return true;
    } catch (error) {
      logger.error('[TwilioProvider] Health check failed:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async dispose(): Promise<void> {
    logger.info('[TwilioProvider] Disposing');
    this.client = null;
    this.initialized = false;
  }
}
