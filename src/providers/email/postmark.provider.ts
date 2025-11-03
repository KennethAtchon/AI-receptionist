/**
 * Postmark Email Provider
 * Modern email provider with excellent inbound webhook support
 * Primary email provider for the AI Receptionist SDK
 */

import { BaseProvider } from '../base.provider';
import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { logger } from '../../utils/logger';
import type { MessageSendingResponse } from 'postmark/dist/client/models/message/Message';

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
 * Bulk email message format
 */
export interface BulkEmailMessage {
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  tag?: string;
  metadata?: Record<string, string>;
  from?: string; // Optional override
  replyTo?: string;
}

/**
 * Bulk email result format
 */
export interface BulkEmailResult {
  to: string;
  messageId?: string;
  errorCode?: number;
  message?: string;
  success: boolean;
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

      const fromAddress = params.from || `${this.config.fromName || 'No Reply'} <${this.config.fromEmail}>`;
      const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
      const attachments = params.attachments?.map(att => ({
        Name: att.filename,
        Content: att.content ? Buffer.from(att.content).toString('base64') : undefined,
        ContentType: att.contentType || 'application/octet-stream'
      }));
      const headers = params.headers ? Object.entries(params.headers).map(([Name, Value]) => ({ Name, Value })) : undefined;

      logger.info('[PostmarkProvider] Sending email via Postmark', {
        to: toAddresses,
        from: fromAddress,
        replyTo: params.replyTo || this.config.replyTo || undefined,
        subject: params.subject,
        cc: ccList.length > 0 ? ccList : undefined,
        hasTextBody: !!params.text,
        hasHtmlBody: !!params.html,
        textBodyLength: params.text?.length || 0,
        htmlBodyLength: params.html?.length || 0,
        attachmentCount: attachments?.length || 0,
        attachments: attachments?.map(a => ({ name: a.Name, contentType: a.ContentType })) || undefined,
        headers: headers ? headers.reduce((acc, h) => ({ ...acc, [h.Name]: h.Value }), {} as Record<string, string>) : undefined,
        tags: params.tags || undefined,
        archiveCc: this.config.archiveCc || undefined
      });

      const response = await this.postmarkClient.sendEmail({
        From: fromAddress,
        To: toAddresses.join(','),
        Cc: ccList.length > 0 ? ccList.join(',') : undefined,
        ReplyTo: params.replyTo || this.config.replyTo,
        Subject: params.subject,
        TextBody: params.text,
        HtmlBody: params.html,
        Attachments: attachments,
        Headers: headers,
        Tag: params.tags?.[0], // Postmark supports single tag per email
        Metadata: params.tags ? { tags: params.tags.join(',') } : undefined
      });

      // Note: Postmark returns MessageID as UUID only (e.g., "249f3e6e-251c-48c0-948b-130b94baf4da")
      // This is Postmark's internal tracking ID. When Postmark sends the email, it generates
      // a proper Message-ID header in the format <uuid@mtasv.net> which is what recipients see.
      // For threading, always use the actual Message-ID from email headers, not this UUID.
      logger.info('[PostmarkProvider] Email sent successfully', {
        messageId: response.MessageID, // Postmark's internal tracking ID
        messageIdInEmailHeaders: `<${response.MessageID}@mtasv.net>`, // Actual Message-ID header that Postmark adds
        to: toAddresses,
        from: fromAddress,
        subject: params.subject,
        cc: ccList.length > 0 ? ccList : undefined,
        inReplyTo: params.headers?.['In-Reply-To'] || params.headers?.['in-reply-to'] || undefined,
        references: params.headers?.References || params.headers?.references || undefined,
        attachmentCount: attachments?.length || 0
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
   *
   * IMPORTANT: Extracts the actual Message-ID from Headers array, not Postmark's MessageID field.
   * Postmark's MessageID is a simplified UUID for internal tracking, but the actual Message-ID
   * header contains the full Message-ID as sent by the email client (Outlook, Gmail, etc.).
   * This is critical for proper email threading.
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
    // Parse headers first
    const headers = payload.Headers.reduce((acc, h) => {
      acc[h.Name.toLowerCase()] = h.Value;
      return acc;
    }, {} as Record<string, string>);

    // Extract actual Message-ID from headers, fallback to Postmark's MessageID
    const actualMessageId = headers['message-id']
      ? headers['message-id'].replace(/^<|>$/g, '').trim()
      : payload.MessageID;

    return {
      from: payload.From,
      to: payload.ToFull.map(t => t.Email),
      subject: payload.Subject,
      text: payload.TextBody,
      html: payload.HtmlBody,
      messageId: actualMessageId,
      headers,
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

  /**
   * Send batch emails (up to 500 per request)
   * Uses Postmark's sendEmailBatch endpoint
   */
  async sendBulk(messages: BulkEmailMessage[]): Promise<BulkEmailResult[]> {
    this.ensureInitialized();

    // Validate batch size (Postmark limit: 500)
    if (messages.length > 500) {
      throw new Error('Postmark batch limit is 500 emails per request');
    }

    try {
      // Convert to Postmark format
      const batch = messages.map(msg => ({
        From: msg.from || `${this.config.fromName || 'No Reply'} <${this.config.fromEmail}>`,
        To: msg.to,
        Subject: msg.subject,
        HtmlBody: msg.htmlBody,
        TextBody: msg.textBody,
        Tag: msg.tag,
        Metadata: msg.metadata,
        ReplyTo: msg.replyTo,
        MessageStream: 'outbound'
      }));

      logger.info('[PostmarkProvider] Sending bulk emails', {
        count: messages.length,
        to: messages.map(m => m.to)
      });

      // Send batch
      const results: MessageSendingResponse[] = await this.postmarkClient.sendEmailBatch(batch);

      logger.info('[PostmarkProvider] Bulk emails sent', {
        count: results.length,
        successful: results.filter((r: MessageSendingResponse) => r.ErrorCode === 0).length,
        failed: results.filter((r: MessageSendingResponse) => r.ErrorCode !== 0).length
      });

      // Convert to unified format
      return results.map((result: MessageSendingResponse, index: number) => ({
        to: messages[index].to,
        messageId: result.MessageID,
        errorCode: result.ErrorCode,
        message: result.Message,
        success: result.ErrorCode === 0
      }));
    } catch (error: any) {
      logger.error('[PostmarkProvider] Failed to send bulk emails:', error);
      throw error;
    }
  }

  /**
   * Send batch emails in chunks (for > 500 emails)
   * Automatically handles rate limiting between chunks
   */
  async sendBulkChunked(
    messages: BulkEmailMessage[],
    chunkSize = 500
  ): Promise<BulkEmailResult[]> {
    this.ensureInitialized();

    const results: BulkEmailResult[] = [];

    logger.info('[PostmarkProvider] Sending chunked bulk emails', {
      totalCount: messages.length,
      chunkSize,
      chunks: Math.ceil(messages.length / chunkSize)
    });

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const chunkResults = await this.sendBulk(chunk);
      results.push(...chunkResults);

      // Rate limiting: wait between chunks
      if (i + chunkSize < messages.length) {
        logger.info('[PostmarkProvider] Waiting 1s before next chunk...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('[PostmarkProvider] Chunked bulk emails completed', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
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
