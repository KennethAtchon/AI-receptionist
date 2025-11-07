/**
 * Database Storage Implementation
 * Uses Drizzle ORM for database persistence
 *
 * Supports PostgreSQL through Drizzle's API.
 *
 * MIGRATIONS:
 * Database migrations should be handled via Drizzle Kit, not this class.
 * The schema is defined in ./schema.ts. To run migrations:
 * 1. Generate migration: npx drizzle-kit generate
 * 2. Apply migration: npx drizzle-kit migrate
 *
 * This ensures the database schema stays in sync with schema.ts definitions.
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';
import { eq, and, gte, lte, inArray, desc, asc, sql, or } from 'drizzle-orm';
// Removed strict PgDatabase import to avoid cross-package type coupling
// import type { PgDatabase } from 'drizzle-orm/pg-core';
import { memory, allowlist } from './schema';

// Relaxed DB typing to avoid version/copy mismatches of drizzle types across packages
// and to support different drizzle drivers (node-postgres, http, etc.)
// Must expose select/insert/update/delete and execute for raw SQL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
 type SupportedDatabase = any;

export interface DatabaseStorageConfig {
  db: SupportedDatabase;
  tableName?: string; // Optional custom table name
  // Note: Migrations should be handled via Drizzle Kit (drizzle-kit)
  // Run: npx drizzle-kit generate and npx drizzle-kit migrate
}

export class DatabaseStorage implements IStorage {
  private db: SupportedDatabase;
  private table: typeof memory;
  private config: DatabaseStorageConfig;

  constructor(config: DatabaseStorageConfig) {
    this.db = config.db;
    this.table = memory;
    this.config = config;
  }

  /**
   * Save a memory to the database
   */
  async save(memory: Memory): Promise<void> {
    await this.db.insert(this.table).values({
      id: memory.id,
      content: memory.content,
      timestamp: memory.timestamp,
      type: memory.type,
      importance: memory.importance,
      channel: memory.channel,
      sessionMetadata: memory.sessionMetadata as any,
      role: memory.role,
      toolCall: memory.toolCall as any,
      toolResult: memory.toolResult as any,
      metadata: memory.metadata as any,
      goalAchieved: memory.goalAchieved,
    });
  }

  /**
   * Save multiple memories in a batch
   */
  async saveBatch(memories: Memory[]): Promise<void> {
    if (memories.length === 0) return;

    await this.db.insert(this.table).values(
      memories.map(m => ({
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        type: m.type,
        importance: m.importance,
        channel: m.channel,
        sessionMetadata: m.sessionMetadata as any,
        role: m.role,
        toolCall: m.toolCall as any,
        toolResult: m.toolResult as any,
        metadata: m.metadata as any,
        goalAchieved: m.goalAchieved,
      }))
    );
  }

  /**
   * Get a specific memory by ID
   */
  async get(id: string): Promise<Memory | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return result[0] ? this.mapToMemory(result[0]) : null;
  }

  /**
   * Search memories with flexible query
   */
  async search(query: MemorySearchQuery): Promise<Memory[]> {
    let dbQuery = this.db.select().from(this.table);

    // Build WHERE clauses
    const conditions: ReturnType<typeof eq>[] = [];

    // Filter by conversationId (using JSONB query)
    if (query.conversationId) {
      conditions.push(
        sql`${this.table.sessionMetadata}->>'conversationId' = ${query.conversationId}`
      );
    }

    // Filter by sessionMetadata fields (JSONB queries)
    if (query.sessionMetadata) {
      for (const [key, value] of Object.entries(query.sessionMetadata)) {
        if (value !== undefined && value !== null) {
          conditions.push(
            sql`${this.table.sessionMetadata}->>${key} = ${String(value)}`
          );
        }
      }
    }

    // Filter by channel
    if (query.channel) {
      conditions.push(eq(this.table.channel, query.channel));
    }

    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      conditions.push(inArray(this.table.type, types));
    }

    // Filter by role
    if (query.role) {
      conditions.push(eq(this.table.role, query.role));
    }

    // Filter by date range
    if (query.startDate) {
      conditions.push(gte(this.table.timestamp, query.startDate));
    }
    if (query.endDate) {
      conditions.push(lte(this.table.timestamp, query.endDate));
    }

    // Filter by importance
    if (query.minImportance !== undefined && this.table.importance) {
      conditions.push(gte(this.table.importance, query.minImportance));
    }

    // Keyword search (simple LIKE query)
    if (query.keywords && query.keywords.length > 0) {
      const keywordConditions = query.keywords.map(keyword =>
        sql`${this.table.content} ILIKE ${`%${keyword}%`}`
      );
      const keywordOr = or(...keywordConditions);
      if (keywordOr) {
        conditions.push(keywordOr);
      }
    }

    // Apply WHERE conditions
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions)) as any;
    }

    // Order by
    const orderBy = query.orderBy || 'timestamp';
    const orderDirection = query.orderDirection || 'desc';
    const orderColumn = this.table[orderBy as keyof typeof this.table];

    if (orderColumn && typeof orderColumn !== 'function') {
      dbQuery = dbQuery.orderBy(
        orderDirection === 'asc' ? asc(orderColumn as any) : desc(orderColumn as any)
      ) as any;
    }

    // Pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    dbQuery = dbQuery.limit(limit).offset(offset) as any;

    const results = await dbQuery;
    return results.map((r: any) => this.mapToMemory(r));
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(this.table).where(eq(this.table.id, id));
  }

  /**
   * Health check - verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.select().from(this.table).limit(1);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Map database row to Memory type
   */
  private mapToMemory(row: any): Memory {
    return {
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      type: row.type,
      importance: row.importance,
      channel: row.channel,
      sessionMetadata: row.sessionMetadata,
      role: row.role,
      toolCall: row.toolCall,
      toolResult: row.toolResult,
      metadata: row.metadata,
      goalAchieved: row.goalAchieved,
    };
  }

  /**
   * Utility: Get total count of memories
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table) as any;
    return Number(result[0]?.count || 0);
  }

  /**
   * Utility: Clear all memories (for testing)
   */
  async clear(): Promise<void> {
    await this.db.delete(this.table);
  }

  // ============================================================================
  // Unified Allowlist Methods
  // ============================================================================

  /**
   * Get all allowlisted emails
   */
  async getAllAllowlistedEmails(): Promise<{ email: string }[]> {
    const results = await this.db
      .select({ email: allowlist.identifier })
      .from(allowlist)
      .where(eq(allowlist.type, 'email'));
    return results;
  }

  /**
   * Add email to allowlist
   */
  async addToEmailAllowlist(email: string, addedBy: string = 'manual'): Promise<void> {
    await this.db.insert(allowlist).values({
      identifier: email,
      type: 'email',
      addedBy
    }).onConflictDoNothing(); // Ignore if already exists
  }

  /**
   * Remove email from allowlist
   */
  async removeFromEmailAllowlist(email: string): Promise<void> {
    await this.db.delete(allowlist).where(
      and(
        eq(allowlist.identifier, email),
        eq(allowlist.type, 'email')
      )
    );
  }

  /**
   * Clear email allowlist
   */
  async clearEmailAllowlist(): Promise<void> {
    await this.db.delete(allowlist).where(eq(allowlist.type, 'email'));
  }

  /**
   * Get all allowlisted phone numbers
   */
  async getAllAllowlistedPhoneNumbers(): Promise<{ phoneNumber: string }[]> {
    const results = await this.db
      .select({ phoneNumber: allowlist.identifier })
      .from(allowlist)
      .where(eq(allowlist.type, 'sms'));
    return results;
  }

  /**
   * Add phone number to allowlist
   */
  async addToPhoneAllowlist(phoneNumber: string, addedBy: string = 'manual'): Promise<void> {
    await this.db.insert(allowlist).values({
      identifier: phoneNumber,
      type: 'sms',
      addedBy
    }).onConflictDoNothing(); // Ignore if already exists
  }

  /**
   * Remove phone number from allowlist
   */
  async removeFromPhoneAllowlist(phoneNumber: string): Promise<void> {
    await this.db.delete(allowlist).where(
      and(
        eq(allowlist.identifier, phoneNumber),
        eq(allowlist.type, 'sms')
      )
    );
  }

  /**
   * Clear SMS allowlist
   */
  async clearPhoneAllowlist(): Promise<void> {
    await this.db.delete(allowlist).where(eq(allowlist.type, 'sms'));
  }
}
