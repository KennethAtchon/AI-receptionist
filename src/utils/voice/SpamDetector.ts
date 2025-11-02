/**
 * Spam Detector
 * Detects spam/robocalls using various heuristics
 */

import { logger } from '../logger';
import type { InboundCallPayload, SpamDetectionReport } from '../../types/voice.types';

export class SpamDetector {
  // Known spam caller IDs
  private static SPAM_CALLER_IDS = new Set<string>([
    'Unknown',
    'Private Number',
    'Unavailable',
    'Anonymous',
    'Blocked',
    'Restricted'
  ]);

  // Spam country codes (examples - customize based on your needs)
  private static SPAM_COUNTRY_PREFIXES = new Set<string>([
    // Add specific country codes if needed
    // '+234', // Nigeria (example)
    // '+92',  // Pakistan (example)
  ]);

  /**
   * Detect if call is likely spam
   */
  static async detectSpam(call: InboundCallPayload): Promise<SpamDetectionReport> {
    const reasons: string[] = [];
    let confidence = 0;

    // Check caller ID
    if (this.isSpamCallerID(call.callerName)) {
      reasons.push('Suspicious caller ID');
      confidence += 0.3;
    }

    // Check if from known spam country codes
    if (this.isSpamCountryCode(call.from)) {
      reasons.push('Suspicious country code');
      confidence += 0.2;
    }

    // Check if caller name is missing but should be present
    if (!call.callerName && call.fromCountry === 'US') {
      reasons.push('Missing caller ID for domestic call');
      confidence += 0.1;
    }

    // Check for international calls (optional - adjust based on business needs)
    if (call.fromCountry && call.fromCountry !== 'US' && call.toCountry === 'US') {
      reasons.push('International call');
      confidence += 0.15;
    }

    const isSpam = confidence >= 0.5;
    const shouldBlock = confidence >= 0.7;

    if (isSpam) {
      logger.warn('[SpamDetector] Spam detected', {
        callSid: call.callSid,
        from: call.from,
        confidence: confidence.toFixed(2),
        reasons
      });
    }

    return {
      isSpam,
      confidence,
      reasons: reasons.length > 0 ? reasons : undefined,
      shouldBlock
    };
  }

  /**
   * Check if caller ID looks like spam
   */
  private static isSpamCallerID(callerName?: string): boolean {
    if (!callerName) return false;

    const normalized = callerName.trim().toLowerCase();

    // Check against known spam caller IDs
    for (const spamId of this.SPAM_CALLER_IDS) {
      if (normalized === spamId.toLowerCase()) {
        return true;
      }
    }

    // Check for suspicious patterns
    if (normalized.includes('robo') ||
        normalized.includes('scam') ||
        normalized.includes('spam')) {
      return true;
    }

    return false;
  }

  /**
   * Check if country code is suspicious
   */
  private static isSpamCountryCode(phoneNumber: string): boolean {
    for (const prefix of this.SPAM_COUNTRY_PREFIXES) {
      if (phoneNumber.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Mark number as spam (store in database or blocklist)
   */
  static async markAsSpam(phoneNumber: string): Promise<void> {
    // TODO: Store in database or spam list
    logger.info('[SpamDetector] Marked as spam', { phoneNumber });
  }

  /**
   * Check if number is in spam list
   */
  static async isKnownSpam(phoneNumber: string): Promise<boolean> {
    // TODO: Check against spam database
    return false;
  }

  /**
   * Add custom spam pattern
   */
  static addSpamCallerID(callerName: string): void {
    this.SPAM_CALLER_IDS.add(callerName);
    logger.info('[SpamDetector] Added spam caller ID', { callerName });
  }

  /**
   * Add custom spam country code
   */
  static addSpamCountryCode(countryCode: string): void {
    this.SPAM_COUNTRY_PREFIXES.add(countryCode);
    logger.info('[SpamDetector] Added spam country code', { countryCode });
  }
}
