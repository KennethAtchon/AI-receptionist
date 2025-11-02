/**
 * Caller Matcher
 * Matches voice calls by phone number pairs
 */

import { logger } from '../logger';
import type { MemoryManager } from '../../types';
import type { InboundCallPayload } from '../../types/voice.types';
import { PhoneNumberUtils } from '../sms/PhoneNumberUtils';

export class CallerMatcher {
  /**
   * Find existing conversation by participants
   * Strategy: Match by normalized phone number pair (from/to)
   */
  static async findConversation(
    call: InboundCallPayload,
    memory: MemoryManager
  ): Promise<string | null> {
    const normalizedFrom = PhoneNumberUtils.normalize(call.from);
    const normalizedTo = PhoneNumberUtils.normalize(call.to);

    logger.info('[CallerMatcher] Searching for conversation', {
      from: normalizedFrom,
      to: normalizedTo
    });

    // Get recent call messages
    const messages = await memory.search({
      channel: 'call',
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
        logger.info('[CallerMatcher] Found existing conversation', {
          conversationId: metadata.conversationId
        });
        return metadata.conversationId ?? null;
      }
    }

    logger.info('[CallerMatcher] No existing conversation found');
    return null;
  }

  /**
   * Check if phone number has call history
   */
  static async hasCallHistory(
    phoneNumber: string,
    memory: MemoryManager
  ): Promise<boolean> {
    const normalized = PhoneNumberUtils.normalize(phoneNumber);
    const messages = await memory.search({
      channel: 'call',
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

  /**
   * Get recent calls from phone number
   */
  static async getRecentCalls(
    phoneNumber: string,
    memory: MemoryManager,
    limit: number = 10
  ): Promise<any[]> {
    const normalized = PhoneNumberUtils.normalize(phoneNumber);
    const messages = await memory.search({
      channel: 'call',
      limit: 100
    });

    const calls = messages.filter(msg => {
      const metadata = msg.sessionMetadata;
      if (!metadata || !metadata.from || !metadata.to) return false;

      const msgFrom = PhoneNumberUtils.normalize(metadata.from);
      const msgTo = PhoneNumberUtils.normalize(metadata.to);

      return msgFrom === normalized || msgTo === normalized;
    });

    return calls.slice(0, limit);
  }
}
