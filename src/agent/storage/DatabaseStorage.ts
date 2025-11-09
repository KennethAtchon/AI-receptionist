/**
 * Database Storage Implementation
 * Uses Drizzle ORM for database persistence
 *
 * Supports PostgreSQL through Drizzle's API.
 *
 * MIGRATIONS:
 * By default, database migrations should be handled via Drizzle Kit:
 * 1. Generate migration: npx drizzle-kit generate
 * 2. Apply migration: npx drizzle-kit migrate
 *
 * However, you can enable automatic memoryTable creation by setting autoMigrate: true.
 * This will automatically create required tables if they don't exist.
 * The schema is defined in ./schema.ts.
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';
import { eq, and, gte, lte, inArray, desc, asc, sql, or } from 'drizzle-orm';
// Removed strict PgDatabase import to avoid cross-package type coupling
// import type { PgDatabase } from 'drizzle-orm/pg-core';
import { memory, allowlist } from './schema';
import { ensureTablesExist } from './migrations';
import { logger } from '../../utils/logger';

// Relaxed DB typing to avoid version/copy mismatches of drizzle types across packages
// and to support different drizzle drivers (node-postgres, http, etc.)
// Must expose select/insert/update/delete and execute for raw SQL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
 type SupportedDatabase = any;

/**
 * Database connection configuration
 * Either provide a connection string, individual connection details, or an existing Drizzle instance
 */
export type DatabaseStorageConfig =
  | {
      /** PostgreSQL connection string (e.g., postgresql://user:password@host:port/database) */
      connectionString: string;
      tableName?: string;
      autoMigrate?: boolean;
    }
  | {
      /** Individual connection parameters */
      host: string;
      port?: number;
      database: string;
      user: string;
      password: string;
      ssl?: boolean | { rejectUnauthorized?: boolean };
      tableName?: string;
      autoMigrate?: boolean;
    }
  | {
      /** Existing Drizzle ORM instance (for advanced users) */
      db: SupportedDatabase;
      tableName?: string;
      autoMigrate?: boolean;
    };

export class DatabaseStorage implements IStorage {
  private db: SupportedDatabase;
  private memoryTable: typeof memory;
  private config: DatabaseStorageConfig;
  private initialized = false;
  private ownsConnection = false; // Track if we created the connection
  private pool?: any; // Store pool for cleanup if we created it

  constructor(config: DatabaseStorageConfig) {
    this.config = config;
    this.memoryTable = memory;

    // If db is provided directly, use it
    if ('db' in config && config.db) {
      this.db = config.db;
      this.ownsConnection = false;
    } else {
      // We'll create the connection in initialize()
      this.db = null as any;
      this.ownsConnection = true;
    }
  }

  /**
   * Initialize storage - creates connection if needed and tables if autoMigrate is enabled
   * Should be called after construction
   */
  async initialize(): Promise<void> {
    logger.info('[DatabaseStorage] Initializing database storage', {
      initialized: this.initialized,
      ownsConnection: this.ownsConnection,
      hasDb: !!this.db,
      autoMigrate: this.config.autoMigrate,
      configType: 'db' in this.config ? 'db-instance' : 'connectionString' in this.config ? 'connection-string' : 'connection-details'
    });

    if (this.initialized) {
      logger.info('[DatabaseStorage] Already initialized, skipping');
      return;
    }

    // Create connection if we own it
    if (this.ownsConnection) {
      logger.info('[DatabaseStorage] Creating database connection...');
      await this.createConnection();
      logger.info('[DatabaseStorage] Database connection created successfully');
    } else {
      logger.info('[DatabaseStorage] Using provided database instance (no connection creation needed)');
      if (!this.db) {
        logger.error('[DatabaseStorage] No database instance provided and not owning connection!');
        throw new Error('DatabaseStorage: No database connection available');
      }
    }

    if (this.config.autoMigrate) {
      logger.info('[DatabaseStorage] Auto-migrate enabled, ensuring tables exist...');
      try {
        await ensureTablesExist(this.db);
        logger.info('[DatabaseStorage] Tables verified/created successfully');
      } catch (error) {
        logger.error('[DatabaseStorage] Failed to ensure tables exist', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    } else {
      logger.info('[DatabaseStorage] Auto-migrate disabled, skipping memoryTable creation');
    }

    // Test connection with a simple query
    try {
      logger.info('[DatabaseStorage] Testing database connection...');
      await this.db.select().from(this.memoryTable).limit(1);
      logger.info('[DatabaseStorage] Database connection test successful');
    } catch (error) {
      logger.error('[DatabaseStorage] Database connection test failed', error instanceof Error ? error : new Error(String(error)), {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - might be okay if memoryTable doesn't exist yet
    }

    this.initialized = true;
    logger.info('[DatabaseStorage] ✅ Database storage initialized successfully', {
      initialized: this.initialized,
      hasDb: !!this.db
    });
  }

  /**
   * Create Drizzle connection from config
   */
  private async createConnection(): Promise<void> {
    logger.info('[DatabaseStorage] Creating database connection from config', {
      hasConnectionString: 'connectionString' in this.config && !!this.config.connectionString,
      hasHost: 'host' in this.config && !!this.config.host,
      hasDb: 'db' in this.config && !!this.config.db
    });

    try {
      // Dynamic import to avoid requiring these packages if user provides their own db
      logger.info('[DatabaseStorage] Importing drizzle-orm and pg packages...');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      let Pool: any;
      try {
        const pgModule = await import('pg');
        Pool = pgModule.Pool;
        logger.info('[DatabaseStorage] Successfully imported pg and drizzle-orm packages');
      } catch (error) {
        logger.error('[DatabaseStorage] Failed to import database packages', error instanceof Error ? error : new Error(String(error)));
        throw new Error(
          'Database packages not found. Please install: npm install drizzle-orm pg @types/pg\n' +
          'Or provide your own Drizzle instance via the "db" option.'
        );
      }

      let pool: any;

      if ('connectionString' in this.config && this.config.connectionString) {
        logger.info('[DatabaseStorage] Creating pool from connection string');
        pool = new Pool({
          connectionString: this.config.connectionString,
        });
      } else if ('host' in this.config && this.config.host) {
        logger.info('[DatabaseStorage] Creating pool from connection details', {
          host: this.config.host,
          port: this.config.port || 5432,
          database: this.config.database
        });
        pool = new Pool({
          host: this.config.host,
          port: this.config.port || 5432,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password ? '***' : undefined, // Don't log password
          ssl: this.config.ssl,
        });
      } else {
        logger.error('[DatabaseStorage] Invalid database configuration');
        throw new Error('Invalid database configuration: must provide connectionString, connection details, or db instance');
      }

      this.pool = pool;
      this.db = drizzle(pool);
      logger.info('[DatabaseStorage] Database connection pool created and Drizzle instance initialized');
    } catch (error) {
      logger.error('[DatabaseStorage] Failed to create database connection', error instanceof Error ? error : new Error(String(error)), {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      if (error instanceof Error && error.message.includes('Database packages not found')) {
        throw error;
      }
      throw new Error(`Failed to create database connection: ${(error as Error).message}`);
    }
  }

  /**
   * Dispose of the connection if we own it
   */
  async dispose(): Promise<void> {
    if (this.ownsConnection && this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
    this.initialized = false;
  }

  /**
   * Save a memory to the database
   */
  async save(memory: Memory): Promise<void> {
    logger.info('[DatabaseStorage] Saving memory to database', {
      memoryId: memory.id,
      type: memory.type,
      role: memory.role,
      channel: memory.channel,
      conversationId: memory.sessionMetadata?.conversationId,
      contentPreview: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
      contentLength: memory.content.length,
      sessionMetadata: JSON.stringify(memory.sessionMetadata)
    });

    try {
      await this.db.insert(this.memoryTable).values({
        externalId: memory.id, // Store user-provided ID in externalId field
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

      logger.info('[DatabaseStorage] Memory saved successfully', {
        memoryId: memory.id,
        conversationId: memory.sessionMetadata?.conversationId
      });
    } catch (error) {
      logger.error('[DatabaseStorage] Failed to save memory', error instanceof Error ? error : new Error(String(error)), {
        memoryId: memory.id,
        conversationId: memory.sessionMetadata?.conversationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Save multiple memories in a batch
   */
  async saveBatch(memories: Memory[]): Promise<void> {
    if (memories.length === 0) return;

    await this.db.insert(this.memoryTable).values(
      memories.map(m => ({
        externalId: m.id, // Store user-provided ID in externalId field
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
   * Get a specific memory by ID (external ID)
   */
  async get(id: string): Promise<Memory | null> {
    const result = await this.db
      .select()
      .from(this.memoryTable)
      .where(eq(this.memoryTable.externalId, id))
      .limit(1);

    return result[0] ? this.mapToMemory(result[0]) : null;
  }

  /**
   * Search memories with flexible query
   */
  async search(query: MemorySearchQuery): Promise<Memory[]> {
    logger.info('[DatabaseStorage] Searching memories', {
      query: {
        conversationId: query.conversationId,
        channel: query.channel,
        type: query.type,
        role: query.role,
        limit: query.limit,
        orderBy: query.orderBy,
        orderDirection: query.orderDirection
      }
    });

    let dbQuery = this.db.select().from(this.memoryTable);

    // Build WHERE clauses
    const conditions: ReturnType<typeof eq>[] = [];

    // Filter by conversationId (using JSONB query)
    if (query.conversationId) {
      logger.info('[DatabaseStorage] Adding conversationId filter', {
        conversationId: query.conversationId,
        sqlQuery: `sessionMetadata->>'conversationId' = '${query.conversationId}'`
      });
      conditions.push(
        sql`${this.memoryTable.sessionMetadata}->>'conversationId' = ${query.conversationId}`
      );
    }

    // Filter by sessionMetadata fields (JSONB queries)
    if (query.sessionMetadata) {
      for (const [key, value] of Object.entries(query.sessionMetadata)) {
        if (value !== undefined && value !== null) {
          conditions.push(
            sql`${this.memoryTable.sessionMetadata}->>${key} = ${String(value)}`
          );
        }
      }
    }

    // Filter by channel
    if (query.channel) {
      conditions.push(eq(this.memoryTable.channel, query.channel));
    }

    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      conditions.push(inArray(this.memoryTable.type, types));
    }

    // Filter by role
    if (query.role) {
      conditions.push(eq(this.memoryTable.role, query.role));
    }

    // Filter by date range
    if (query.startDate) {
      conditions.push(gte(this.memoryTable.timestamp, query.startDate));
    }
    if (query.endDate) {
      conditions.push(lte(this.memoryTable.timestamp, query.endDate));
    }

    // Filter by importance
    if (query.minImportance !== undefined && this.memoryTable.importance) {
      conditions.push(gte(this.memoryTable.importance, query.minImportance));
    }

    // Keyword search (simple LIKE query)
    if (query.keywords && query.keywords.length > 0) {
      const keywordConditions = query.keywords.map(keyword =>
        sql`${this.memoryTable.content} ILIKE ${`%${keyword}%`}`
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
    const orderColumn = this.memoryTable[orderBy as keyof typeof this.memoryTable];

    if (orderColumn && typeof orderColumn !== 'function') {
      dbQuery = dbQuery.orderBy(
        orderDirection === 'asc' ? asc(orderColumn as any) : desc(orderColumn as any)
      ) as any;
    }

    // Pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    dbQuery = dbQuery.limit(limit).offset(offset) as any;

    logger.info('[DatabaseStorage] Executing database query', {
      conversationId: query.conversationId,
      conditionCount: conditions.length,
      limit,
      offset,
      orderBy: query.orderBy || 'timestamp',
      orderDirection: query.orderDirection || 'desc'
    });

    const results = await dbQuery;

    logger.info('[DatabaseStorage] Search completed', {
      conversationId: query.conversationId,
      resultCount: results.length,
      results: results.map((r: any) => ({
        id: r.id,
        type: r.type,
        role: r.role,
        conversationId: r.sessionMetadata?.conversationId,
        contentPreview: r.content?.substring(0, 100) + (r.content?.length > 100 ? '...' : ''),
        timestamp: r.timestamp,
        sessionMetadata: r.sessionMetadata
      }))
    });

    const memories = results.map((r: any) => this.mapToMemory(r));

    logger.info('[DatabaseStorage] Mapped results to Memory objects', {
      conversationId: query.conversationId,
      memoryCount: memories.length,
      memories: memories.map((m: Memory) => ({
        id: m.id,
        type: m.type,
        role: m.role,
        conversationId: m.sessionMetadata?.conversationId,
        contentPreview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '')
      }))
    });

    return memories;
  }

  /**
   * Delete a memory by external ID
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(this.memoryTable).where(eq(this.memoryTable.externalId, id));
  }

  /**
   * Health check - verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.select().from(this.memoryTable).limit(1);
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
      id: row.externalId || row.id, // Use externalId if available, fallback to UUID id
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
      .from(this.memoryTable) as any;
    return Number(result[0]?.count || 0);
  }

  /**
   * Utility: Clear all memories (for testing)
   */
  async clear(): Promise<void> {
    await this.db.delete(this.memoryTable);
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
