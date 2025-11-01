/**
 * Email Auto-Reply Detector
 * Detects out-of-office and automated email responses to prevent email loops
 */

import { logger } from '../logger';

export interface EmailHeaders {
  'auto-submitted'?: string;
  'x-auto-response-suppress'?: string;
  'precedence'?: string;
  'x-autorespond'?: string;
  [key: string]: string | undefined;
}

/**
 * Detects if an email is an auto-reply/out-of-office message
 * Checks multiple headers according to RFC 3834 and vendor-specific implementations
 */
export class EmailAutoReplyDetector {
  /**
   * Check if an email is an auto-reply based on standard headers
   *
   * @param headers - Email headers object
   * @returns true if email is detected as auto-reply, false otherwise
   */
  static isAutoReply(headers?: EmailHeaders): boolean {
    if (!headers) {
      return false;
    }

    // Check 1: Auto-Submitted header (RFC 3834)
    // Values: "auto-generated", "auto-replied", "auto-notified"
    // Exception: "no" means it's NOT an auto-reply
    if (headers['auto-submitted'] && headers['auto-submitted'] !== 'no') {
      logger.info('[EmailAutoReplyDetector] Detected auto-reply via Auto-Submitted header', {
        value: headers['auto-submitted']
      });
      return true;
    }

    // Check 2: X-Auto-Response-Suppress header (Microsoft)
    // Values: "All", "OOF" (out-of-office), "DR" (delivery report), "RN" (read notification), "NRN", "AutoReply"
    if (headers['x-auto-response-suppress']) {
      const suppressValue = headers['x-auto-response-suppress'].toLowerCase();
      if (suppressValue.includes('all') || suppressValue.includes('oof')) {
        logger.info('[EmailAutoReplyDetector] Detected auto-reply via X-Auto-Response-Suppress header', {
          value: headers['x-auto-response-suppress']
        });
        return true;
      }
    }

    // Check 3: Precedence header
    // Values: "auto-reply", "bulk", "junk", "list"
    if (headers['precedence']) {
      const precedence = headers['precedence'].toLowerCase();
      if (precedence.match(/auto-reply|bulk|junk|list/)) {
        logger.info('[EmailAutoReplyDetector] Detected auto-reply via Precedence header', {
          value: headers['precedence']
        });
        return true;
      }
    }

    // Check 4: X-Autorespond header (generic)
    if (headers['x-autorespond']) {
      logger.info('[EmailAutoReplyDetector] Detected auto-reply via X-Autorespond header');
      return true;
    }

    return false;
  }

  /**
   * Get a detailed report about why an email was flagged as auto-reply
   *
   * @param headers - Email headers object
   * @returns Object with detection details
   */
  static getDetectionReport(headers?: EmailHeaders): {
    isAutoReply: boolean;
    reasons: string[];
    headers: Record<string, string>;
  } {
    const reasons: string[] = [];
    const detectedHeaders: Record<string, string> = {};

    if (!headers) {
      return { isAutoReply: false, reasons: [], headers: {} };
    }

    // Check Auto-Submitted
    if (headers['auto-submitted'] && headers['auto-submitted'] !== 'no') {
      reasons.push(`Auto-Submitted: ${headers['auto-submitted']}`);
      detectedHeaders['auto-submitted'] = headers['auto-submitted'];
    }

    // Check X-Auto-Response-Suppress
    if (headers['x-auto-response-suppress']) {
      const suppressValue = headers['x-auto-response-suppress'].toLowerCase();
      if (suppressValue.includes('all') || suppressValue.includes('oof')) {
        reasons.push(`X-Auto-Response-Suppress: ${headers['x-auto-response-suppress']}`);
        detectedHeaders['x-auto-response-suppress'] = headers['x-auto-response-suppress'];
      }
    }

    // Check Precedence
    if (headers['precedence']) {
      const precedence = headers['precedence'].toLowerCase();
      if (precedence.match(/auto-reply|bulk|junk|list/)) {
        reasons.push(`Precedence: ${headers['precedence']}`);
        detectedHeaders['precedence'] = headers['precedence'];
      }
    }

    // Check X-Autorespond
    if (headers['x-autorespond']) {
      reasons.push('X-Autorespond header present');
      detectedHeaders['x-autorespond'] = headers['x-autorespond'];
    }

    return {
      isAutoReply: reasons.length > 0,
      reasons,
      headers: detectedHeaders
    };
  }

  /**
   * Check if we should suppress auto-reply based on subject line patterns
   *
   * @param subject - Email subject line
   * @returns true if subject indicates auto-reply
   */
  static isAutoReplySubject(subject?: string): boolean {
    if (!subject) {
      return false;
    }

    const autoReplyPatterns = [
      /^(out of office|ooo|away|vacation|automatic reply)/i,
      /^(delivery status notification|mail delivery)/i,
      /^(undelivered|returned mail|failure notice)/i,
      /^(auto-?reply|automatic response)/i
    ];

    return autoReplyPatterns.some(pattern => pattern.test(subject));
  }
}
