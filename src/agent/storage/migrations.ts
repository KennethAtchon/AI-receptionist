/**
 * Automatic Database Migration Utilities
 * 
 * Handles automatic table creation for DatabaseStorage when autoMigrate is enabled.
 * This module provides functions to check table existence and create required tables.
 */

import { sql } from 'drizzle-orm';

// Relaxed DB typing to support different drizzle drivers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupportedDatabase = any;

/**
 * Check if a table exists in the database
 */
export async function tableExists(db: SupportedDatabase, tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      )
    `) as any;
    
    // Handle different result formats from different Drizzle drivers
    // node-postgres returns { rows: [{ exists: boolean }] }
    // Other drivers might return array directly
    if (result.rows && Array.isArray(result.rows)) {
      return result.rows[0]?.exists ?? false;
    }
    if (Array.isArray(result) && result.length > 0) {
      return result[0]?.exists ?? false;
    }
    if (result?.exists !== undefined) {
      return result.exists;
    }
    
    return false;
  } catch (error) {
    // If query fails, assume table doesn't exist
    console.warn(`[Migrations] Failed to check if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Ensure all required tables exist, creating them if necessary
 */
export async function ensureTablesExist(db: SupportedDatabase): Promise<void> {
  try {
    // Check and create memory table
    const memoryTableExists = await tableExists(db, 'ai_receptionist_memory');
    if (!memoryTableExists) {
      await createMemoryTable(db);
    }

    // Check and create allowlist table
    const allowlistTableExists = await tableExists(db, 'ai_receptionist_allowlist');
    if (!allowlistTableExists) {
      await createAllowlistTable(db);
    }
  } catch (error) {
    console.error('[Migrations] Failed to ensure tables exist:', error);
    throw new Error(`Failed to create database tables: ${(error as Error).message}`);
  }
}

/**
 * Create the memory table
 */
async function createMemoryTable(db: SupportedDatabase): Promise<void> {
  await db.execute(sql`
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

  // Create indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS memory_conversation_id_idx 
    ON ai_receptionist_memory USING GIN (session_metadata)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS memory_channel_idx 
    ON ai_receptionist_memory (channel)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS memory_type_idx 
    ON ai_receptionist_memory (type)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS memory_timestamp_idx 
    ON ai_receptionist_memory (timestamp)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS memory_importance_idx 
    ON ai_receptionist_memory (importance)
  `);
}

/**
 * Create the allowlist table
 */
async function createAllowlistTable(db: SupportedDatabase): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ai_receptionist_allowlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      identifier TEXT NOT NULL,
      type TEXT NOT NULL,
      added_at TIMESTAMP DEFAULT NOW() NOT NULL,
      added_by TEXT,
      UNIQUE(identifier, type)
    )
  `);

  // Create indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS allowlist_identifier_type_idx 
    ON ai_receptionist_allowlist (identifier, type)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS allowlist_type_idx 
    ON ai_receptionist_allowlist (type)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS allowlist_added_at_idx 
    ON ai_receptionist_allowlist (added_at)
  `);
}

