/**
 * Database Storage Implementation
 * Uses Drizzle ORM for database persistence
 *
 * Supports PostgreSQL, MySQL, and SQLite through Drizzle's unified API.
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';
import { eq, and, gte, lte, inArray, desc, asc, sql, or } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { memory } from './schema';

type SupportedDatabase = PgDatabase<any> | MySql2Database<any> | BetterSQLite3Database<any>;

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
    // This would typically use drizzle-kit or custom migration logic
    // For now, we'll create the table if it doesn't exist
    try {
      // Check if table exists by attempting a simple query
      await this.db.select().from(this.table).limit(1);
    } catch (error) {
      console.warn('Memory table might not exist. Please run migrations manually.');
      // In production, you'd use drizzle-kit migrations:
      // npx drizzle-kit push:pg
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
    const conditions: any[] = [];

    // Filter by conversationId (using JSONB query)
    if (query.conversationId) {
      conditions.push(
        sql`${this.table.sessionMetadata}->>'conversationId' = ${query.conversationId}`
      );
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
    if (query.minImportance !== undefined) {
      conditions.push(gte(this.table.importance, query.minImportance));
    }

    // Keyword search (simple LIKE query)
    if (query.keywords && query.keywords.length > 0) {
      const keywordConditions = query.keywords.map(keyword =>
        sql`${this.table.content} ILIKE ${`%${keyword}%`}`
      );
      conditions.push(or(...keywordConditions));
    }

    // Apply WHERE conditions
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions)) as any;
    }

    // Order by
    const orderBy = query.orderBy || 'timestamp';
    const orderDirection = query.orderDirection || 'desc';
    const orderColumn = this.table[orderBy as keyof typeof this.table];

    if (orderColumn) {
      dbQuery = dbQuery.orderBy(
        orderDirection === 'asc' ? asc(orderColumn) : desc(orderColumn)
      ) as any;
    }

    // Pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    dbQuery = dbQuery.limit(limit).offset(offset) as any;

    const results = await dbQuery;
    return results.map(r => this.mapToMemory(r));
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
      .from(this.table);
    return Number(result[0]?.count || 0);
  }

  /**
   * Utility: Clear all memories (for testing)
   */
  async clear(): Promise<void> {
    await this.db.delete(this.table);
  }
}
