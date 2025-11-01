/**
 * Conversation Matcher
 * Handles email thread detection and conversation matching logic
 */

import { logger } from '../logger';
import { EmailHeaderUtils } from './EmailHeaderUtils';
import type { InboundEmailPayload } from '../../types/email.types';
import type { MemoryManager } from '../../agent/types';

/**
 * Finds existing conversations based on email threading headers and metadata
 */
export class ConversationMatcher {
  /**
   * Find conversation by analyzing email headers and metadata
   * Uses multiple strategies in priority order:
   * 1. In-Reply-To header
   * 2. References header chain
   * 3. Subject line matching
   * 4. Participant matching
   */
  static async findConversation(
    email: InboundEmailPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    logger.debug('[ConversationMatcher] Thread analysis', {
      inReplyTo: email.headers?.['in-reply-to'],
      references: email.headers?.references,
      subject: email.subject,
      from: email.from
    });

    // Method 1: Check In-Reply-To header (standard email threading)
    const conversationByInReplyTo = await this.findByInReplyTo(email, memory);
    if (conversationByInReplyTo) {
      return conversationByInReplyTo;
    }

    // Method 2: Check References header (full thread history)
    const conversationByReferences = await this.findByReferences(email, memory);
    if (conversationByReferences) {
      return conversationByReferences;
    }

    // Method 3: Check subject line (Re:, Fwd:, Fw: prefixes)
    const conversationBySubject = await this.findBySubject(email, memory);
    if (conversationBySubject) {
      return conversationBySubject;
    }

    // Method 4: Check from/to participants (for ongoing conversations)
    const conversationByParticipants = await this.findByParticipants(email, memory);
    if (conversationByParticipants) {
      return conversationByParticipants;
    }

    // No match found
    logger.info(`[ConversationMatcher] No existing conversation found for ${email.from}`, {
      subject: email.subject,
      messageId: email.id,
      hadInReplyTo: !!email.headers?.['in-reply-to'],
      hadReferences: !!email.headers?.references
    });

    return null;
  }

  /**
   * Find conversation by In-Reply-To header
   */
  private static async findByInReplyTo(
    email: InboundEmailPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    if (!email.headers?.['in-reply-to']) {
      return null;
    }

    const cleanMessageId = EmailHeaderUtils.cleanMessageId(email.headers['in-reply-to']);
    const normalizedMessageId = EmailHeaderUtils.normalizeMessageIdForMatching(cleanMessageId);

    // Try exact match first
    let conversationId = await ConversationMatcher.findConversationByMessageId(cleanMessageId, memory);

    // If not found and message has domain, try without domain (UUID only)
    if (!conversationId && cleanMessageId !== normalizedMessageId) {
      conversationId = await ConversationMatcher.findConversationByMessageId(normalizedMessageId, memory);
    }

    if (conversationId) {
      logger.info(`[ConversationMatcher] Found conversation via In-Reply-To: ${conversationId}`, {
        messageId: cleanMessageId,
        normalizedMessageId
      });
      return conversationId;
    }

    return null;
  }

  /**
   * Find conversation by References header chain
   */
  private static async findByReferences(
    email: InboundEmailPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    if (!email.headers?.references) {
      return null;
    }

    const messageIds = EmailHeaderUtils.parseReferences(email.headers.references);
    logger.debug('[ConversationMatcher] Checking References chain', {
      messageIds,
      count: messageIds.length
    });

    for (const msgId of messageIds) {
      const normalizedMsgId = EmailHeaderUtils.normalizeMessageIdForMatching(msgId);

      // Try exact match first
      let conversationId = await ConversationMatcher.findConversationByMessageId(msgId, memory);

      // If not found and message has domain, try without domain (UUID only)
      if (!conversationId && msgId !== normalizedMsgId) {
        conversationId = await ConversationMatcher.findConversationByMessageId(normalizedMsgId, memory);
      }

      if (conversationId) {
        logger.info(`[ConversationMatcher] Found conversation via References: ${conversationId}`, {
          matchedMessageId: msgId,
          normalizedMessageId: normalizedMsgId
        });
        return conversationId;
      }
    }

    return null;
  }

  /**
   * Find conversation by subject line
   */
  private static async findBySubject(
    email: InboundEmailPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    // Check if subject indicates a reply or forward
    const isReply = EmailHeaderUtils.isReply(email.subject);
    const isForward = EmailHeaderUtils.isForward(email.subject);

    if (!isReply && !isForward) {
      return null;
    }

    const cleanSubject = EmailHeaderUtils.cleanSubject(email.subject);
    const normalizedSearchSubject = EmailHeaderUtils.normalizeSubject(email.subject);

    // First try: Search only emails from this sender (database query optimization)
    const memoriesFromSender = await memory.search({
      channel: 'email',
      sessionMetadata: { from: email.from },
      limit: 100,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    // Filter by normalized subject
    let match = memoriesFromSender.find(
      m =>
        m.sessionMetadata?.subject &&
        EmailHeaderUtils.normalizeSubject(m.sessionMetadata.subject) === normalizedSearchSubject
    );

    if (match) {
      logger.info(`[ConversationMatcher] Found conversation via subject matching: ${match.sessionMetadata?.conversationId}`);
      return match.sessionMetadata?.conversationId || null;
    }

    // Second try: Search all emails (for forwarded emails from different senders)
    const allMemories = await memory.search({
      channel: 'email',
      limit: 100,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    match = allMemories.find(
      m =>
        m.sessionMetadata?.subject &&
        EmailHeaderUtils.normalizeSubject(m.sessionMetadata.subject) === normalizedSearchSubject
    );

    if (match) {
      logger.info(`[ConversationMatcher] Found conversation via subject matching (all): ${match.sessionMetadata?.conversationId}`);
      return match.sessionMetadata?.conversationId || null;
    }

    return null;
  }

  /**
   * Find conversation by participants (from/to)
   */
  private static async findByParticipants(
    email: InboundEmailPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    const toArray = Array.isArray(email.to) ? email.to : [email.to];

    // Search directly in database using JSONB query for sender
    const memories = await memory.search({
      channel: 'email',
      sessionMetadata: { from: email.from },
      limit: 50,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    // Filter by recipient (can't use JSONB query since 'to' could be comma-separated string)
    const match = memories.find(m => toArray.includes(m.sessionMetadata?.to || ''));

    if (match) {
      logger.info(`[ConversationMatcher] Found conversation via participants: ${match.sessionMetadata?.conversationId}`);
      return match.sessionMetadata?.conversationId || null;
    }

    return null;
  }

  /**
   * Find conversation by message ID
   */
  static async findConversationByMessageId(
    messageId: string,
    memory: MemoryManager
  ): Promise<string | null> {
    // Search directly in database using JSONB query for emailId
    const memories = await memory.search({
      channel: 'email',
      sessionMetadata: { emailId: messageId },
      limit: 1 // Only need the first match
    });

    return memories[0]?.sessionMetadata?.conversationId || null;
  }

  /**
   * Check if we have any conversation history with an email address
   */
  static async hasConversationHistory(email: string, memory: MemoryManager): Promise<boolean> {
    // First check: emails sent FROM this address
    const memoriesFrom = await memory.search({
      channel: 'email',
      sessionMetadata: { from: email },
      limit: 1
    });

    if (memoriesFrom.length > 0) {
      return true;
    }

    // Second check: emails sent TO this address (requires in-memory filtering since 'to' is comma-separated)
    const memoriesTo = await memory.search({
      channel: 'email',
      limit: 50,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });

    return memoriesTo.some(m => m.sessionMetadata?.to && m.sessionMetadata.to.includes(email));
  }
}
