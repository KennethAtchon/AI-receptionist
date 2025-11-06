/**
 * Phone Number Utilities
 * Normalize and format phone numbers for matching
 */

import { logger } from '../../../utils/logger';

export class PhoneNumberUtils {
  /**
   * Normalize phone number for matching
   * Examples:
   *   +1 (234) 567-8900 → +12345678900
   *   1234567890 → +11234567890
   *   +1234567890 → +1234567890
   */
  static normalize(phoneNumber: string): string {
    // Remove all non-digit characters except leading +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure E.164 format (+1234567890)
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Add +1 for US numbers (default)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    // Return as-is with + prefix
    return `+${cleaned}`;
  }

  /**
   * Format phone number for display
   * +12345678900 → +1 (234) 567-8900
   */
  static format(phoneNumber: string): string {
    const normalized = this.normalize(phoneNumber);

    // US number formatting
    if (normalized.startsWith('+1') && normalized.length === 12) {
      const digits = normalized.slice(2);
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // International format
    return normalized;
  }

  /**
   * Validate E.164 format
   */
  static isValid(phoneNumber: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Extract country code
   */
  static getCountryCode(phoneNumber: string): string | null {
    const normalized = this.normalize(phoneNumber);

    // US/Canada
    if (normalized.startsWith('+1')) return '+1';

    // UK
    if (normalized.startsWith('+44')) return '+44';

    // Add more as needed

    return null;
  }
}
