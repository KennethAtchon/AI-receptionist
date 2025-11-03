/**
 * Email Resource Types
 * Type definitions for email operations, sessions, and payloads
 */

import type { ResourceSession } from '../resources/base.resource';

export interface EmailSession extends ResourceSession {
  messageId?: string;
  threadId?: string;
  to: string | string[];
  from?: string;
  subject?: string;
  direction: 'inbound' | 'outbound';
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  contentLength: number;
  content?: string; // Base64 encoded content
  contentId?: string; // For inline images
  url?: string; // Download URL (provider-specific)
}

export interface InboundEmailPayload {
  id: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  receivedAt: string;

  // Extended Postmark fields
  fromName?: string;
  fromFull?: {
    email: string;
    name: string;
    mailboxHash?: string;
  };
  toFull?: Array<{
    email: string;
    name: string;
    mailboxHash?: string;
  }>;
  cc?: string;
  ccFull?: Array<{
    email: string;
    name: string;
    mailboxHash?: string;
  }>;
  bcc?: string;
  bccFull?: Array<{
    email: string;
    name: string;
    mailboxHash?: string;
  }>;
  replyTo?: string;
  messageStream?: string;
  originalRecipient?: string;
  mailboxHash?: string;
  tag?: string;
  strippedTextReply?: string;

  // Raw payload for provider-specific data
  rawPayload?: any;
}

/**
 * Options for handling incoming email webhooks
 */
export interface EmailWebhookOptions {
  /**
   * Additional instructions for the AI (per-email customization)
   */
  instructions?: string;

  /**
   * Enable/disable auto-reply (default: true)
   */
  autoReply?: boolean;
}

/**
 * Result from handling an email webhook
 */
export interface EmailWebhookResult {
  conversationId: string;
  emailId: string;
  autoReplied: boolean;
}

/**
 * Options for storing outbound email metadata
 */
export interface StoreOutboundEmailOptions {
  messageId: string;
  conversationId: string;
  to: string | string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
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
  from?: string;
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
 * Options for sending bulk emails
 */
export interface BulkEmailOptions {
  emails: Array<{
    to: string;
    subject: string;
    body: string;
    tag?: string;
    metadata?: Record<string, string>;
  }>;
  chunkSize?: number; // For auto-chunking
}
