/**
 * SMS Resource
 * User-facing API for SMS operations
 */

import { TwilioProvider } from '../providers/communication/twilio.provider';
import { SendSMSOptions, SMSSession } from '../types';
import { logger } from '../utils/logger';

export class SMSResource {
  constructor(private getTwilioProvider: () => Promise<TwilioProvider>) {}

  /**
   * Send an SMS message
   *
   * @example
   * ```typescript
   * const sms = await client.sms.send({
   *   to: '+1234567890',
   *   body: 'Hello from our AI assistant!'
   * });
   * logger.info('SMS sent:', sms.id);
   * ```
   */
  async send(options: SendSMSOptions): Promise<SMSSession> {
    logger.info(`[SMSResource] Sending SMS to ${options.to}`);

    // Lazy load Twilio provider on first use
    const twilioProvider = await this.getTwilioProvider();
    const messageSid = await twilioProvider.sendSMS(options.to, options.body);

    return {
      id: messageSid,
      conversationId: '', // TODO: Create conversation for SMS
      to: options.to,
      body: options.body,
      status: 'sent',
      sentAt: new Date()
    };
  }

  /**
   * Get SMS details
   * TODO: Implement
   */
  async get(messageId: string): Promise<SMSSession> {
    throw new Error('Not implemented yet');
  }

  /**
   * List recent SMS messages
   * TODO: Implement
   */
  async list(options?: { limit?: number }): Promise<SMSSession[]> {
    throw new Error('Not implemented yet');
  }
}
