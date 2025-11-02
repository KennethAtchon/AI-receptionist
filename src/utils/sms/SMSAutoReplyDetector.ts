/**
 * SMS Auto-Reply Detector
 * Detects auto-reply messages and opt-out keywords to prevent loops
 */

import { logger } from '../logger';
import type { SMSAutoReplyReport } from '../../types/sms.types';

export class SMSAutoReplyDetector {
  /**
   * Keywords that indicate auto-reply or opt-out
   */
  private static AUTO_REPLY_KEYWORDS = [
    'stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit',
    'out of office', 'ooo', 'automatic reply', 'auto-reply',
    'vacation', 'away message'
  ];

  /**
   * Opt-in keywords
   */
  private static OPT_IN_KEYWORDS = [
    'start', 'unstop', 'subscribe', 'yes'
  ];

  /**
   * Check if message is auto-reply or contains opt-out keyword
   */
  static isAutoReply(body: string): SMSAutoReplyReport {
    const lowerBody = body.toLowerCase().trim();
    const detectedKeywords: string[] = [];

    // Check for auto-reply keywords
    for (const keyword of this.AUTO_REPLY_KEYWORDS) {
      if (lowerBody.includes(keyword) || lowerBody === keyword) {
        detectedKeywords.push(keyword);
      }
    }

    const isAutoReply = detectedKeywords.length > 0;

    if (isAutoReply) {
      logger.info('[SMSAutoReplyDetector] Auto-reply detected', {
        keywords: detectedKeywords,
        body: body.substring(0, 50)
      });
    }

    return {
      isAutoReply,
      detectedKeywords: isAutoReply ? detectedKeywords : undefined,
      keywordMatches: isAutoReply ? detectedKeywords : undefined
    };
  }

  /**
   * Check if message is opt-in request
   */
  static isOptIn(body: string): boolean {
    const lowerBody = body.toLowerCase().trim();

    for (const keyword of this.OPT_IN_KEYWORDS) {
      if (lowerBody === keyword) {
        logger.info('[SMSAutoReplyDetector] Opt-in detected', { keyword });
        return true;
      }
    }

    return false;
  }

  /**
   * Check if message is STOP command
   */
  static isStop(body: string): boolean {
    const lowerBody = body.toLowerCase().trim();
    return ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'].includes(lowerBody);
  }

  /**
   * Check if message is START command
   */
  static isStart(body: string): boolean {
    const lowerBody = body.toLowerCase().trim();
    return ['start', 'unstop', 'yes'].includes(lowerBody);
  }
}
