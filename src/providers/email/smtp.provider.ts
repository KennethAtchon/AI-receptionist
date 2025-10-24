/**
 * Generic SMTP Email Provider
 * Works with any SMTP server (Gmail, Outlook, custom servers)
 * ULTRA-PURE - just wraps Nodemailer, no business logic
 */

import { BaseProvider } from '../base.provider';
import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { logger } from '../../utils/logger';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  priority?: number;
  tags?: string[];
  domains?: string[];
  options?: Record<string, any>;
}

export class SMTPProvider extends BaseProvider implements IEmailProvider {
  readonly name = 'smtp';
  readonly type = 'email' as const;

  private transporter: any = null;

  constructor(private config: SMTPConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[SMTPProvider] Initializing (loading Nodemailer)');

    try {
      const nodemailer = await import('nodemailer');

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.username,
          pass: this.config.password
        },
        ...this.config.options
      });

      // Verify connection
      await this.transporter.verify();

      this.initialized = true;
      logger.info('[SMTPProvider] Transporter created and verified');
    } catch (error) {
      logger.error('[SMTPProvider] Failed to initialize:', error as Error);
      throw error;
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    this.ensureInitialized();

    try {
      const info = await this.transporter.sendMail({
        from: params.from || `"${this.config.fromName || 'No Reply'}" <${this.config.fromEmail}>`,
        to: params.to,
        replyTo: params.replyTo || this.config.replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments,
        headers: params.headers
      });

      logger.info('[SMTPProvider] Email sent', { messageId: info.messageId, to: params.to });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      logger.error('[SMTPProvider] Failed to send email:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error'
      };
    }
  }

  /**
   * Get the Nodemailer transporter
   */
  getTransporter(): any {
    this.ensureInitialized();
    return this.transporter;
  }

  /**
   * Get config
   */
  getConfig(): SMTPConfig {
    return this.config;
  }

  async dispose(): Promise<void> {
    logger.info('[SMTPProvider] Disposing');

    if (this.transporter) {
      this.transporter.close();
    }

    this.transporter = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
