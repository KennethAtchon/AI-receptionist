# Database Integration

The AI Receptionist SDK uses a **Memory-Centric Architecture** where the Agent's memory system is the single source of truth for all conversational data. The SDK can automatically integrate with your database to persist agent memory, leads, and call data.

## Overview

**Simple Setup:**
1. User provides database connection
2. SDK creates standard tables automatically
3. AI memory is automatically persisted (conversations, decisions, preferences)
4. Optional business tables for leads and call logs
5. No manual migrations or schema management needed

> **Architecture Note**: The SDK uses the Agent's memory system to store all conversation data. The database integration is an optional persistence layer. See [Memory Architecture Refactor](./architecture/memory-architecture-refactor.md) for details.

## Quick Start

```typescript
import { AIReceptionist, DatabaseStorage } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// User's database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

const receptionist = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },

    // Configure memory with database persistence
    memory: {
      contextWindow: 20,
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({ db }) // Agent memory persisted to DB
    }
  },

  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  },

  // Optional: Enable business tables (leads, call logs)
  database: {
    connection: db,
    autoMigrate: true,           // Create tables automatically (default: true)
    tablePrefix: 'ai_receptionist_' // Table name prefix (optional)
  }
});

await receptionist.initialize();
// Tables created automatically, ready to use!
```

## How It Works

### 1. User Provides Database Connection

The SDK accepts a Drizzle ORM connection. This supports multiple databases:
- **PostgreSQL** (via `drizzle-orm/node-postgres`)
- **MySQL** (via `drizzle-orm/mysql2`)
- **SQLite** (via `drizzle-orm/better-sqlite3`)

**Why Drizzle?**
- Lightweight (~7kb)
- Database agnostic
- Type-safe
- Simple migrations
- No CLI required

### 2. SDK Creates Tables Automatically

On `initialize()`, the SDK creates these tables:

#### `ai_receptionist_memory` (Core Table)
**The single source of truth for all agent memory** - stores conversations, decisions, tool executions, and preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| content | TEXT | The memory content (message, decision, etc.) |
| timestamp | TIMESTAMP | When memory was created |
| type | TEXT | 'conversation', 'decision', 'error', 'tool_execution', 'system' |
| importance | INTEGER | 1-10, determines if saved to long-term |
| channel | TEXT | 'call', 'sms', 'email' (optional) |
| session_metadata | JSONB | { conversationId, callSid, messageSid, status, duration, participants } |
| role | TEXT | 'system', 'user', 'assistant', 'tool' |
| tool_call | JSONB | Tool execution details |
| tool_result | JSONB | Tool execution results |
| metadata | JSONB | Additional custom metadata |
| goal_achieved | BOOLEAN | Whether a goal was achieved |
| created_at | TIMESTAMP | When stored |

**Indexes for fast queries:**
- `idx_conversation_id` - Fast lookup by conversation
- `idx_channel` - Filter by channel (call/sms/email)
- `idx_type` - Filter by memory type
- `idx_timestamp` - Chronological sorting
- `idx_importance` - Find important memories

#### `ai_receptionist_leads`
Customer/lead information collected by AI

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Customer name |
| email | TEXT | Customer email |
| phone | TEXT | Customer phone |
| source | TEXT | Which channel captured this ('call', 'sms', 'email') |
| metadata | JSONB | Additional data (notes, preferences, etc.) |
| created_at | TIMESTAMP | When lead was created |

#### `ai_receptionist_call_logs`
Call outcomes and summaries

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | References conversations.id |
| phone_number | TEXT | Phone number called |
| duration | INTEGER | Call duration in seconds |
| outcome | TEXT | 'booked', 'callback', 'not_interested', etc. |
| summary | TEXT | AI-generated call summary |
| metadata | JSONB | Additional call data |
| created_at | TIMESTAMP | When call ended |


### 3. AI Gets Database Tools Automatically

When database is configured, these tools are auto-registered:

#### `save_customer_info`
AI can save customer data collected during conversations

```typescript
// AI uses this during calls
{
  name: 'save_customer_info',
  parameters: {
    name: string,
    email: string,
    phone: string,
    notes: string
  }
}
```

**Example during call:**
```
AI: "Can I get your email address?"
User: "sure, it's john@example.com"
AI: *calls save_customer_info({ email: 'john@example.com' })*
AI: "Perfect! I've got that saved."
```

#### `find_customer`
Search for existing customers

```typescript
{
  name: 'find_customer',
  parameters: {
    email?: string,
    phone?: string
  }
}
```

#### `log_call_outcome`
Log call results and next steps

```typescript
{
  name: 'log_call_outcome',
  parameters: {
    outcome: 'appointment_booked' | 'callback_requested' | 'not_interested' | 'info_provided',
    summary: string,
    nextSteps?: string
  }
}
```

**Example:**
```
AI: "Great! I've booked you for Tuesday at 2pm."
AI: *calls log_call_outcome({
  outcome: 'appointment_booked',
  summary: 'Booked demo for Tuesday 2pm',
  nextSteps: 'Send calendar invite'
})*
```

#### `remember_preference`
Store customer preferences in agent memory (persisted automatically)

```typescript
{
  name: 'remember_preference',
  parameters: {
    key: string,
    value: string,
    importance?: number // 1-10, higher = more likely to be remembered
  }
}
```

**Example:**
```
User: "I prefer morning appointments"
AI: *calls remember_preference({
  key: 'preferred_time',
  value: 'morning',
  importance: 8
})*
AI: "Got it, I'll remember you prefer morning appointments."
```

**How it works**: Preferences are stored in the `ai_receptionist_memory` table with `type: 'decision'` and high importance, ensuring they're retained in long-term memory.

#### `recall_preference`
Retrieve previously saved preferences from agent memory

```typescript
{
  name: 'recall_preference',
  parameters: {
    key: string
  }
}
```

**How it works**: Searches the memory table for preference memories and returns the value.

## Configuration Options

### Memory Configuration (Core)

```typescript
interface MemoryConfig {
  // Short-term memory (in-memory buffer)
  contextWindow?: number; // Default: 20 messages

  // Long-term memory (persistent storage)
  longTermEnabled?: boolean; // Default: false
  longTermStorage?: IStorage; // Database, Redis, etc.

  // Vector memory (semantic search)
  vectorEnabled?: boolean;
  vectorStore?: IVectorStore;

  // Auto-persistence rules
  autoPersist?: {
    minImportance?: number; // Auto-save if importance >= this (default: 7)
    types?: ('conversation' | 'decision' | 'error' | 'tool_execution' | 'system')[]; // Auto-save these types
  };
}
```

### Database Configuration (Optional Business Tables)

```typescript
interface DatabaseConfig {
  // REQUIRED: Drizzle connection
  connection: DrizzleConnection;

  // OPTIONAL: Auto-create tables (default: true)
  autoMigrate?: boolean;

  // OPTIONAL: Table name prefix (default: 'ai_receptionist_')
  tablePrefix?: string;
}
```

### Storage Implementations

The SDK provides multiple storage implementations:

#### `InMemoryStorage`
For development and testing (data lost on restart)
```typescript
import { InMemoryStorage } from '@loctelli/ai-receptionist';

memory: {
  longTermEnabled: true,
  longTermStorage: new InMemoryStorage()
}
```

#### `DatabaseStorage`
For production persistence with any database
```typescript
import { DatabaseStorage } from '@loctelli/ai-receptionist';

memory: {
  longTermEnabled: true,
  longTermStorage: new DatabaseStorage({ db: drizzle(pool) })
}
```

#### Custom Storage
Implement `IStorage` interface for custom backends (Redis, MongoDB, etc.)
```typescript
interface IStorage {
  save(memory: Memory): Promise<void>;
  search(query: MemorySearchQuery): Promise<Memory[]>;
  get(id: string): Promise<Memory | null>;
  delete(id: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
```

### Examples

#### PostgreSQL with Memory Persistence
```typescript
import { AIReceptionist, DatabaseStorage } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});

const db = drizzle(pool);

const receptionist = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    memory: {
      contextWindow: 20,
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({ db }),
      autoPersist: {
        minImportance: 7, // Auto-save important memories
        types: ['decision', 'tool_execution', 'system'] // Auto-save these types
      }
    }
  },
  model: { /* ... */ },
  database: {
    connection: db,
    autoMigrate: true // Also create leads and call_logs tables
  }
});
```

#### MySQL with Memory Persistence
```typescript
import { AIReceptionist, DatabaseStorage } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'myapp'
});

const db = drizzle(connection);

const receptionist = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    memory: {
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({ db })
    }
  },
  model: { /* ... */ },
  database: { connection: db, autoMigrate: true }
});
```

#### SQLite (Local Development)
```typescript
import { AIReceptionist, DatabaseStorage } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('receptionist.db');
const db = drizzle(sqlite);

const receptionist = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    memory: {
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({ db })
    }
  },
  model: { /* ... */ },
  database: { connection: db, autoMigrate: true }
});
```

#### In-Memory (Testing)
```typescript
import { AIReceptionist, InMemoryStorage } from '@loctelli/ai-receptionist';

const receptionist = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    memory: {
      longTermEnabled: true,
      longTermStorage: new InMemoryStorage() // Data lost on restart
    }
  },
  model: { /* ... */ }
  // No database config needed
});
```

#### Custom Table Prefix
```typescript
const receptionist = new AIReceptionist({
  database: {
    connection: drizzle(pool),
    tablePrefix: 'my_ai_' // Tables: my_ai_conversations, my_ai_leads, etc.
  }
});
```

#### Manual Migrations
```typescript
const receptionist = new AIReceptionist({
  database: {
    connection: drizzle(pool),
    autoMigrate: false // Don't auto-create tables
  }
});

// Run migrations manually later
await receptionist.database.migrate();
```

## Real-World Usage Example

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Setup database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create AI receptionist
const sarah = new AIReceptionist({
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Sales Representative',
      company: 'Acme Corp'
    },
    personality: {
      traits: [
        { name: 'friendly', description: 'Warm and welcoming' },
        { name: 'professional', description: 'Professional demeanor' }
      ]
    },
    goals: {
      primary: 'Qualify leads and book demo appointments'
    }
  },

  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  },

  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      }
    }
  },

  // Database integration
  database: {
    connection: drizzle(pool),
    autoMigrate: true
  }
});

await sarah.initialize();

// Make a call
await sarah.calls.make({ to: '+1234567890' });

// During the call, Sarah automatically:
// 1. Saves conversation to ai_receptionist_conversations
// 2. Collects customer info and saves to ai_receptionist_leads
// 3. Logs call outcome to ai_receptionist_call_logs
// 4. Remembers preferences in ai_receptionist_memory
```

## Querying the Data

### Using the Agent Memory API (Recommended)

```typescript
// Get conversation history
const history = await receptionist.agent.memory.getConversationHistory('conv_123');

// Get all call memories
const callMemories = await receptionist.agent.memory.getChannelHistory('call', {
  limit: 50
});

// Search memories
const importantDecisions = await receptionist.agent.memory.search({
  type: 'decision',
  minImportance: 8,
  channel: 'call',
  orderBy: 'timestamp',
  orderDirection: 'desc'
});

// Get tool executions
const toolExecutions = await receptionist.agent.memory.search({
  type: 'tool_execution',
  startDate: new Date('2024-01-01'),
  limit: 100
});
```

### Using Database Directly

```typescript
// Using Drizzle directly
import { memory, leads, callLogs } from '@loctelli/ai-receptionist/schema';
import { eq, and, gte } from 'drizzle-orm';

// Get all conversation messages for a specific conversation
const conversationMemories = await db.select()
  .from(memory)
  .where(eq(memory.session_metadata.conversationId, 'conv_123'))
  .orderBy(memory.timestamp);

// Get all high-importance memories
const importantMemories = await db.select()
  .from(memory)
  .where(gte(memory.importance, 8));

// Get leads from today
const todayLeads = await db.select()
  .from(leads)
  .where(eq(leads.createdAt, new Date().toDateString()));

// Get call logs
const logs = await db.select()
  .from(callLogs)
  .where(eq(callLogs.conversationId, 'conv_123'));
```

### Using Raw SQL

```sql
-- Get all memories for a conversation
SELECT * FROM ai_receptionist_memory
WHERE session_metadata->>'conversationId' = 'conv_123'
ORDER BY timestamp ASC;

-- Get all call conversations
SELECT
  session_metadata->>'conversationId' as conversation_id,
  COUNT(*) as message_count,
  MIN(timestamp) as started_at,
  MAX(timestamp) as ended_at
FROM ai_receptionist_memory
WHERE channel = 'call'
GROUP BY session_metadata->>'conversationId'
ORDER BY started_at DESC;

-- Get all important decisions
SELECT content, timestamp, metadata
FROM ai_receptionist_memory
WHERE type = 'decision' AND importance >= 8
ORDER BY timestamp DESC;

-- Get all leads captured via phone calls
SELECT * FROM ai_receptionist_leads
WHERE source = 'call'
ORDER BY created_at DESC;

-- Call success rate
SELECT
  outcome,
  COUNT(*) as count
FROM ai_receptionist_call_logs
GROUP BY outcome;

-- Get customer preferences
SELECT
  content,
  metadata,
  timestamp
FROM ai_receptionist_memory
WHERE type = 'decision'
  AND content LIKE '%prefer%'
ORDER BY timestamp DESC;
```

## Benefits

✅ **Memory-Centric Architecture** - Single source of truth for all conversation data
✅ **Zero Configuration** - SDK handles table creation automatically
✅ **Database Agnostic** - Works with PostgreSQL, MySQL, SQLite
✅ **Flexible Storage** - Swap storage implementations easily (Database, Redis, Custom)
✅ **Type-Safe** - Full TypeScript support
✅ **AI-Powered** - AI automatically persists important memories
✅ **Queryable** - Use Memory API or direct SQL queries
✅ **Channel Aware** - Track conversations across call, SMS, and email
✅ **No Lock-in** - Standard SQL tables you fully control
✅ **SOLID Principles** - Clean architecture following SDK best practices

## Dependencies

```json
{
  "dependencies": {
    "@loctelli/ai-receptionist": "^0.1.0",
    "drizzle-orm": "^0.30.0"
  },

  // Plus your database driver (pick one):
  "devDependencies": {
    "pg": "^8.11.0",              // For PostgreSQL
    // OR
    "mysql2": "^3.9.0",           // For MySQL
    // OR
    "better-sqlite3": "^9.4.0"    // For SQLite
  }
}
```

## Migration Strategy

### Migrating from Old Architecture

If you were using the old `ConversationStore` architecture:

**Before (v0.x)**:
```typescript
const receptionist = new AIReceptionist({
  conversationStore: new InMemoryConversationStore() // ❌ Old
});
```

**After (v1.x)**:
```typescript
const receptionist = new AIReceptionist({
  agent: {
    identity: { /* ... */ },
    memory: {
      longTermEnabled: true,
      longTermStorage: new InMemoryStorage() // ✅ New
    }
  }
});
```

**Data Migration Script**:
```typescript
// Migrate data from old conversations table to new memory table
import { conversations } from './old-schema';
import { memory } from './new-schema';

const oldConversations = await db.select().from(conversations);

for (const conv of oldConversations) {
  for (const msg of conv.messages) {
    await db.insert(memory).values({
      id: `${conv.id}-${msg.timestamp}`,
      content: msg.content,
      timestamp: msg.timestamp,
      type: 'conversation',
      channel: conv.channel,
      sessionMetadata: {
        conversationId: conv.id,
        callSid: conv.callSid,
        messageSid: conv.messageSid,
        status: conv.status
      },
      role: msg.role,
      toolCall: msg.toolCall,
      toolResult: msg.toolResult
    });
  }
}
```

### Using with Existing Database

If you already have a database and want to use the SDK:

1. **Option 1: Separate Tables** (Recommended)
   - SDK creates its own tables with `ai_receptionist_` prefix
   - Your existing tables remain untouched
   - Join data in your application layer

2. **Option 2: Custom Table Prefix**
   - Use `tablePrefix` to namespace SDK tables
   - Example: `tablePrefix: 'sarah_'` creates `sarah_memory`, `sarah_leads`, etc.

3. **Option 3: Manual Control**
   - Set `autoMigrate: false`
   - Create tables yourself matching the schema
   - SDK will use your tables

4. **Option 4: Custom Storage Implementation**
   - Implement `IStorage` interface to adapt to your existing schema
   - Full control over how data is stored and retrieved

## Architecture Deep Dive

For a complete understanding of the Memory-Centric Architecture and the rationale behind removing `ConversationStore`, see:
- **[Memory Architecture Refactor](./architecture/memory-architecture-refactor.md)** - Detailed refactoring plan
- **[Agent System](./architecture/AGENT_SYSTEM.md)** - Six-Pillar Agent Architecture

### Key Architectural Decisions

1. **Single Source of Truth**: Agent memory system owns all conversational data
2. **Dependency Inversion**: Storage is abstracted via `IStorage` interface
3. **Channel Agnostic**: Channel info is metadata, not a separate concept
4. **Flexible Persistence**: Swap storage backends without changing agent code
5. **SOLID Compliance**: Follows all SOLID principles for maintainability

## Future Enhancements

Planned features:
- **Redis Storage** - High-performance in-memory storage with persistence
- **MongoDB Storage** - Document-based storage for complex metadata
- **Vector Storage Integration** - Seamless integration with vector databases for RAG
- **Custom Adapters** - Integrate with existing schemas via adapters
- **RAG Integration** - Use memory as knowledge source for AI context
- **Analytics Dashboard** - Built-in tools for memory analytics and insights
- **Multi-tenant Support** - Tenant-scoped memory isolation

## Need Help?

- **Architecture**: See [Memory Architecture Refactor](./architecture/memory-architecture-refactor.md)
- **Schema Reference**: See `src/agent/storage/schema.ts`
- **Examples**: See `examples/database-integration/`
- **Migration Guide**: See "Migration Strategy" section above
- **Issues**: https://github.com/KennethAtchon/Loctelli/issues
