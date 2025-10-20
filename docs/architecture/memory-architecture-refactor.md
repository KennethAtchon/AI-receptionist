# Memory Architecture Refactor Plan

## Executive Summary

**Problem**: Current architecture has redundant storage systems - both `IConversationStore` and `Agent Memory System` store similar conversation data, creating duplication, tight coupling, and violating SOLID principles.

**Solution**: Consolidate to a single **Memory-Centric Architecture** where the Agent's Memory System is the single source of truth for all conversation and state data.

**Impact**: Simpler architecture, better separation of concerns, improved maintainability, and adherence to SDK best practices.

---

## Current Architecture Problems

### 1. Redundancy
- **`IConversationStore`** stores: Conversations with messages, metadata, channel info
- **`MemoryManager`** stores: Memory objects with content, metadata, conversation context
- **Result**: Same data stored in two places

### 2. Tight Coupling
```typescript
// LongTermMemory.ts - VIOLATES DIP
export class LongTermMemory {
  private readonly storage: IConversationStore; // ❌ Depends on concrete conversation store

  constructor(storage: IConversationStore) {
    this.storage = storage;
  }
}
```
- Memory system depends on Conversation-specific storage
- Violates Dependency Inversion Principle
- Hard to test and swap implementations

### 3. Conceptual Overlap
```typescript
// Same data, different shapes
Conversation {
  id: string
  channel: 'call' | 'sms' | 'email'
  messages: ConversationMessage[]
  metadata: Record<string, any>
  status: 'active' | 'completed' | 'failed'
}

Memory {
  id: string
  content: string
  metadata: Record<string, any>
  type: 'conversation' | 'decision' | 'error'
}
```

### 4. Unclear Responsibility
- Who owns conversation history? ConversationStore or MemoryManager?
- Where should channel-specific data live?
- How do we query past conversations?

---

## Proposed Architecture: Memory-Centric

### Core Principle
**The Agent's Memory System is the single source of truth for all conversational state.**

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Memory Manager                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │   │
│  │  │ Short Term │  │ Long Term  │  │   Vector     │   │   │
│  │  │  (Buffer)  │  │ (Storage)  │  │  (Semantic)  │   │   │
│  │  └────────────┘  └────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          │ Uses                              │
│                          ▼                                   │
│              ┌───────────────────────┐                       │
│              │   IStorage Interface  │ (Generic)             │
│              └───────────────────────┘                       │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ Implementation
                           ▼
               ┌──────────────────────┐
               │  Storage Adapters    │
               │  - InMemoryStorage   │
               │  - PostgresStorage   │
               │  - MongoStorage      │
               │  - RedisStorage      │
               └──────────────────────┘
```

---

## Implementation Plan

### Phase 1: Extend Memory Types

**File**: `src/agent/types.ts`

```typescript
// ENHANCED Memory type with channel support
export interface Memory {
  // Core fields
  id: string;
  content: string;
  timestamp: Date;
  type: 'conversation' | 'decision' | 'error' | 'tool_execution' | 'system';
  importance?: number; // 1-10, determines if saved to long-term

  // NEW: Channel tracking
  channel?: 'call' | 'sms' | 'email';

  // NEW: Session metadata
  sessionMetadata?: {
    conversationId?: string;
    callSid?: string;
    messageSid?: string;
    emailId?: string;
    status?: 'active' | 'completed' | 'failed';
    duration?: number; // For calls
    participants?: string[]; // Phone numbers, emails, etc.
  };

  // NEW: Role tracking (like messages)
  role?: 'system' | 'user' | 'assistant' | 'tool';

  // NEW: Tool execution tracking
  toolCall?: {
    id: string;
    name: string;
    parameters: any;
  };

  toolResult?: {
    success: boolean;
    data?: any;
    error?: string;
  };

  // Existing fields
  metadata?: Record<string, any>;
  goalAchieved?: boolean;
}

// NEW: Generic storage interface
export interface IStorage {
  /**
   * Save a memory to persistent storage
   */
  save(memory: Memory): Promise<void>;

  /**
   * Save multiple memories in batch
   */
  saveBatch(memories: Memory[]): Promise<void>;

  /**
   * Get a specific memory by ID
   */
  get(id: string): Promise<Memory | null>;

  /**
   * Search memories with flexible query
   */
  search(query: MemorySearchQuery): Promise<Memory[]>;

  /**
   * Delete a memory
   */
  delete(id: string): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

// NEW: Flexible search query
export interface MemorySearchQuery {
  // Full-text search
  keywords?: string[];

  // Filter by type
  type?: Memory['type'] | Memory['type'][];

  // Filter by channel
  channel?: 'call' | 'sms' | 'email';

  // Filter by conversation
  conversationId?: string;

  // Filter by date range
  startDate?: Date;
  endDate?: Date;

  // Filter by importance
  minImportance?: number;

  // Filter by role
  role?: 'system' | 'user' | 'assistant' | 'tool';

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  orderBy?: 'timestamp' | 'importance';
  orderDirection?: 'asc' | 'desc';
}

// Updated MemoryConfig
export interface MemoryConfig {
  // Short-term config
  contextWindow?: number; // Default: 20 messages

  // Long-term config
  longTermEnabled?: boolean;
  longTermStorage?: IStorage; // ✅ Generic, not conversation-specific

  // Vector config
  vectorEnabled?: boolean;
  vectorStore?: IVectorStore;

  // Auto-persistence rules
  autoPersist?: {
    minImportance?: number; // Auto-save if importance >= this
    types?: Memory['type'][]; // Auto-save these types
  };
}
```

### Phase 2: Update MemoryManager

**File**: `src/agent/memory/MemoryManager.ts`

```typescript
/**
 * MemoryManager - Multi-tier memory system
 *
 * The single source of truth for all agent memory.
 * Handles conversation history, decisions, tool executions, and preferences.
 */

import type {
  MemoryManager as IMemoryManager,
  MemoryConfig,
  Memory,
  MemoryContext,
  MemoryStats,
  MemorySearchQuery
} from '../types';

import { ShortTermMemory } from './ShortTermMemory';
import { LongTermMemory } from './LongTermMemory';
import { VectorMemory } from './VectorMemory';

export class MemoryManagerImpl implements IMemoryManager {
  private readonly shortTerm: ShortTermMemory;
  private readonly longTerm?: LongTermMemory;
  private readonly vector?: VectorMemory;
  private readonly config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;

    // Initialize short-term memory (always present)
    this.shortTerm = new ShortTermMemory(config.contextWindow || 20);

    // Initialize long-term memory if enabled
    if (config.longTermEnabled && config.longTermStorage) {
      this.longTerm = new LongTermMemory(config.longTermStorage);
    }

    // Initialize vector memory if enabled
    if (config.vectorEnabled && config.vectorStore) {
      this.vector = new VectorMemory(config.vectorStore);
    }
  }

  /**
   * Store new memory
   */
  public async store(memory: Memory): Promise<void> {
    // Always store in short-term memory
    await this.shortTerm.add(memory);

    // Decide if important enough for long-term storage
    if (this.shouldPersist(memory) && this.longTerm) {
      await this.longTerm.add(memory);

      // Generate embeddings and store in vector DB
      if (this.vector) {
        try {
          const embedding = await this.generateEmbedding(memory.content);
          await this.vector.add(embedding, memory);
        } catch (error) {
          console.warn('Failed to store vector embedding:', error);
        }
      }
    }
  }

  // NEW: Conversation-specific methods
  /**
   * Get all memories for a specific conversation
   */
  public async getConversationHistory(conversationId: string): Promise<Memory[]> {
    if (!this.longTerm) {
      // Fallback to short-term if no long-term storage
      return this.shortTerm.getAll().filter(
        m => m.sessionMetadata?.conversationId === conversationId
      );
    }

    return this.longTerm.search({
      conversationId,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    });
  }

  // NEW: Channel-specific methods
  /**
   * Get all memories for a specific channel
   */
  public async getChannelHistory(
    channel: 'call' | 'sms' | 'email',
    options?: { limit?: number; conversationId?: string }
  ): Promise<Memory[]> {
    if (!this.longTerm) {
      return this.shortTerm.getAll().filter(m => m.channel === channel);
    }

    return this.longTerm.search({
      channel,
      conversationId: options?.conversationId,
      limit: options?.limit,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });
  }

  // NEW: Session management
  /**
   * Create a new conversation session
   */
  public async startSession(session: {
    conversationId: string;
    channel: 'call' | 'sms' | 'email';
    metadata?: Record<string, any>;
  }): Promise<void> {
    const memory: Memory = {
      id: `session-start-${session.conversationId}`,
      content: `Started ${session.channel} conversation`,
      timestamp: new Date(),
      type: 'system',
      channel: session.channel,
      sessionMetadata: {
        conversationId: session.conversationId,
        status: 'active'
      },
      metadata: session.metadata,
      importance: 5
    };

    await this.store(memory);
  }

  /**
   * End a conversation session
   */
  public async endSession(conversationId: string, summary?: string): Promise<void> {
    const memory: Memory = {
      id: `session-end-${conversationId}`,
      content: summary || 'Conversation ended',
      timestamp: new Date(),
      type: 'system',
      sessionMetadata: {
        conversationId,
        status: 'completed'
      },
      importance: 7 // Higher importance for session summaries
    };

    await this.store(memory);
  }

  // NEW: Flexible search
  /**
   * Search memories with advanced filtering
   */
  public async search(query: MemorySearchQuery): Promise<Memory[]> {
    if (!this.longTerm) {
      // Basic filtering on short-term memory
      let results = this.shortTerm.getAll();

      if (query.channel) {
        results = results.filter(m => m.channel === query.channel);
      }

      if (query.conversationId) {
        results = results.filter(
          m => m.sessionMetadata?.conversationId === query.conversationId
        );
      }

      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        results = results.filter(m => types.includes(m.type));
      }

      return results.slice(0, query.limit || 10);
    }

    return this.longTerm.search(query);
  }

  /**
   * Retrieve relevant context for current interaction
   */
  public async retrieve(input: string, context?: {
    conversationId?: string;
    channel?: 'call' | 'sms' | 'email';
  }): Promise<MemoryContext> {
    const memoryContext: MemoryContext = {
      shortTerm: [],
      longTerm: [],
      semantic: []
    };

    // Get recent conversation context from short-term memory
    if (context?.conversationId) {
      const conversationMemories = this.shortTerm.getAll().filter(
        m => m.sessionMetadata?.conversationId === context.conversationId
      );
      memoryContext.shortTerm = this.convertMemoriesToMessages(conversationMemories);
    } else {
      memoryContext.shortTerm = this.shortTerm.toMessages();
    }

    // Get relevant long-term memories (if available)
    if (this.longTerm) {
      try {
        const keywords = this.extractKeywords(input);
        const searchQuery: MemorySearchQuery = {
          keywords,
          limit: 5,
          minImportance: 5 // Only important memories
        };

        // Add context filters
        if (context?.conversationId) {
          searchQuery.conversationId = context.conversationId;
        }
        if (context?.channel) {
          searchQuery.channel = context.channel;
        }

        const longTermMemories = await this.longTerm.search(searchQuery);
        memoryContext.longTerm = this.convertMemoriesToMessages(longTermMemories);
      } catch (error) {
        console.warn('Long-term memory search failed:', error);
      }
    }

    // Get semantically similar interactions (if available)
    if (this.vector) {
      try {
        const embedding = await this.generateEmbedding(input);
        const semanticMemories = await this.vector.similaritySearch(embedding, {
          limit: 3,
          threshold: 0.8
        });
        memoryContext.semantic = this.convertMemoriesToMessages(semanticMemories);
      } catch (error) {
        console.warn('Vector memory search failed:', error);
      }
    }

    return memoryContext;
  }

  /**
   * Convert Memory objects to Message format
   */
  private convertMemoriesToMessages(memories: Memory[]): any[] {
    return memories.map(memory => ({
      role: memory.role || 'assistant',
      content: memory.content,
      timestamp: memory.timestamp,
      toolCall: memory.toolCall,
      toolResult: memory.toolResult
    }));
  }

  /**
   * Determine if a memory should be persisted to long-term storage
   */
  private shouldPersist(memory: Memory): boolean {
    // Use auto-persist rules if configured
    if (this.config.autoPersist) {
      const { minImportance, types } = this.config.autoPersist;

      if (minImportance && memory.importance && memory.importance >= minImportance) {
        return true;
      }

      if (types && types.includes(memory.type)) {
        return true;
      }
    }

    // Default rules: Persist if:
    // - High importance (> 7)
    // - Decision was made
    // - Error occurred (for learning)
    // - Goal was achieved
    // - Tool was executed
    // - Session start/end
    return (
      (memory.importance !== undefined && memory.importance > 7) ||
      memory.type === 'decision' ||
      memory.type === 'error' ||
      memory.type === 'tool_execution' ||
      memory.type === 'system' ||
      memory.goalAchieved === true
    );
  }

  /**
   * Extract keywords from input (simple implementation)
   */
  private extractKeywords(input: string): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'is', 'was', 'are', 'were', 'be', 'been', 'being'
    ]);
    const words = input.toLowerCase().split(/\s+/);
    return words.filter(word => !commonWords.has(word) && word.length > 3);
  }

  /**
   * Generate embedding for text (placeholder)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Implement with OpenAI embeddings or similar
    return new Array(1536).fill(0).map(() => Math.random());
  }

  /**
   * Get memory statistics
   */
  public getStats(): MemoryStats {
    return {
      shortTermCount: this.shortTerm.count(),
      longTermCount: this.longTerm?.count() || 0,
      semanticCount: 0
    };
  }

  /**
   * Dispose of memory resources
   */
  public async dispose(): Promise<void> {
    this.shortTerm.clear();
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }

  /**
   * Clear all memory
   */
  public async clearAll(): Promise<void> {
    this.shortTerm.clear();
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }
}
```

### Phase 3: Update LongTermMemory

**File**: `src/agent/memory/LongTermMemory.ts`

```typescript
/**
 * LongTermMemory - Persistent memory storage
 *
 * Now uses generic IStorage interface instead of IConversationStore
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';

export class LongTermMemory {
  private readonly storage: IStorage; // ✅ Generic storage interface
  private cache: Map<string, Memory> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Add a memory to long-term storage
   */
  public async add(memory: Memory): Promise<void> {
    // Store in persistent storage
    await this.storage.save(memory);

    // Update cache
    this.cache.set(memory.id, memory);
  }

  /**
   * Search for memories matching a query
   */
  public async search(query: MemorySearchQuery): Promise<Memory[]> {
    return this.storage.search(query);
  }

  /**
   * Get a specific memory by ID
   */
  public async get(id: string): Promise<Memory | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Fetch from storage
    const memory = await this.storage.get(id);
    if (memory) {
      this.cache.set(id, memory);
    }
    return memory;
  }

  /**
   * Check if a memory exists
   */
  public has(id: string): boolean {
    return this.cache.has(id);
  }

  /**
   * Clear the cache (but not persistent storage)
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get count of cached memories
   */
  public count(): number {
    return this.cache.size;
  }
}
```

### Phase 4: Create Storage Implementations

**File**: `src/agent/storage/InMemoryStorage.ts`

```typescript
/**
 * In-Memory Storage Implementation
 * For development and testing
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';

export class InMemoryStorage implements IStorage {
  private memories = new Map<string, Memory>();
  private conversationIndex = new Map<string, Set<string>>(); // conversationId -> memory IDs
  private channelIndex = new Map<string, Set<string>>(); // channel -> memory IDs

  async save(memory: Memory): Promise<void> {
    this.memories.set(memory.id, memory);

    // Update indexes
    if (memory.sessionMetadata?.conversationId) {
      const conversationId = memory.sessionMetadata.conversationId;
      if (!this.conversationIndex.has(conversationId)) {
        this.conversationIndex.set(conversationId, new Set());
      }
      this.conversationIndex.get(conversationId)!.add(memory.id);
    }

    if (memory.channel) {
      if (!this.channelIndex.has(memory.channel)) {
        this.channelIndex.set(memory.channel, new Set());
      }
      this.channelIndex.get(memory.channel)!.add(memory.id);
    }
  }

  async saveBatch(memories: Memory[]): Promise<void> {
    for (const memory of memories) {
      await this.save(memory);
    }
  }

  async get(id: string): Promise<Memory | null> {
    return this.memories.get(id) || null;
  }

  async search(query: MemorySearchQuery): Promise<Memory[]> {
    let results = Array.from(this.memories.values());

    // Filter by conversation ID
    if (query.conversationId) {
      const memoryIds = this.conversationIndex.get(query.conversationId);
      if (memoryIds) {
        results = results.filter(m => memoryIds.has(m.id));
      } else {
        return [];
      }
    }

    // Filter by channel
    if (query.channel) {
      results = results.filter(m => m.channel === query.channel);
    }

    // Filter by type
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      results = results.filter(m => types.includes(m.type));
    }

    // Filter by role
    if (query.role) {
      results = results.filter(m => m.role === query.role);
    }

    // Filter by date range
    if (query.startDate) {
      results = results.filter(m => m.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter(m => m.timestamp <= query.endDate!);
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      results = results.filter(
        m => m.importance !== undefined && m.importance >= query.minImportance!
      );
    }

    // Keyword search (simple)
    if (query.keywords && query.keywords.length > 0) {
      results = results.filter(m => {
        const content = m.content.toLowerCase();
        return query.keywords!.some(keyword => content.includes(keyword.toLowerCase()));
      });
    }

    // Sort
    const orderBy = query.orderBy || 'timestamp';
    const orderDirection = query.orderDirection || 'desc';
    results.sort((a, b) => {
      const aVal = a[orderBy as keyof Memory] as any;
      const bVal = b[orderBy as keyof Memory] as any;
      if (aVal < bVal) return orderDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return orderDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }

  async delete(id: string): Promise<void> {
    const memory = this.memories.get(id);
    if (memory) {
      // Clean up indexes
      if (memory.sessionMetadata?.conversationId) {
        this.conversationIndex.get(memory.sessionMetadata.conversationId)?.delete(id);
      }
      if (memory.channel) {
        this.channelIndex.get(memory.channel)?.delete(id);
      }
    }
    this.memories.delete(id);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Utility methods
  clear(): void {
    this.memories.clear();
    this.conversationIndex.clear();
    this.channelIndex.clear();
  }

  count(): number {
    return this.memories.size;
  }
}
```

**File**: `src/agent/storage/DatabaseStorage.ts`

```typescript
/**
 * Database Storage Implementation
 * Uses Drizzle ORM for database persistence
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';
import type { DrizzleDB } from 'drizzle-orm';
import { eq, and, gte, lte, inArray, desc, asc } from 'drizzle-orm';

export interface DatabaseStorageConfig {
  db: DrizzleDB;
  tableName?: string;
}

export class DatabaseStorage implements IStorage {
  private db: DrizzleDB;
  private table: any; // Drizzle table

  constructor(config: DatabaseStorageConfig) {
    this.db = config.db;
    // Initialize table schema
    // TODO: Create table if autoMigrate is enabled
  }

  async save(memory: Memory): Promise<void> {
    await this.db.insert(this.table).values({
      id: memory.id,
      content: memory.content,
      timestamp: memory.timestamp,
      type: memory.type,
      importance: memory.importance,
      channel: memory.channel,
      session_metadata: memory.sessionMetadata,
      role: memory.role,
      tool_call: memory.toolCall,
      tool_result: memory.toolResult,
      metadata: memory.metadata,
      goal_achieved: memory.goalAchieved
    });
  }

  async saveBatch(memories: Memory[]): Promise<void> {
    await this.db.insert(this.table).values(
      memories.map(m => ({
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        type: m.type,
        importance: m.importance,
        channel: m.channel,
        session_metadata: m.sessionMetadata,
        role: m.role,
        tool_call: m.toolCall,
        tool_result: m.toolResult,
        metadata: m.metadata,
        goal_achieved: m.goalAchieved
      }))
    );
  }

  async get(id: string): Promise<Memory | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return result[0] ? this.mapToMemory(result[0]) : null;
  }

  async search(query: MemorySearchQuery): Promise<Memory[]> {
    let dbQuery = this.db.select().from(this.table);

    // Build WHERE clauses
    const conditions = [];

    if (query.conversationId) {
      conditions.push(
        eq(this.table.session_metadata.conversationId, query.conversationId)
      );
    }

    if (query.channel) {
      conditions.push(eq(this.table.channel, query.channel));
    }

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      conditions.push(inArray(this.table.type, types));
    }

    if (query.role) {
      conditions.push(eq(this.table.role, query.role));
    }

    if (query.startDate) {
      conditions.push(gte(this.table.timestamp, query.startDate));
    }

    if (query.endDate) {
      conditions.push(lte(this.table.timestamp, query.endDate));
    }

    if (query.minImportance !== undefined) {
      conditions.push(gte(this.table.importance, query.minImportance));
    }

    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions));
    }

    // Order
    const orderBy = query.orderBy || 'timestamp';
    const orderDirection = query.orderDirection || 'desc';
    const orderColumn = this.table[orderBy];
    dbQuery = dbQuery.orderBy(
      orderDirection === 'asc' ? asc(orderColumn) : desc(orderColumn)
    );

    // Pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    dbQuery = dbQuery.limit(limit).offset(offset);

    const results = await dbQuery;
    return results.map(r => this.mapToMemory(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(this.table).where(eq(this.table.id, id));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.select().from(this.table).limit(1);
      return true;
    } catch {
      return false;
    }
  }

  private mapToMemory(row: any): Memory {
    return {
      id: row.id,
      content: row.content,
      timestamp: row.timestamp,
      type: row.type,
      importance: row.importance,
      channel: row.channel,
      sessionMetadata: row.session_metadata,
      role: row.role,
      toolCall: row.tool_call,
      toolResult: row.tool_result,
      metadata: row.metadata,
      goalAchieved: row.goal_achieved
    };
  }
}
```

### Phase 5: Update Configuration Types

**File**: `src/types/index.ts`

```typescript
// REMOVE: IConversationStore interface
// DELETE: Conversation type (or move to legacy)
// DELETE: ConversationMessage type (use Memory instead)

// UPDATE: AIReceptionistConfig
export interface AIReceptionistConfig {
  // Core agent configuration (Six-Pillar Architecture)
  agent: {
    identity: AgentIdentityConfig;
    personality?: AgentPersonalityConfig;
    knowledge?: AgentKnowledgeConfig;
    goals?: AgentGoalConfig;
    memory?: AgentMemoryConfig; // ✅ Now handles all storage
    voice?: VoiceConfig;
  };

  model: AIModelConfig;
  tools?: ToolConfig;
  providers: ProviderConfig;

  // REMOVE: conversationStore (now part of agent.memory)
  // conversationStore?: IConversationStore; ❌ DELETE THIS

  // Optional database for persistence
  database?: DatabaseConfig; // ✅ NEW: Optional database integration

  notifications?: NotificationConfig;
  analytics?: AnalyticsConfig;
  debug?: boolean;

  // Event callbacks
  onToolExecute?: (event: ToolExecutionEvent) => void;
  onToolError?: (event: ToolErrorEvent) => void;
  onConversationStart?: (event: ConversationEvent) => void;
  onConversationEnd?: (event: ConversationEvent) => void;
}

// NEW: Database configuration
export interface DatabaseConfig {
  connection: DrizzleConnection;
  autoMigrate?: boolean;
  tablePrefix?: string;
}
```

### Phase 6: Migration Guide

#### For Existing Users

**Before (Old Architecture)**:
```typescript
import { InMemoryConversationStore } from '@loctelli/ai-receptionist';

const receptionist = new AIReceptionist({
  agent: { /* ... */ },
  model: { /* ... */ },
  conversationStore: new InMemoryConversationStore() // ❌ Old way
});
```

**After (New Architecture)**:
```typescript
import { InMemoryStorage } from '@loctelli/ai-receptionist';

const receptionist = new AIReceptionist({
  agent: {
    identity: { /* ... */ },
    memory: {
      contextWindow: 20,
      longTermEnabled: true,
      longTermStorage: new InMemoryStorage() // ✅ New way
    }
  },
  model: { /* ... */ }
});
```

#### For Database Users

**Before**:
```typescript
const receptionist = new AIReceptionist({
  agent: { /* ... */ },
  model: { /* ... */ },
  conversationStore: new DrizzleConversationStore(db), // ❌ Old way
  database: { /* ... */ }
});
```

**After**:
```typescript
import { DatabaseStorage } from '@loctelli/ai-receptionist';

const receptionist = new AIReceptionist({
  agent: {
    identity: { /* ... */ },
    memory: {
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({ db }) // ✅ New way
    }
  },
  model: { /* ... */ },
  database: { /* ... */ } // Still used for auto-migrations
});
```

---

## Database Schema Changes

### New Memory Table

```sql
CREATE TABLE ai_receptionist_memory (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  type TEXT NOT NULL, -- 'conversation', 'decision', 'error', 'tool_execution', 'system'
  importance INTEGER,

  -- Channel tracking
  channel TEXT, -- 'call', 'sms', 'email'

  -- Session metadata
  session_metadata JSONB, -- { conversationId, callSid, messageSid, status, etc. }

  -- Role tracking
  role TEXT, -- 'system', 'user', 'assistant', 'tool'

  -- Tool tracking
  tool_call JSONB,
  tool_result JSONB,

  -- Additional fields
  metadata JSONB,
  goal_achieved BOOLEAN,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for fast queries
  INDEX idx_conversation_id ((session_metadata->>'conversationId')),
  INDEX idx_channel (channel),
  INDEX idx_type (type),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_importance (importance DESC)
);
```

### Remove Old Tables

```sql
-- These become redundant:
DROP TABLE IF EXISTS ai_receptionist_conversations; -- ❌ Replaced by memory table
-- Keep these:
-- ai_receptionist_leads (still useful for business logic)
-- ai_receptionist_call_logs (still useful for analytics)
```

---

## Benefits of This Refactor

### 1. **Single Source of Truth**
- ✅ Memory system owns all conversation data
- ✅ No duplication between ConversationStore and Memory
- ✅ Easier to reason about data flow

### 2. **Better Separation of Concerns**
- ✅ Agent owns its memory (proper encapsulation)
- ✅ Storage implementation is swappable (DIP)
- ✅ Channel-specific data is just metadata

### 3. **Improved Flexibility**
- ✅ Easy to add new storage backends (Redis, MongoDB, etc.)
- ✅ No conversation-specific coupling
- ✅ Generic IStorage interface is reusable

### 4. **Simpler API**
```typescript
// Old way - confusing
const conversation = await conversationStore.get(id);
const memory = await agent.memory.retrieve(input);

// New way - clear
const memories = await agent.memory.getConversationHistory(conversationId);
```

### 5. **Better Testing**
```typescript
// Mock storage easily
const mockStorage = {
  save: jest.fn(),
  search: jest.fn(),
  get: jest.fn()
};

const agent = Agent.builder()
  .withMemory({ longTermStorage: mockStorage })
  .build();
```

### 6. **Follows SOLID Principles**
- **Single Responsibility**: Memory manages memory, not conversations
- **Open/Closed**: Easy to extend with new storage types
- **Liskov Substitution**: All IStorage implementations are interchangeable
- **Interface Segregation**: Clean, focused interfaces
- **Dependency Inversion**: Depends on IStorage abstraction

---

## Implementation Checklist

### Core Changes
- [ ] Extend `Memory` type with channel and session metadata
- [ ] Create `IStorage` interface
- [ ] Create `MemorySearchQuery` type
- [ ] Update `MemoryManager` with new methods
- [ ] Update `LongTermMemory` to use `IStorage`
- [ ] Create `InMemoryStorage` implementation
- [ ] Create `DatabaseStorage` implementation

### Configuration Changes
- [ ] Remove `IConversationStore` from types
- [ ] Remove `conversationStore` from `AIReceptionistConfig`
- [ ] Update `MemoryConfig` to use `IStorage`
- [ ] Add database configuration docs

### Migration
- [ ] Write migration guide
- [ ] Create backwards compatibility layer (if needed)
- [ ] Update all examples
- [ ] Update documentation

### Testing
- [ ] Unit tests for `InMemoryStorage`
- [ ] Unit tests for `DatabaseStorage`
- [ ] Integration tests for memory retrieval
- [ ] Migration tests

### Documentation
- [ ] Update README
- [ ] Update architecture docs
- [ ] Update database integration guide
- [ ] Create migration guide

---

## Timeline

**Phase 1-2**: Core types and MemoryManager updates (1-2 days)
**Phase 3-4**: Storage implementations (2-3 days)
**Phase 5**: Configuration updates (1 day)
**Phase 6**: Migration guide and docs (1-2 days)
**Testing**: Comprehensive testing (2-3 days)

**Total**: ~1-2 weeks

---

## Risks and Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Provide backwards compatibility layer and clear migration guide

### Risk 2: Data Migration
**Mitigation**: Provide migration scripts to move data from old schema to new

### Risk 3: Performance
**Mitigation**: Add proper indexing, implement caching, benchmark before/after

### Risk 4: Complexity
**Mitigation**: Start with simple implementations, iterate based on usage

---

## Conclusion

This refactor eliminates architectural redundancy, improves separation of concerns, and creates a more flexible, maintainable system that follows SDK best practices. The Memory-Centric Architecture makes it clear that **the agent owns its memory**, and storage is just an implementation detail.

**Recommendation**: ✅ Proceed with this refactor. The benefits far outweigh the costs.
