/**
 * Email Header Utilities
 * Utilities for parsing and formatting email headers (Message-ID, References, etc.)
 */

import { logger } from '../../../utils/logger';

/**
 * Utilities for working with email headers
 */
export class EmailHeaderUtils {
  /**
   * Clean message ID by removing angle brackets and whitespace
   *
   * @param messageId - Message ID to clean
   * @returns Cleaned message ID
   *
   * @example
   * cleanMessageId('<abc123@example.com>') // 'abc123@example.com'
   */
  static cleanMessageId(messageId: string): string {
    return messageId.replace(/^<|>$/g, '').trim();
  }

  /**
   * Normalize message ID for matching - removes domain to match just the UUID part
   * This handles cases where providers store "uuid" but send "uuid@domain.com"
   *
   * @param messageId - Message ID to normalize
   * @returns Normalized message ID (UUID only)
   *
   * @example
   * normalizeMessageIdForMatching('abc123@mtasv.net') // 'abc123'
   */
  static normalizeMessageIdForMatching(messageId: string): string {
    const cleaned = this.cleanMessageId(messageId);
    // Strip domain if present (e.g., "uuid@mtasv.net" → "uuid")
    return cleaned.split('@')[0];
  }

  /**
   * Format message ID to standard email format with angle brackets and domain
   * Ensures Message-IDs are in proper format: <uuid@domain.com>
   *
   * Note: If messageId already contains @, we preserve it as-is (it's the actual Message-ID from the email)
   * Only adds domain for simplified UUIDs (from provider's MessageID field)
   *
   * @param messageId - Message ID to format
   * @param domain - Domain to append if not present (default: 'mtasv.net')
   * @returns Formatted message ID
   *
   * @example
   * formatMessageId('abc123') // '<abc123@mtasv.net>'
   * formatMessageId('abc123@gmail.com') // '<abc123@gmail.com>'
   * formatMessageId('<abc123@gmail.com>') // '<abc123@gmail.com>'
   */
  static formatMessageId(messageId: string, domain: string = 'mtasv.net'): string {
    // Already in proper format with angle brackets
    if (messageId.startsWith('<') && messageId.endsWith('>')) {
      return messageId;
    }

    // Has @ but missing angle brackets - this is the actual Message-ID, just wrap it
    if (messageId.includes('@')) {
      return `<${messageId}>`;
    }

    // Just a UUID - add domain and angle brackets
    // This only happens for old messages or if Message-ID header is missing
    return `<${messageId}@${domain}>`;
  }

  /**
   * Parse Postmark headers from array format to object
   *
   * @param headers - Array of header objects from Postmark
   * @returns Object with lowercase header names as keys
   */
  static parsePostmarkHeaders(headers: Array<{ Name: string; Value: string }>): Record<string, string> {
    const parsed: Record<string, string> = {};
    for (const header of headers) {
      parsed[header.Name.toLowerCase()] = header.Value;
    }
    return parsed;
  }

  /**
   * Build a References header chain for email threading
   *
   * @param existingReferences - Existing References header value
   * @param newMessageId - New message ID to add to the chain
   * @returns Complete References header chain
   *
   * @example
   * buildReferencesChain('<msg1@ex.com> <msg2@ex.com>', '<msg3@ex.com>')
   * // '<msg1@ex.com> <msg2@ex.com> <msg3@ex.com>'
   */
  static buildReferencesChain(existingReferences: string | undefined, newMessageId: string): string {
    const formattedNewId = this.formatMessageId(newMessageId);
    return existingReferences
      ? `${existingReferences} ${formattedNewId}`
      : formattedNewId;
  }

  /**
   * Extract the thread root (first message ID) from References header
   *
   * @param references - References header value
   * @returns First message ID in the chain (thread root)
   */
  static extractThreadRoot(references: string | undefined): string | null {
    if (!references) {
      return null;
    }

    const messageIds = references.split(/\s+/);
    if (messageIds.length === 0) {
      return null;
    }

    return this.cleanMessageId(messageIds[0]);
  }

  /**
   * Parse References header into array of message IDs
   *
   * @param references - References header value
   * @returns Array of cleaned message IDs
   */
  static parseReferences(references: string | undefined): string[] {
    if (!references) {
      return [];
    }

    return references
      .split(/\s+/)
      .map(id => this.cleanMessageId(id))
      .filter(id => id.length > 0);
  }

  /**
   * Clean email subject line (remove Re:, Fwd:, etc. prefixes)
   *
   * @param subject - Subject line to clean
   * @returns Cleaned subject line
   *
   * @example
   * cleanSubject('Re: Re: Fwd: Hello') // 'Hello'
   */
  static cleanSubject(subject: string): string {
    return subject.replace(/^(Re|Fwd|Fw):\s*/gi, '').trim();
  }

  /**
   * Check if subject indicates a reply
   *
   * @param subject - Subject line to check
   * @returns true if subject has Re: prefix
   */
  static isReply(subject: string): boolean {
    return /^Re:/i.test(subject);
  }

  /**
   * Check if subject indicates a forward
   *
   * @param subject - Subject line to check
   * @returns true if subject has Fwd: or Fw: prefix
   */
  static isForward(subject: string): boolean {
    return /^(Fwd|Fw):/i.test(subject);
  }

  /**
   * Normalize subject for comparison (useful for finding conversations)
   *
   * @param subject - Subject line to normalize
   * @returns Normalized subject (lowercase, no prefixes)
   */
  static normalizeSubject(subject: string): string {
    return this.cleanSubject(subject).toLowerCase();
  }
}
