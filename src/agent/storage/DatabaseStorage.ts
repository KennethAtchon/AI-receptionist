/**
 * Database Storage Implementation
 * Uses Drizzle ORM for database persistence
 *
 * Supports PostgreSQL through Drizzle's API.
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
  autoMigrate?: boolean; // Auto-create tables if they don't exist
}

export class DatabaseStorage implements IStorage {
  private db: SupportedDatabase;
  private table: typeof memory;
  private config: DatabaseStorageConfig;

  constructor(config: DatabaseStorageConfig) {
    this.db = config.db;
    this.table = memory;
    this.config = config;

    if (config.autoMigrate) {
      this.migrate().catch(err => {
        console.error('Failed to auto-migrate database:', err);
      });
    }
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    // Create required tables and indexes if they don't exist
    // Use raw SQL to avoid requiring drizzle-kit at runtime
    try {
      // ai_receptionist_memory
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_receptionist_memory (
          id UUID PRIMARY KEY,
          content TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          type TEXT NOT NULL,
          importance INTEGER,
          channel TEXT,
          session_metadata JSONB,
          role TEXT,
          tool_call JSONB,
          tool_result JSONB,
          metadata JSONB,
          goal_achieved BOOLEAN,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Indexes for memory
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS memory_conversation_id_idx ON ai_receptionist_memory USING GIN (session_metadata)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS memory_channel_idx ON ai_receptionist_memory (channel)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS memory_type_idx ON ai_receptionist_memory (type)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS memory_timestamp_idx ON ai_receptionist_memory (timestamp)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS memory_importance_idx ON ai_receptionist_memory (importance)`);

      // ai_receptionist_leads
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_receptionist_leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          email TEXT,
          phone TEXT,
          source TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS leads_source_idx ON ai_receptionist_leads (source)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS leads_created_at_idx ON ai_receptionist_leads (created_at)`);

      // ai_receptionist_call_logs
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_receptionist_call_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID,
          phone_number TEXT,
          duration INTEGER,
          outcome TEXT,
          summary TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS call_logs_conversation_id_idx ON ai_receptionist_call_logs (conversation_id)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS call_logs_outcome_idx ON ai_receptionist_call_logs (outcome)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS call_logs_created_at_idx ON ai_receptionist_call_logs (created_at)`);

      // ai_receptionist_allowlist (unified email and SMS allowlist)
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_receptionist_allowlist (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          identifier TEXT NOT NULL,
          type TEXT NOT NULL,
          added_at TIMESTAMP DEFAULT NOW() NOT NULL,
          added_by TEXT,
          UNIQUE(identifier, type)
        )
      `);

      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS allowlist_identifier_type_idx ON ai_receptionist_allowlist (identifier, type)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS allowlist_type_idx ON ai_receptionist_allowlist (type)`);
      await this.db.execute(sql`CREATE INDEX IF NOT EXISTS allowlist_added_at_idx ON ai_receptionist_allowlist (added_at)`);
    } catch (error) {
      console.warn('Auto-migration failed; ensure database role has CREATE privileges. Error:', error);
    }
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
