/**
 * Resend Email Provider
 * Modern alternative to SendGrid with developer-friendly API
 * ULTRA-PURE - just wraps Resend SDK, no business logic
 */

import { BaseProvider } from '../base.provider';
import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { logger } from '../../utils/logger';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  priority?: number;
  tags?: string[];
  domains?: string[];
}

export class ResendProvider extends BaseProvider implements IEmailProvider {
  readonly name = 'resend';
  readonly type = 'email' as const;

  private resendClient: any = null;

  constructor(private config: ResendConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[ResendProvider] Initializing (loading SDK)');

    try {
      const { Resend } = await import('resend');
      this.resendClient = new Resend(this.config.apiKey);

      this.initialized = true;
      logger.info('[ResendProvider] SDK loaded');
    } catch (error) {
      logger.error('[ResendProvider] Failed to load SDK:', error as Error);
      throw error;
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    this.ensureInitialized();

    try {
      const response = await this.resendClient.emails.send({
        from: params.from || `${this.config.fromName || 'No Reply'} <${this.config.fromEmail}>`,
        to: params.to,
        reply_to: params.replyTo || this.config.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments,
        headers: params.headers,
        tags: params.tags?.map((tag) => ({ name: tag, value: tag }))
      });

      logger.info('[ResendProvider] Email sent', { id: response.id, to: params.to });

      return {
        success: true,
        messageId: response.id
      };
    } catch (error: any) {
      logger.error('[ResendProvider] Failed to send email:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error',
        statusCode: error?.statusCode
      };
    }
  }

  /**
   * Get the Resend client
   */
  getClient(): any {
    this.ensureInitialized();
    return this.resendClient;
  }

  /**
   * Get config
   */
  getConfig(): ResendConfig {
    return this.config;
  }

  async dispose(): Promise<void> {
    logger.info('[ResendProvider] Disposing');
    this.resendClient = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized && this.resendClient !== null;
  }
}
