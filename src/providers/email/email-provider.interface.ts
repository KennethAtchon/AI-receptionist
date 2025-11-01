/**
 * Common interface for all email providers
 * Defines standard email operations (currently supports Postmark)
 */

import type { IProvider } from '../../types';

export interface IEmailProvider extends IProvider {
  /**
   * Send an email
   */
  sendEmail(params: EmailParams): Promise<EmailResult>;

  /**
   * Send bulk emails (optional - not all providers support this)
   */
  sendBulkEmails?(params: BulkEmailParams): Promise<BulkEmailResult>;

  /**
   * Get email delivery status (optional)
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatus>;

  /**
   * Validate email address format
   */
  validateEmail?(email: string): Promise<boolean>;

  /**
   * Get provider configuration
   */
  getConfig(): any;
}

export interface EmailParams {
  to: string | string[];
  from?: string; // Override default from address
  cc?: string | string[]; // CC recipients (combined with provider's archiveCc)
  bcc?: string | string[]; // BCC recipients
  replyTo?: string;
  subject: string;
  text?: string; // Plain text
  html?: string; // HTML content
  attachments?: Attachment[];
  headers?: Record<string, string>;
  templateId?: string; // For template-based emails
  templateData?: Record<string, any>;
  tags?: string[]; // For analytics/filtering/routing
}

export interface Attachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string | Error;
  statusCode?: number;
}

export interface BulkEmailParams {
  emails: EmailParams[];
}

export interface BulkEmailResult {
  results: EmailResult[];
}

export interface DeliveryStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'spam';
  deliveredAt?: Date;
  error?: string;
}
