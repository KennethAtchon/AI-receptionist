/**
 * Email Processor
 * Thin administrative wrapper for email operations.
 * Supports multiple email providers with automatic routing and fallback.
 * No AI consultation - just provider operations for services.
 */

import type { EmailRouter } from '../providers/email/email-router';
import type { EmailParams } from '../providers/email/email-provider.interface';
import { logger } from '../utils/logger';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
  templateId?: string;
  templateData?: Record<string, any>;
  tags?: string[];
  provider?: string; // Force specific provider
}

export interface EmailProcessorResult {
  success: boolean;
  messageId?: string;
  content?: string;
  error?: string;
  provider?: string; // Which provider was used
}

/**
 * EmailProcessor
 * Administrative helper for email operations via email router
 * Supports multiple providers with automatic routing and fallback
 */
export class EmailProcessor {
  readonly name = 'email';
  readonly type = 'email' as const;

  constructor(private emailRouter: EmailRouter) {}

  /**
   * Send email (administrative operation)
   * Automatically routes to appropriate provider based on configuration
   */
  async sendEmail(params: SendEmailParams): Promise<EmailProcessorResult> {
    logger.info('[EmailProcessor] Sending email', {
      to: params.to,
      subject: params.subject,
      forcedProvider: params.provider
    });

    try {
      const emailParams: EmailParams = {
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.html,
        from: params.from,
        replyTo: params.replyTo,
        attachments: params.attachments,
        templateId: params.templateId,
        templateData: params.templateData,
        tags: params.tags
      };

      const result = await this.emailRouter.sendEmail(emailParams, params.provider);

      if (!result.success) {
        logger.error('[EmailProcessor] Failed to send email:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

      logger.info('[EmailProcessor] Email sent', { messageId: result.messageId });

      return {
        success: true,
        messageId: result.messageId,
        content: params.body
      };
    } catch (error) {
      logger.error('[EmailProcessor] Failed to send email:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send bulk emails (administrative operation)
   */
  async sendBulkEmails(emails: SendEmailParams[]): Promise<EmailProcessorResult[]> {
    logger.info('[EmailProcessor] Sending bulk emails', { count: emails.length });

    const results: EmailProcessorResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info('[EmailProcessor] Bulk emails sent', {
      total: emails.length,
      success: successCount,
      failed: emails.length - successCount
    });

    return results;
  }

  /**
   * Validate email address format (administrative operation)
   */
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return this.emailRouter.getProviders();
  }

  /**
   * Check if a specific provider is available
   */
  hasProvider(name: string): boolean {
    return this.emailRouter.hasProvider(name);
  }
}
