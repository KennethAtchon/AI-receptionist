/**
 * Email Resource
 * User-facing API for email operations
 */

import type { SendEmailOptions, EmailSession, ConversationMessage } from '../types';
import type { Agent } from '../agent/core/Agent';
import type { EmailProcessor } from '../processors/email.processor';
import { logger } from '../utils/logger';

export class EmailResource {
  constructor(
    private agent: Agent,
    private emailProcessor?: EmailProcessor
  ) {}

  /**
   * Send an email
   *
   * @example
   * ```typescript
   * const email = await client.email.send({
   *   to: 'user@example.com',
   *   subject: 'Welcome!',
   *   body: 'Thanks for reaching out...',
   *   html: '<h1>Welcome!</h1><p>Thanks for reaching out...</p>'
   * });
   * logger.info('Email sent:', email.id);
   * ```
   */
  async send(options: SendEmailOptions): Promise<EmailSession> {
    logger.info(`[EmailResource] Sending email to ${options.to}`);

    if (!this.emailProcessor) {
      throw new Error('Email processor not configured. Please configure an email provider.');
    }

    // Create conversation for email using Agent memory
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await this.agent.getMemory().startSession({
      conversationId,
      channel: 'email',
      metadata: {
        to: options.to,
        subject: options.subject,
        ...options.metadata
      }
    });

    try {
      // Send email via processor
      const result = await this.emailProcessor.sendEmail({
        to: options.to,
        subject: options.subject,
        body: options.body,
        html: options.html,
        attachments: options.attachments,
        tags: options.tags,
        provider: options.provider
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      const conversationMessage: ConversationMessage = {
        role: 'assistant',
        content: options.body,
        timestamp: new Date()
      };

      // Store message in conversation using Agent memory
      await this.agent.getMemory().store({
        id: `msg-${conversationId}-${Date.now()}`,
        content: options.body,
        timestamp: new Date(),
        type: 'conversation',
        channel: 'email',
        role: 'assistant',
        sessionMetadata: { conversationId }
      });

      const emailSession: EmailSession = {
        id: result.messageId || `EMAIL_${Date.now()}`,
        conversationId,
        to: options.to,
        subject: options.subject,
        status: 'sent',
        sentAt: new Date()
      };

      logger.info('[EmailResource] Email sent successfully', {
        id: emailSession.id,
        conversationId
      });

      return emailSession;
    } catch (error) {
      logger.error('[EmailResource] Failed to send email:', error as Error);

      // Update conversation status using Agent memory
      await this.agent.getMemory().store({
        id: `session-failed-${conversationId}`,
        content: 'Conversation failed',
        timestamp: new Date(),
        type: 'system',
        sessionMetadata: { conversationId, status: 'failed' },
        importance: 7
      });

      throw error;
    }
  }

  /**
   * Get email details by ID
   * TODO: Implement email retrieval
   */
  async get(emailId: string): Promise<EmailSession> {
    logger.info(`[EmailResource] Getting email ${emailId}`);

    // TODO: Implement email retrieval via provider
    // For now, throw not implemented
    throw new Error('Email retrieval not implemented yet. Coming soon!');
  }

  /**
   * List recent emails
   * TODO: Implement email listing
   */
  async list(options?: { limit?: number; conversationId?: string }): Promise<EmailSession[]> {
    logger.info('[EmailResource] Listing emails', options);

    // TODO: Implement email listing via conversation service
    // For now, throw not implemented
    throw new Error('Email listing not implemented yet. Coming soon!');
  }

  /**
   * Reply to an email
   * TODO: Implement email reply
   */
  async reply(emailId: string, options: { body: string; html?: string }): Promise<EmailSession> {
    logger.info(`[EmailResource] Replying to email ${emailId}`);

    // TODO: Implement email reply
    throw new Error('Email reply not implemented yet. Coming soon!');
  }
}
