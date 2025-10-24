/**
 * SendGrid Email Provider
 * Industry-standard email service with enterprise features
 * ULTRA-PURE - just wraps SendGrid SDK, no business logic
 */

import { BaseProvider } from '../base.provider';
import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { logger } from '../../utils/logger';

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  priority?: number;
  tags?: string[];
  domains?: string[];
}

export class SendGridProvider extends BaseProvider implements IEmailProvider {
  readonly name = 'sendgrid';
  readonly type = 'email' as const;

  private sendgridSdk: any = null;

  constructor(private config: SendGridConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[SendGridProvider] Initializing (loading SDK)');

    try {
      // Lazy-load SendGrid SDK
      const sgMail = await import('@sendgrid/mail');
      this.sendgridSdk = sgMail.default;

      // Set API key
      this.sendgridSdk.setApiKey(this.config.apiKey);

      this.initialized = true;
      logger.info('[SendGridProvider] SDK loaded and configured');
    } catch (error) {
      logger.error('[SendGridProvider] Failed to load SDK:', error as Error);
      throw error;
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    this.ensureInitialized();

    try {
      const msg = {
        to: params.to,
        from: params.from || {
          email: this.config.fromEmail,
          name: this.config.fromName || 'No Reply'
        },
        replyTo: params.replyTo || this.config.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
          disposition: 'attachment'
        })),
        headers: params.headers,
        templateId: params.templateId,
        dynamicTemplateData: params.templateData,
        categories: params.tags
      };

      const response = await this.sendgridSdk.send(msg);
      const messageId = response[0]?.headers?.['x-message-id'];

      logger.info('[SendGridProvider] Email sent', { messageId, to: params.to });

      return {
        success: true,
        messageId,
        statusCode: response[0]?.statusCode
      };
    } catch (error: any) {
      logger.error('[SendGridProvider] Failed to send email:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error',
        statusCode: error?.code
      };
    }
  }

  /**
   * Get the raw SendGrid SDK
   */
  getSdk(): any {
    this.ensureInitialized();
    return this.sendgridSdk;
  }

  /**
   * Get config
   */
  getConfig(): SendGridConfig {
    return this.config;
  }

  async dispose(): Promise<void> {
    logger.info('[SendGridProvider] Disposing');
    this.sendgridSdk = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized && this.sendgridSdk !== null;
  }
}
