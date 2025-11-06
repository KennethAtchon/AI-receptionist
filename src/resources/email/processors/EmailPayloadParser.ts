/**
 * Email Payload Parser
 * Handles parsing of provider-specific webhook payloads into standardized format
 */

import { logger } from '../../../utils/logger';
import { EmailHeaderUtils } from './EmailHeaderUtils';
import type { InboundEmailPayload, EmailAttachment } from '../../../types/email.types';
import type { WebhookContext } from '../../base.resource';

/**
 * Parses email provider webhooks into a standardized InboundEmailPayload format
 */
export class EmailPayloadParser {
  /**
   * Parse webhook payload from any supported provider
   * Currently supports: Postmark
   */
  static parse(context: WebhookContext): InboundEmailPayload {
    switch (context.provider) {
      case 'postmark':
        return this.parsePostmark(context);
      default:
        throw new Error(
          `Unsupported email provider for webhooks: ${context.provider}. Only Postmark is supported.`
        );
    }
  }

  /**
   * Parse Postmark inbound webhook payload
   */
  private static parsePostmark(context: WebhookContext): InboundEmailPayload {
    const payload = context.payload;

    // Parse headers first to extract the actual Message-ID
    const headers = payload.Headers
      ? EmailHeaderUtils.parsePostmarkHeaders(payload.Headers)
      : {};

    // CRITICAL: Extract the actual Message-ID from email headers
    // Postmark's MessageID field is a simplified UUID, but the actual Message-ID header
    // contains the full Message-ID as sent by the email client (e.g., Outlook, Gmail)
    // This is essential for proper email threading
    let actualMessageId = payload.MessageID;

    if (headers['message-id']) {
      // Extract Message-ID from headers and clean it
      actualMessageId = EmailHeaderUtils.cleanMessageId(headers['message-id']);
      logger.debug('[EmailPayloadParser] Using actual Message-ID from headers', {
        postmarkMessageId: payload.MessageID,
        actualMessageId,
        headerValue: headers['message-id']
      });
    } else {
      logger.warn('[EmailPayloadParser] No Message-ID header found, using Postmark MessageID', {
        postmarkMessageId: payload.MessageID
      });
    }

    return {
      id: actualMessageId,
      from: payload.From || payload.FromFull?.Email,
      to: payload.To || (payload.ToFull ? payload.ToFull.map((t: any) => t.Email) : []),
      subject: payload.Subject,
      text: payload.TextBody,
      html: payload.HtmlBody,
      headers,
      attachments: payload.Attachments
        ? this.parsePostmarkAttachments(payload.Attachments)
        : [],
      receivedAt: payload.Date || new Date().toISOString(),

      // Extended Postmark fields
      fromName: payload.FromName,
      fromFull: payload.FromFull
        ? {
            email: payload.FromFull.Email,
            name: payload.FromFull.Name,
            mailboxHash: payload.FromFull.MailboxHash
          }
        : undefined,
      toFull: payload.ToFull?.map((t: any) => ({
        email: t.Email,
        name: t.Name,
        mailboxHash: t.MailboxHash
      })),
      cc: payload.Cc,
      ccFull: payload.CcFull?.map((c: any) => ({
        email: c.Email,
        name: c.Name,
        mailboxHash: c.MailboxHash
      })),
      bcc: payload.Bcc,
      bccFull: payload.BccFull?.map((b: any) => ({
        email: b.Email,
        name: b.Name,
        mailboxHash: b.MailboxHash
      })),
      replyTo: payload.ReplyTo,
      messageStream: payload.MessageStream,
      originalRecipient: payload.OriginalRecipient,
      mailboxHash: payload.MailboxHash,
      tag: payload.Tag,
      strippedTextReply: payload.StrippedTextReply,

      // Store entire raw payload for debugging and advanced use cases
      rawPayload: payload
    };
  }

  /**
   * Parse Postmark attachment format
   */
  private static parsePostmarkAttachments(
    attachments: Array<{
      Name: string;
      Content: string;
      ContentType: string;
      ContentLength: number;
      ContentID?: string;
    }>
  ): EmailAttachment[] {
    return attachments.map(att => ({
      name: att.Name,
      contentType: att.ContentType,
      contentLength: att.ContentLength,
      content: att.Content, // Base64 encoded
      contentId: att.ContentID
    }));
  }
}
