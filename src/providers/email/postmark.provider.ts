/**
 * Postmark Email Provider
 * Modern email provider with excellent inbound webhook support
 * Replaces: Resend, SendGrid, and SMTP providers
 */

import { BaseProvider } from '../base.provider';
import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { logger } from '../../utils/logger';

export interface PostmarkConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  priority?: number;
  tags?: string[];
  domains?: string[];
  archiveCc?: string | string[]; // CC address(es) for all outbound emails (for monitoring/archiving)
  // Webhook secret for verifying inbound webhook signatures (optional)
  // Note: The webhook URL is configured in Postmark's dashboard, not here
  webhookSecret?: string;
}

/**
 * Postmark inbound email format
 */
export interface PostmarkInboundEmail {
  FromName: string;
  MessageStream: string;
  From: string;
  FromFull: {
    Email: string;
    Name: string;
    MailboxHash: string;
  };
  To: string;
  ToFull: Array<{
    Email: string;
    Name: string;
    MailboxHash: string;
  }>;
  Cc: string;
  CcFull: Array<{
    Email: string;
    Name: string;
    MailboxHash: string;
  }>;
  Bcc: string;
  BccFull: Array<{
    Email: string;
    Name: string;
    MailboxHash: string;
  }>;
  OriginalRecipient: string;
  Subject: string;
  MessageID: string;
  ReplyTo: string;
  MailboxHash: string;
  Date: string;
  TextBody: string;
  HtmlBody: string;
  StrippedTextReply: string;
  Tag: string;
  Headers: Array<{
    Name: string;
    Value: string;
  }>;
  Attachments: Array<{
    Name: string;
    Content: string;
    ContentType: string;
    ContentLength: number;
  }>;
}

export class PostmarkProvider extends BaseProvider implements IEmailProvider {
  readonly name = 'postmark';
  readonly type = 'email' as const;

  private postmarkClient: any = null;

  constructor(private config: PostmarkConfig) {
    super();
  }

  async initialize(): Promise<void> {
    logger.info('[PostmarkProvider] Initializing (loading SDK)');

    try {
      const { ServerClient } = await import('postmark');
      this.postmarkClient = new ServerClient(this.config.apiKey);

      this.initialized = true;
      logger.info('[PostmarkProvider] SDK loaded');
    } catch (error) {
      logger.error('[PostmarkProvider] Failed to load SDK:', error as Error);
      throw error;
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    this.ensureInitialized();

    try {
      // Build CC list: combine params.cc with config archiveCc
      const ccList: string[] = [];

      // Add CC from params if provided
      if (params.cc) {
        const paramCc = Array.isArray(params.cc) ? params.cc : [params.cc];
        ccList.push(...paramCc);
      }

      // Add archiveCc from config (for monitoring/archiving)
      if (this.config.archiveCc) {
        const archiveCc = Array.isArray(this.config.archiveCc)
          ? this.config.archiveCc
          : [this.config.archiveCc];
        ccList.push(...archiveCc);
      }

      const response = await this.postmarkClient.sendEmail({
        From: params.from || `${this.config.fromName || 'No Reply'} <${this.config.fromEmail}>`,
        To: Array.isArray(params.to) ? params.to.join(',') : params.to,
        Cc: ccList.length > 0 ? ccList.join(',') : undefined,
        ReplyTo: params.replyTo || this.config.replyTo,
        Subject: params.subject,
        TextBody: params.text,
        HtmlBody: params.html,
        Attachments: params.attachments?.map(att => ({
          Name: att.filename,
          Content: att.content ? Buffer.from(att.content).toString('base64') : undefined,
          ContentType: att.contentType || 'application/octet-stream'
        })),
        Headers: params.headers ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value })) : undefined,
        Tag: params.tags?.[0], // Postmark supports single tag per email
        Metadata: params.tags ? { tags: params.tags.join(',') } : undefined
      });

      logger.info('[PostmarkProvider] Email sent', {
        messageId: response.MessageID,
        to: params.to,
        cc: ccList.length > 0 ? ccList : undefined
      });

      return {
        success: true,
        messageId: response.MessageID
      };
    } catch (error: any) {
      logger.error('[PostmarkProvider] Failed to send email:', error);

      return {
        success: false,
        error: error?.message || 'Unknown error',
        statusCode: error?.statusCode || error?.code
      };
    }
  }


  /**
   * Parse Postmark inbound webhook payload
   */
  parseInboundEmail(payload: PostmarkInboundEmail): {
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    messageId: string;
    headers: Record<string, string>;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }>;
  } {
    return {
      from: payload.From,
      to: payload.ToFull.map(t => t.Email),
      subject: payload.Subject,
      text: payload.TextBody,
      html: payload.HtmlBody,
      messageId: payload.MessageID,
      headers: payload.Headers.reduce((acc, h) => {
        acc[h.Name.toLowerCase()] = h.Value;
        return acc;
      }, {} as Record<string, string>),
      attachments: payload.Attachments?.map(att => ({
        filename: att.Name,
        content: att.Content,
        contentType: att.ContentType
      }))
    };
  }

  /**
   * Verify webhook signature
   * Validates that the webhook request came from Postmark
   */
  async verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
    if (!this.config.webhookSecret) {
      logger.warn('[PostmarkProvider] No webhook secret configured, skipping verification');
      return true;
    }

    try {
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = hmac.update(payloadString).digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('[PostmarkProvider] Failed to verify webhook signature:', error as Error);
      return false;
    }
  }

  /**
   * Get the Postmark client
   */
  getClient(): any {
    this.ensureInitialized();
    return this.postmarkClient;
  }

  /**
   * Get config
   */
  getConfig(): PostmarkConfig {
    return this.config;
  }

  async dispose(): Promise<void> {
    logger.info('[PostmarkProvider] Disposing');
    this.postmarkClient = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.postmarkClient) {
      return false;
    }

    try {
      // Test connection by getting server info
      await this.postmarkClient.getServer();
      return true;
    } catch (error) {
      logger.error('[PostmarkProvider] Health check failed:', error as Error);
      return false;
    }
  }
}
