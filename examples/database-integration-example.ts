/**
 * Database Integration Example
 *
 * Demonstrates how to use the new Memory-Centric Architecture
 * with database persistence using PostgreSQL, MySQL, or SQLite.
 */

import { AIReceptionist, DatabaseStorage, InMemoryStorage } from '../src';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// ============================================================================
// Example 1: PostgreSQL with Database Persistence
// ============================================================================

async function examplePostgreSQL() {
  // Setup PostgreSQL connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_receptionist',
  });

  const db = drizzle(pool);

  // Create AI Receptionist with database-backed memory
  const receptionist = new AIReceptionist({
    agent: {
      identity: {
        name: 'Sarah',
        role: 'Sales Representative',
        company: 'Acme Corp',
      },

      personality: {
        traits: [
          { name: 'friendly', description: 'Warm and welcoming' },
          { name: 'professional', description: 'Professional demeanor' },
        ],
      },

      // Configure memory with database persistence
      memory: {
        contextWindow: 20,
        longTermEnabled: true,
        longTermStorage: new DatabaseStorage({
          db,
          autoMigrate: true, // Automatically create tables if they don't exist
        }),
        autoPersist: {
          minImportance: 7, // Auto-save memories with importance >= 7
          types: ['decision', 'tool_execution', 'system'], // Auto-save these types
        },
      },

      goals: {
        primary: 'Qualify leads and book demo appointments',
      },
    },

    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },

    providers: {
      communication: {
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID!,
          authToken: process.env.TWILIO_AUTH_TOKEN!,
          phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
        },
      },
    },
  });

  await receptionist.initialize();

  // Make a call
  const call = await receptionist.calls.make({
    to: '+1234567890',
    metadata: { campaign: 'Q4 Sales' },
  });

  console.log('Call initiated:', call.id);

  // During the call, Sarah's AI will automatically:
  // 1. Store all conversation in database (via DatabaseStorage)
  // 2. Save important decisions and tool executions
  // 3. Track call metadata (duration, outcome, etc.)

  // After the call, query conversation history
  const conversationHistory = await receptionist.agent.memory.getConversationHistory(
    call.conversationId
  );

  console.log(`Stored ${conversationHistory.length} memories from conversation`);

  // Query all call conversations
  const callMemories = await receptionist.agent.memory.getChannelHistory('call', {
    limit: 10,
  });

  console.log(`Total call memories: ${callMemories.length}`);

  // Search for important decisions
  const decisions = await receptionist.agent.memory.search({
    type: 'decision',
    minImportance: 8,
    orderBy: 'timestamp',
    orderDirection: 'desc',
  });

  console.log(`Found ${decisions.length} important decisions`);

  await pool.end();
}

// ============================================================================
// Example 2: MySQL with Database Persistence
// ============================================================================

async function exampleMySQL() {
  const { drizzle } = await import('drizzle-orm/mysql2');
  const mysql = await import('mysql2/promise');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'ai_receptionist',
  });

  const db = drizzle(connection);

  const receptionist = new AIReceptionist({
    agent: {
      identity: { name: 'Sarah', role: 'Sales Rep' },
      memory: {
        longTermEnabled: true,
        longTermStorage: new DatabaseStorage({
          db,
          autoMigrate: true,
        }),
      },
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
  });

  await receptionist.initialize();

  console.log('MySQL-backed AI Receptionist initialized!');

  await connection.end();
}

// ============================================================================
// Example 3: SQLite for Local Development
// ============================================================================

async function exampleSQLite() {
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const Database = (await import('better-sqlite3')).default;

  const sqlite = new Database('receptionist.db');
  const db = drizzle(sqlite);

  const receptionist = new AIReceptionist({
    agent: {
      identity: { name: 'Sarah', role: 'Sales Rep' },
      memory: {
        longTermEnabled: true,
        longTermStorage: new DatabaseStorage({
          db,
          autoMigrate: true,
        }),
      },
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
  });

  await receptionist.initialize();

  console.log('SQLite-backed AI Receptionist initialized!');

  sqlite.close();
}

// ============================================================================
// Example 4: In-Memory for Testing
// ============================================================================

async function exampleInMemory() {
  const receptionist = new AIReceptionist({
    agent: {
      identity: { name: 'Sarah', role: 'Sales Rep' },
      memory: {
        longTermEnabled: true,
        longTermStorage: new InMemoryStorage(), // Data lost on restart
      },
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
    },
  });

  await receptionist.initialize();

  console.log('In-memory AI Receptionist initialized (for testing)!');
}

// ============================================================================
// Example 5: Advanced Memory Queries
// ============================================================================

async function exampleAdvancedQueries(receptionist: AIReceptionist) {
  // Get all memories from a specific conversation
  const conversationMemories = await receptionist.agent.memory.getConversationHistory(
    'conv_abc123'
  );

  // Get recent call memories
  const recentCalls = await receptionist.agent.memory.getChannelHistory('call', {
    limit: 20,
  });

  // Search with multiple filters
  const filteredMemories = await receptionist.agent.memory.search({
    type: ['decision', 'tool_execution'],
    channel: 'call',
    minImportance: 8,
    startDate: new Date('2024-01-01'),
    keywords: ['appointment', 'booked'],
    orderBy: 'importance',
    orderDirection: 'desc',
    limit: 50,
  });

  console.log('Advanced query results:', {
    conversationMemories: conversationMemories.length,
    recentCalls: recentCalls.length,
    filteredMemories: filteredMemories.length,
  });
}

// ============================================================================
// Example 6: Migration from Old Architecture
// ============================================================================

async function exampleMigration() {
  const { migrateConversationsToMemory, verifyMigration } = await import(
    '../src/agent/storage'
  );

  // Setup connections
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
  });
  const db = drizzle(pool);

  const targetStorage = new DatabaseStorage({ db });

  console.log('Starting migration from old conversation store to new memory system...');

  // Run migration
  const result = await migrateConversationsToMemory({
    sourceDb: db as any,
    targetStorage,
    batchSize: 100,
    onProgress: (current, total) => {
      console.log(`Migrating: ${current}/${total} conversations`);
    },
  });

  console.log(`Migration complete: ${result.migrated} migrated, ${result.errors} errors`);

  // Verify migration
  const verification = await verifyMigration(db as any, targetStorage);

  console.log('Verification:', verification);

  await pool.end();
}

// ============================================================================
// Example 7: Session Management
// ============================================================================

async function exampleSessionManagement(receptionist: AIReceptionist) {
  const conversationId = 'conv_' + Date.now();

  // Start a new conversation session
  await receptionist.agent.memory.startSession({
    conversationId,
    channel: 'call',
    metadata: {
      campaign: 'Q4 Sales',
      priority: 'high',
    },
  });

  // ... conversation happens ...

  // End the session with a summary
  await receptionist.agent.memory.endSession(
    conversationId,
    'Successfully qualified lead and booked demo for next Tuesday at 2pm'
  );

  // Retrieve the complete session
  const sessionMemories = await receptionist.agent.memory.getConversationHistory(
    conversationId
  );

  console.log(`Session has ${sessionMemories.length} memories`);
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  try {
    console.log('=== Database Integration Examples ===\n');

    // Choose which example to run based on environment
    const example = process.env.EXAMPLE || 'postgresql';

    switch (example) {
      case 'postgresql':
        await examplePostgreSQL();
        break;
      case 'mysql':
        await exampleMySQL();
        break;
      case 'sqlite':
        await exampleSQLite();
        break;
      case 'inmemory':
        await exampleInMemory();
        break;
      case 'migration':
        await exampleMigration();
        break;
      default:
        console.log('Unknown example. Available: postgresql, mysql, sqlite, inmemory, migration');
    }

    console.log('\n=== Example Complete ===');
  } catch (error) {
    console.error('Example failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  examplePostgreSQL,
  exampleMySQL,
  exampleSQLite,
  exampleInMemory,
  exampleAdvancedQueries,
  exampleMigration,
  exampleSessionManagement,
};
