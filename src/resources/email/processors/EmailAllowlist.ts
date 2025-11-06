/**
 * Email Allowlist Utility
 * Manages persistent allowlist for email auto-replies
 * Uses unified allowlist table with type='email'
 */

import { allowlist } from '../../../agent/storage/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

export class EmailAllowlist {
  // In-memory cache for fast lookups
  private cache: Set<string> = new Set();
  private db: any; // Database instance

  constructor(db?: any) {
    this.db = db;

    if (this.db) {
      // Load allowlist from database on initialization
      this.loadFromDatabase().catch(err => {
        logger.error('[EmailAllowlist] Failed to load from database', err);
      });
    } else {
      logger.warn('[EmailAllowlist] No database available for persistence');
    }
  }

  /**
   * Load allowlist from database into memory cache
   */
  private async loadFromDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      const result = await this.db
        .select()
        .from(allowlist)
        .where(eq(allowlist.type, 'email'));
      this.cache = new Set(result.map((row: any) => row.identifier.toLowerCase()));
      logger.info(`[EmailAllowlist] Loaded ${this.cache.size} emails from database`);
    } catch (error) {
      logger.error('[EmailAllowlist] Error loading from database', error as Error);
    }
  }

  /**
   * Add an email to the allowlist (persists to database)
   */
  async add(email: string, addedBy: string = 'conversation_init'): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Add to cache
    this.cache.add(normalizedEmail);

    // Persist to database
    if (this.db) {
      try {
        await this.db.insert(allowlist).values({
          identifier: normalizedEmail,
          type: 'email',
          addedBy
        }).onConflictDoNothing(); // Ignore if already exists

        logger.info(`[EmailAllowlist] Added ${normalizedEmail} (${addedBy})`);
      } catch (error) {
        logger.error(`[EmailAllowlist] Error adding ${normalizedEmail}`, error as Error);
      }
    }
  }

  /**
   * Check if an email is in the allowlist (O(1) lookup)
   */
  has(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    return this.cache.has(normalizedEmail);
  }

  /**
   * Remove an email from the allowlist (removes from database)
   */
  async remove(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Remove from cache
    this.cache.delete(normalizedEmail);

    // Remove from database
    if (this.db) {
      try {
        await this.db.delete(allowlist).where(
          and(
            eq(allowlist.identifier, normalizedEmail),
            eq(allowlist.type, 'email')
          )
        );
        logger.info(`[EmailAllowlist] Removed ${normalizedEmail}`);
      } catch (error) {
        logger.error(`[EmailAllowlist] Error removing ${normalizedEmail}`, error as Error);
      }
    }
  }

  /**
   * Get all emails in the allowlist
   */
  getAll(): string[] {
    return Array.from(this.cache);
  }

  /**
   * Get count of emails in allowlist
   */
  count(): number {
    return this.cache.size;
  }

  /**
   * Clear all emails from allowlist (database and cache)
   */
  async clear(): Promise<void> {
    this.cache.clear();

    if (this.db) {
      try {
        await this.db.delete(allowlist).where(eq(allowlist.type, 'email'));
        logger.info('[EmailAllowlist] Cleared all emails');
      } catch (error) {
        logger.error('[EmailAllowlist] Error clearing', error as Error);
      }
    }
  }
}
