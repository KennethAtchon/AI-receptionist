/**
 * MemoryManager - Multi-tier memory system
 *
 * The Memory pillar encompasses:
 * - Short-term memory (working memory)
 * - Long-term memory (persistent storage)
 * - Vector memory (semantic search)
 */

import type {
  MemoryManager as IMemoryManager,
  MemoryConfig,
  Memory,
  MemoryContext,
  MemoryStats,
  MemorySearchQuery,
  Message,
  Channel
} from '../types';

import { ShortTermMemory } from './ShortTermMemory';
import { LongTermMemory } from './LongTermMemory';
import { VectorMemory } from './VectorMemory';
import { logger } from '../../utils/logger';

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
   * Initialize the memory manager
   */
  public async initialize(): Promise<void> {
    // Future: Load initial context from storage
  }

  /**
   * Retrieve relevant context for current interaction
   */
  public async retrieve(input: string, context?: {
    conversationId?: string;
    channel?: Channel;
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
      // No conversationId provided - start fresh with no memory context
      // Memory is still stored but not fed into the prompt
      memoryContext.shortTerm = [];
    }

    // Get relevant long-term memories (if available)
    if (this.longTerm && context?.conversationId) {
      try {
        const keywords = this.extractKeywords(input);
        const searchQuery: MemorySearchQuery = {
          keywords,
          limit: 5,
          minImportance: 5, // Only important memories
          conversationId: context.conversationId
        };

        if (context?.channel) {
          searchQuery.channel = context.channel;
        }

        const longTermMemories = await this.longTerm.search(searchQuery);
        memoryContext.longTerm = longTermMemories;
      } catch (error) {
        logger.warn('[MemoryManager] Long-term memory search failed:', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Get semantically similar interactions (if available)
    if (this.vector && context?.conversationId) {
      try {
        const embedding = await this.generateEmbedding(input);
        const semanticMemories = await this.vector.similaritySearch(embedding, {
          limit: 3,
          threshold: 0.8
        });
        memoryContext.semantic = semanticMemories;
      } catch (error) {
        logger.warn('[MemoryManager] Vector memory search failed:', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return memoryContext;
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
          logger.warn('[MemoryManager] Failed to store vector embedding:', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
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
    // - System event
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
    // Simple keyword extraction - remove common words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const words = input.toLowerCase().split(/\s+/);
    return words.filter(word => !commonWords.has(word) && word.length > 3);
  }

  /**
   * Generate embedding for text (placeholder)
   * In production, this would call an embedding model
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - in production, use OpenAI embeddings or similar
    // For now, return a dummy embedding
    return new Array(1536).fill(0).map(() => Math.random());
  }

  /**
   * Get memory statistics
   */
  public getStats(): MemoryStats {
    return {
      shortTermCount: this.shortTerm.count(),
      longTermCount: this.longTerm?.count() || 0,
      semanticCount: 0 // Vector stores don't have a simple count
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
   * Clear all memory (useful for testing)
   */
  public async clearAll(): Promise<void> {
    this.shortTerm.clear();
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }

  /**
   * Clear short-term memory only
   */
  public clearShortTerm(): void {
    this.shortTerm.clear();
  }

  /**
   * Clear long-term memory cache
   */
  public clearLongTerm(): void {
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }

  // ==================== NEW METHODS FOR CONVERSATION MANAGEMENT ====================

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

  /**
   * Get all memories for a specific channel
   */
  public async getChannelHistory(
    channel: Channel,
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
   * Create a new conversation session
   */
  public async startSession(session: {
    conversationId: string;
    channel: Channel;
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

  // ==================== HELPER METHODS ====================

  /**
   * Convert Memory objects to Message format
   */
  private convertMemoriesToMessages(memories: Memory[]): Message[] {
    return memories.map(memory => ({
      role: memory.role || 'assistant',
      content: memory.content,
      timestamp: memory.timestamp,
      toolCall: memory.toolCall,
      toolResult: memory.toolResult
    }));
  }
}
