/**
 * SMS Resource
 * User-facing API for SMS operations
 */

import { TwilioProvider } from '../providers/communication/twilio.provider';
import { SendSMSOptions, SMSSession } from '../types';

export class SMSResource {
  constructor(private twilioProvider: TwilioProvider) {}

  /**
   * Send an SMS message
   *
   * @example
   * ```typescript
   * const sms = await client.sms.send({
   *   to: '+1234567890',
   *   body: 'Hello from our AI assistant!'
   * });
   * console.log('SMS sent:', sms.id);
   * ```
   */
  async send(options: SendSMSOptions): Promise<SMSSession> {
    console.log(`[SMSResource] Sending SMS to ${options.to}`);

    const messageSid = await this.twilioProvider.sendSMS(options.to, options.body);

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
