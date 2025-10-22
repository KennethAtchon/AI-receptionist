/**
 * Messaging Service
 * High-level messaging operations using MessagingProcessor
 */

import type { MessagingProcessor } from '../processors/messaging.processor';
import { logger } from '../utils/logger';

/**
 * MessagingService
 * Delegates to MessagingProcessor for AI-driven messaging
 */
export class MessagingService {
  constructor(private readonly messagingProcessor: MessagingProcessor) {}

  /**
   * Send templated SMS message
   */
  async sendTemplatedSMS(params: {
    to: string;
    templateId: string;
    variables: Record<string, string>;
    track?: boolean;
  }): Promise<{ id: string; content: string }> {
    logger.info('[MessagingService] Sending templated SMS', {
      to: params.to,
      templateId: params.templateId
    });

    // Validate phone number
    if (!this.isValidPhoneNumber(params.to)) {
      throw new Error('Invalid phone number format');
    }

    // Build context from template
    const context = `Template: ${params.templateId}`;

    // Delegate to processor
    const result = await this.messagingProcessor.sendMessage({
      to: params.to,
      context,
      variables: params.variables,
      channel: 'sms'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS');
    }

    logger.info('[MessagingService] SMS sent', { messageId: result.messageId });

    return {
      id: result.messageId!,
      content: result.content!
    };
  }

  /**
   * Send SMS with custom message
   */
  async sendSMS(params: {
    to: string;
    message: string;
  }): Promise<{ id: string }> {
    logger.info('[MessagingService] Sending SMS', { to: params.to });

    // Validate
    if (!this.isValidPhoneNumber(params.to)) {
      throw new Error('Invalid phone number format');
    }

    if (!params.message || params.message.length === 0) {
      throw new Error('Message cannot be empty');
    }

    // Delegate to processor
    const result = await this.messagingProcessor.sendMessage({
      to: params.to,
      context: params.message,
      channel: 'sms'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send SMS');
    }

    logger.info('[MessagingService] SMS sent', { messageId: result.messageId });

    return { id: result.messageId! };
  }

  /**
   * Send email message
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<{ id: string }> {
    logger.info('[MessagingService] Sending email', { to: params.to });

    // Validate email
    if (!this.isValidEmail(params.to)) {
      throw new Error('Invalid email address format');
    }

    // Delegate to processor
    const result = await this.messagingProcessor.sendMessage({
      to: params.to,
      context: `Subject: ${params.subject}\n\n${params.body}`,
      channel: 'email'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    logger.info('[MessagingService] Email sent', { messageId: result.messageId });

    return { id: result.messageId! };
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
