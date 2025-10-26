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
  // Inbound webhook configuration
  inboundWebhook?: {
    url: string;
    secret?: string;
  };
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

      // Configure inbound webhook if provided
      if (this.config.inboundWebhook) {
        await this.configureInboundWebhook();
      }
    } catch (error) {
      logger.error('[PostmarkProvider] Failed to load SDK:', error as Error);
      throw error;
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    this.ensureInitialized();

    try {
      const response = await this.postmarkClient.sendEmail({
        From: params.from || `${this.config.fromName || 'No Reply'} <${this.config.fromEmail}>`,
        To: Array.isArray(params.to) ? params.to.join(',') : params.to,
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
        to: params.to
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
   * Configure inbound email webhook
   * Sets up Postmark to forward incoming emails to the webhook URL
   */
  async configureInboundWebhook(): Promise<void> {
    if (!this.config.inboundWebhook) {
      return;
    }

    try {
      logger.info('[PostmarkProvider] Configuring inbound webhook', {
        url: this.config.inboundWebhook.url
      });

      // Note: Postmark inbound webhooks are configured per "inbound domain" in the dashboard
      // The SDK doesn't provide direct API access to modify inbound webhook settings
      // This method serves as documentation and validation

      // Validate webhook URL format
      const url = new URL(this.config.inboundWebhook.url);
      if (!url.protocol.startsWith('http')) {
        throw new Error('Webhook URL must use HTTP or HTTPS');
      }

      logger.info('[PostmarkProvider] Inbound webhook validated. Configure in Postmark dashboard:', {
        url: this.config.inboundWebhook.url,
        documentation: 'https://postmarkapp.com/developer/webhooks/inbound-webhook'
      });
    } catch (error) {
      logger.error('[PostmarkProvider] Failed to configure inbound webhook:', error as Error);
      throw error;
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
    if (!this.config.inboundWebhook?.secret) {
      logger.warn('[PostmarkProvider] No webhook secret configured, skipping verification');
      return true;
    }

    try {
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', this.config.inboundWebhook.secret);
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
