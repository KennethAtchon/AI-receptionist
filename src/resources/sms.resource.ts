/**
 * SMS Resource
 * User-facing API for SMS operations
 */

import type { MessagingService } from '../services/messaging.service';
import { SendSMSOptions, SMSSession } from '../types';
import { logger } from '../utils/logger';

export class SMSResource {
  constructor(private messagingService: MessagingService) {}

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

    // Use messaging service which delegates to the processor
    return await this.messagingService.sendSMS({
      to: options.to,
      context: options.body,
      conversationId: options.conversationId,
      channel: 'sms'
    });
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
