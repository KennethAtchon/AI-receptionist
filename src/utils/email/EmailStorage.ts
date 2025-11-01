/**
 * Email Storage
 * Handles storing inbound and outbound emails in agent memory
 */

import { logger } from '../logger';
import { EmailHeaderUtils } from './EmailHeaderUtils';
import type { InboundEmailPayload, StoreOutboundEmailOptions } from '../../types/email.types';
import type { MemoryManager } from '../../agent/types';

/**
 * Manages email storage in agent memory
 */
export class EmailStorage {
  /**
   * Store inbound email in agent memory
   *
   * @param email - Inbound email payload
   * @param conversationId - Conversation ID to associate with
   * @param memory - Memory manager instance
   */
  static async storeInboundEmail(
    email: InboundEmailPayload,
    conversationId: string,
    memory: MemoryManager
  ): Promise<void> {
    // Extract thread root (first message ID in References chain)
    const threadRoot = EmailHeaderUtils.extractThreadRoot(email.headers?.references) || email.id;

    // Build content with attachment info if present
    let content = email.text || email.html || '';
    if (email.attachments && email.attachments.length > 0) {
      const attachmentInfo = email.attachments
        .map(att => `[Attachment: ${att.name} (${att.contentType}, ${att.contentLength} bytes)]`)
        .join('\n');
      content = `${content}\n\n${attachmentInfo}`;
    }

    await memory.store({
      id: `msg-${conversationId}-${Date.now()}`,
      content,
      timestamp: new Date(email.receivedAt),
      type: 'conversation',
      channel: 'email',
      role: 'user', // Incoming emails are from the user
      sessionMetadata: {
        conversationId,
        emailId: email.id, // Store email ID for thread detection
        threadRoot, // First message in the thread
        inReplyTo: email.headers?.['in-reply-to'],
        references: email.headers?.references,
        direction: 'inbound',
        from: email.from,
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        subject: email.subject,
        attachments: email.attachments?.map(att => ({
          name: att.name,
          contentType: att.contentType,
          contentLength: att.contentLength,
          contentId: att.contentId
        }))
      }
    });

    logger.info(`[EmailStorage] Stored inbound email in conversation ${conversationId}`, {
      emailId: email.id,
      threadRoot,
      hasReferences: !!email.headers?.references,
      attachmentCount: email.attachments?.length || 0,
      fromName: email.fromName,
      messageStream: email.messageStream,
      hasCc: !!email.cc,
      hasBcc: !!email.bcc
    });
  }

  /**
   * Store outbound email metadata
   * CRITICAL: This ensures we can link future replies to this conversation
   *
   * @param options - Outbound email options
   * @param memory - Memory manager instance
   */
  static async storeOutboundEmail(
    options: StoreOutboundEmailOptions,
    memory: MemoryManager
  ): Promise<void> {
    // Extract thread root from references if available
    const threadRoot = EmailHeaderUtils.extractThreadRoot(options.references) || options.messageId;

    await memory.store({
      id: `msg-${options.conversationId}-${Date.now()}`,
      content: options.body,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'email',
      role: 'assistant', // Outgoing emails are from the assistant
      sessionMetadata: {
        conversationId: options.conversationId,
        emailId: options.messageId, // Store email ID for thread detection
        threadRoot, // First message in the thread
        inReplyTo: options.inReplyTo,
        references: options.references,
        direction: 'outbound',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject
      }
    });

    logger.info(
      `[EmailStorage] Stored outbound email ${options.messageId} in conversation ${options.conversationId}`,
      {
        threadRoot,
        hasReferences: !!options.references
      }
    );
  }
}
