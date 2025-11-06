/**
 * SMS Allowlist
 * Database-backed phone number allowlist with in-memory cache
 * Uses unified allowlist table with type='sms'
 */

import { allowlist } from '../../../agent/storage/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { PhoneNumberUtils } from './PhoneNumberUtils';

export class SMSAllowlist {
  private phoneNumbers: Set<string> = new Set();
  private db?: any;

  constructor(db?: any) {
    this.db = db;

    if (this.db) {
      // Load allowlist from database on initialization
      this.loadFromDatabase().catch(err => {
        logger.error('[SMSAllowlist] Failed to load from database', err);
      });
    }
  }

  /**
   * Load allowlist from database
   */
  private async loadFromDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      const rows = await this.db
        .select()
        .from(allowlist)
        .where(eq(allowlist.type, 'sms'));
      this.phoneNumbers = new Set(
        rows.map((row: any) => PhoneNumberUtils.normalize(row.identifier))
      );

      logger.info(`[SMSAllowlist] Loaded ${this.phoneNumbers.size} phone numbers from database`);
    } catch (error) {
      logger.error('[SMSAllowlist] Failed to load from database', error as Error);
    }
  }

  /**
   * Initialize allowlist from database (public method)
   */
  async initialize(): Promise<void> {
    await this.loadFromDatabase();
  }

  /**
   * Add phone number to allowlist
   */
  async add(phoneNumber: string, addedBy: string = 'manual'): Promise<void> {
    const normalized = PhoneNumberUtils.normalize(phoneNumber);

    // Add to cache
    this.phoneNumbers.add(normalized);

    // Persist to database
    if (this.db) {
      try {
        await this.db.insert(allowlist).values({
          identifier: normalized,
          type: 'sms',
          addedBy
        }).onConflictDoNothing(); // Ignore if already exists
      } catch (error) {
        logger.error(`[SMSAllowlist] Error adding ${normalized}`, error as Error);
      }
    }

    logger.info(`[SMSAllowlist] Added: ${normalized} (by: ${addedBy})`);
  }

  /**
   * Check if phone number is allowlisted
   */
  has(phoneNumber: string): boolean {
    const normalized = PhoneNumberUtils.normalize(phoneNumber);
    return this.phoneNumbers.has(normalized);
  }

  /**
   * Remove phone number from allowlist
   */
  async remove(phoneNumber: string): Promise<void> {
    const normalized = PhoneNumberUtils.normalize(phoneNumber);

    // Remove from cache
    this.phoneNumbers.delete(normalized);

    // Remove from database
    if (this.db) {
      try {
        await this.db.delete(allowlist).where(
          and(
            eq(allowlist.identifier, normalized),
            eq(allowlist.type, 'sms')
          )
        );
      } catch (error) {
        logger.error(`[SMSAllowlist] Error removing ${normalized}`, error as Error);
      }
    }

    logger.info(`[SMSAllowlist] Removed: ${normalized}`);
  }

  /**
   * Get all allowlisted phone numbers
   */
  getAll(): string[] {
    return Array.from(this.phoneNumbers);
  }

  /**
   * Get count
   */
  count(): number {
    return this.phoneNumbers.size;
  }

  /**
   * Clear all
   */
  async clear(): Promise<void> {
    this.phoneNumbers.clear();
    if (this.db) {
      try {
        await this.db.delete(allowlist).where(eq(allowlist.type, 'sms'));
      } catch (error) {
        logger.error('[SMSAllowlist] Error clearing', error as Error);
      }
    }
    logger.info('[SMSAllowlist] Cleared all phone numbers');
  }
}
