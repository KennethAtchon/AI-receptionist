/**
 * SMS Conversation Matcher
 * Matches SMS conversations by phone number pairs
 */

import { logger } from '../../../utils/logger';
import type { MemoryManager } from '../../../agent/types';
import type { InboundSMSPayload } from '../../../types/sms.types';
import { PhoneNumberUtils } from './PhoneNumberUtils';

export class ConversationMatcher {
  /**
   * Find existing conversation by participants
   * Strategy: Match by normalized phone number pair (from/to)
   */
  static async findConversation(
    sms: InboundSMSPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    const normalizedFrom = PhoneNumberUtils.normalize(sms.from);
    const normalizedTo = PhoneNumberUtils.normalize(sms.to);

    logger.info('[ConversationMatcher] Searching for conversation', {
      from: normalizedFrom,
      to: normalizedTo
    });

    // Get recent SMS messages
    const messages = await memory.search({
      channel: 'sms',
      limit: 100
    });

    // Find matching conversation (bi-directional)
    for (const msg of messages) {
      const metadata = msg.sessionMetadata;
      if (!metadata || !metadata.from || !metadata.to) continue;

      const msgFrom = PhoneNumberUtils.normalize(metadata.from);
      const msgTo = PhoneNumberUtils.normalize(metadata.to);

      // Match: (from, to) or (to, from)
      const matchesForward = msgFrom === normalizedFrom && msgTo === normalizedTo;
      const matchesReverse = msgFrom === normalizedTo && msgTo === normalizedFrom;

      if (matchesForward || matchesReverse) {
        logger.info('[ConversationMatcher] Found existing conversation', {
          conversationId: metadata.conversationId
        });
        return metadata.conversationId ?? null;
      }
    }

    logger.info('[ConversationMatcher] No existing conversation found');
    return null;
  }

  /**
   * Check if phone number has conversation history
   */
  static async hasConversationHistory(
    phoneNumber: string,
    memory: MemoryManager
  ): Promise<boolean> {
    const normalized = PhoneNumberUtils.normalize(phoneNumber);
    const messages = await memory.search({
      channel: 'sms',
      limit: 50
    });

    for (const msg of messages) {
      const metadata = msg.sessionMetadata;
      if (!metadata || !metadata.from || !metadata.to) continue;

      const msgFrom = PhoneNumberUtils.normalize(metadata.from);
      const msgTo = PhoneNumberUtils.normalize(metadata.to);

      if (msgFrom === normalized || msgTo === normalized) {
        return true;
      }
    }

    return false;
  }
}
