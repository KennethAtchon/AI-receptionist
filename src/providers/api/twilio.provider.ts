/**
 * Twilio Provider
 * Modern Twilio provider with helper methods for common operations
 * Follows the same pattern as PostmarkProvider
 */

import { BaseProvider } from '../base.provider';
import type { TwilioConfig } from '../../types';
import { logger } from '../../utils/logger';

/**
 * SMS message parameters
 */
export interface SMSParams {
  to: string;
  message: string;
  from?: string; // Optional override
  statusCallback?: string; // Webhook for status updates
}

/**
 * SMS result format
 */
export interface SMSResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Call parameters
 */
export interface CallParams {
  to: string;
  from?: string; // Optional override
  url?: string; // TwiML webhook URL (optional - uses config if not provided)
  method?: 'GET' | 'POST';
  statusCallback?: string; // Webhook for status updates
  statusCallbackMethod?: 'GET' | 'POST';
}

/**
 * Call result format
 */
export interface CallResult {
  success: boolean;
  callSid?: string;
  status?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Twilio Provider
 * Thin SDK wrapper + helper methods for common operations
 */
export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio';
  readonly type = 'api' as const;

  private twilioSdk: any = null;
  private twilioClient: any = null;

  constructor(private config: TwilioConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[TwilioProvider] Initializing (loading SDK)');

    try {
      // Lazy-load the SDK and create client
      this.twilioSdk = (await import('twilio')).default;
      this.twilioClient = this.twilioSdk(this.config.accountSid, this.config.authToken);
      this.initialized = true;
      logger.info('[TwilioProvider] SDK loaded');
    } catch (error) {
      logger.error('[TwilioProvider] Failed to load SDK:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get the raw Twilio SDK constructor
   * For advanced use cases
   */
  getSdk(): any {
    this.ensureInitialized();
    return this.twilioSdk;
  }

  /**
   * Get config (credentials, etc.)
   */
  getConfig(): TwilioConfig {
    return this.config;
  }

  /**
   * Create and return a new Twilio client instance
   * For advanced use cases where a separate client is needed
   */
  createClient(): any {
    this.ensureInitialized();
    return this.twilioSdk(this.config.accountSid, this.config.authToken);
  }

  /**
   * Get the main Twilio client
   * For advanced use cases
   */
  getClient(): any {
    this.ensureInitialized();
    return this.twilioClient;
  }

  /**
   * Send SMS message
   * High-level helper method for sending SMS
   */
  async sendSMS(params: SMSParams): Promise<SMSResult> {
    this.ensureInitialized();

    try {
      const fromNumber = params.from || this.config.phoneNumber;

      logger.info('[TwilioProvider] Sending SMS', {
        to: params.to,
        from: fromNumber,
        messageLength: params.message.length
      });

      const message = await this.twilioClient.messages.create({
        to: params.to,
        from: fromNumber,
        body: params.message,
        statusCallback: params.statusCallback
      });

      logger.info('[TwilioProvider] SMS sent successfully', {
        messageSid: message.sid,
        status: message.status,
        to: params.to
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status
      };
    } catch (error: any) {
      logger.error('[TwilioProvider] Failed to send SMS:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error',
        statusCode: error?.status || error?.code
      };
    }
  }

  /**
   * Get webhook URL for voice calls
   * Constructs full webhook URL from config
   */
  getVoiceWebhookUrl(): string {
    if (!this.config.webhookBaseUrl) {
      throw new Error('webhookBaseUrl is required in TwilioConfig');
    }
    const path = this.config.voiceWebhookPath || '/webhooks/voice/inbound';
    return `${this.config.webhookBaseUrl}${path}`;
  }

  /**
   * Get webhook URL for SMS
   * Constructs full webhook URL from config
   */
  getSMSWebhookUrl(): string {
    if (!this.config.webhookBaseUrl) {
      throw new Error('webhookBaseUrl is required in TwilioConfig');
    }
    const path = this.config.smsWebhookPath || '/webhooks/sms/inbound';
    return `${this.config.webhookBaseUrl}${path}`;
  }

  /**
   * Initiate outbound call
   * High-level helper method for making calls
   * If url is not provided, uses webhookBaseUrl + voiceWebhookPath from config
   */
  async makeCall(params: CallParams): Promise<CallResult> {
    this.ensureInitialized();

    try {
      const fromNumber = params.from || this.config.phoneNumber;
      const webhookUrl = params.url || this.getVoiceWebhookUrl();

      logger.info('[TwilioProvider] Initiating call', {
        to: params.to,
        from: fromNumber,
        url: webhookUrl
      });

      const call = await this.twilioClient.calls.create({
        to: params.to,
        from: fromNumber,
        url: webhookUrl,
        method: params.method || 'POST',
        statusCallback: params.statusCallback,
        statusCallbackMethod: params.statusCallbackMethod || 'POST'
      });

      logger.info('[TwilioProvider] Call initiated successfully', {
        callSid: call.sid,
        status: call.status,
        to: params.to
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status
      };
    } catch (error: any) {
      logger.error('[TwilioProvider] Failed to initiate call:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error',
        statusCode: error?.status || error?.code
      };
    }
  }

  /**
   * End an active call
   * High-level helper method for ending calls
   */
  async endCall(callSid: string): Promise<SMSResult> {
    this.ensureInitialized();

    try {
      logger.info('[TwilioProvider] Ending call', { callSid });

      const call = await this.twilioClient.calls(callSid).update({
        status: 'completed'
      });

      logger.info('[TwilioProvider] Call ended successfully', {
        callSid: call.sid,
        status: call.status
      });

      return {
        success: true,
        messageSid: call.sid,
        status: call.status
      };
    } catch (error: any) {
      logger.error('[TwilioProvider] Failed to end call:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error',
        statusCode: error?.status || error?.code
      };
    }
  }

  /**
   * Verify webhook signature
   * Validates that the webhook request came from Twilio
   */
  async verifyWebhookSignature(
    url: string,
    params: Record<string, any>,
    signature: string
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      const crypto = await import('crypto');

      // Build the signature string
      let signatureString = url;

      // Sort params alphabetically and append
      Object.keys(params)
        .sort()
        .forEach(key => {
          signatureString += key + params[key];
        });

      // Compute HMAC SHA1
      const hmac = crypto.createHmac('sha1', this.config.authToken);
      const expectedSignature = hmac.update(Buffer.from(signatureString, 'utf-8')).digest('base64');

      const isValid = signature === expectedSignature;

      if (!isValid) {
        logger.warn('[TwilioProvider] Invalid webhook signature', {
          url,
          expected: expectedSignature.substring(0, 10) + '...',
          received: signature.substring(0, 10) + '...'
        });
      }

      return isValid;
    } catch (error) {
      logger.error('[TwilioProvider] Failed to verify webhook signature:', error as Error);
      return false;
    }
  }

  async dispose(): Promise<void> {
    logger.info('[TwilioProvider] Disposing');
    this.twilioSdk = null;
    this.twilioClient = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.twilioClient) {
      return false;
    }

    try {
      // Test connection by fetching account info
      await this.twilioClient.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch (error) {
      logger.error('[TwilioProvider] Health check failed:', error as Error);
      return false;
    }
  }
}

