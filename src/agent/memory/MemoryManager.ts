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
  MemoryStats
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
   * Initialize the memory manager
   */
  public async initialize(): Promise<void> {
    // Future: Load initial context from storage
  }

  /**
   * Retrieve relevant context for current interaction
   */
  public async retrieve(input: string): Promise<MemoryContext> {
    const context: MemoryContext = {
      shortTerm: [],
      longTerm: [],
      semantic: []
    };

    // Get recent conversation context from short-term memory
    const recentMemories = await this.shortTerm.getRecent(10);
    context.shortTerm = this.shortTerm.toMessages();

    // Get relevant long-term memories (if available)
    if (this.longTerm) {
      try {
        // Simple keyword-based search for now
        // In production, this would use more sophisticated retrieval
        const keywords = this.extractKeywords(input);
        context.longTerm = await this.longTerm.search({
          keywords,
          limit: 5
        });
      } catch (error) {
        // Long-term search failed, continue without it
        console.warn('Long-term memory search failed:', error);
      }
    }

    // Get semantically similar interactions (if available)
    if (this.vector) {
      try {
        // In production, you would generate embeddings for the input
        // For now, this is a placeholder
        const embedding = await this.generateEmbedding(input);
        context.semantic = await this.vector.similaritySearch(embedding, {
          limit: 3,
          threshold: 0.8
        });
      } catch (error) {
        // Vector search failed, continue without it
        console.warn('Vector memory search failed:', error);
      }
    }

    return context;
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

  /**
   * Determine if a memory should be persisted to long-term storage
   */
  private shouldPersist(memory: Memory): boolean {
    // Persist if:
    // - User shared important information (high importance)
    // - Decision was made
    // - Error occurred (for learning)
    // - Goal was achieved
    return (
      (memory.importance !== undefined && memory.importance > 7) ||
      memory.type === 'decision' ||
      memory.type === 'error' ||
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
}
