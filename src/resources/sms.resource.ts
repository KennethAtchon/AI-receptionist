/**
 * SMS Resource
 * User-facing API for SMS operations
 */

import { MessagingService } from '../services/messaging.service';
import { SendSMSOptions, SMSSession } from '../types';
import { logger } from '../utils/logger';
import type { Agent } from '../agent/core/Agent';
import type { MessagingProcessor } from '../processors/messaging.processor';

export class SMSResource {
  private readonly messagingService: MessagingService;

  constructor(agent: Agent, messagingProcessor: MessagingProcessor) {
    // Create service internally (Factory Pattern)
    this.messagingService = new MessagingService(agent, messagingProcessor);
  }

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
