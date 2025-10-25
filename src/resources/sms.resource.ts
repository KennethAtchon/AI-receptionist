/**
 * SMS Resource
 * User-facing API for SMS operations
 */

import { SendSMSOptions, SMSSession } from '../types';
import { logger } from '../utils/logger';
import type { Agent } from '../agent/core/Agent';
import type { MessagingProcessor } from '../processors/messaging.processor';

export class SMSResource {
  constructor(
    private agent: Agent,
    private messagingProcessor: MessagingProcessor
  ) {}

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

    // Validate phone number
    if (!this.messagingProcessor.isValidPhoneNumber(options.to)) {
      throw new Error('Invalid phone number format');
    }

    if (!options.body || options.body.length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Use processor for administrative SMS sending
    const result = await this.messagingProcessor.sendSMS({
      to: options.to,
      body: options.body
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS');
    }

    logger.info('[SMSResource] SMS sent', { messageId: result.messageId });

    return {
      id: result.messageId!,
      conversationId: options.conversationId || 'unknown',
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
