/**
 * LongTermMemory - Persistent memory storage
 *
 * Stores important information that should be remembered across conversations.
 * Uses generic IStorage backend for persistence.
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';
import { logger } from '../../utils/logger';

export class LongTermMemory {
  private readonly storage: IStorage;
  private cache: Map<string, Memory> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Add a memory to long-term storage
   */
  public async add(memory: Memory): Promise<void> {
    logger.info('[LongTermMemory] Adding memory to long-term storage', {
      memoryId: memory.id,
      type: memory.type,
      role: memory.role,
      conversationId: memory.sessionMetadata?.conversationId,
      contentPreview: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
      contentLength: memory.content.length,
      cacheSizeBefore: this.cache.size
    });

    // Store in persistent storage
    await this.storage.save(memory);
    logger.info('[LongTermMemory] Memory saved to persistent storage', {
      memoryId: memory.id
    });

    // Update cache
    this.cache.set(memory.id, memory);
    logger.info('[LongTermMemory] Memory added to cache', {
      memoryId: memory.id,
      cacheSizeAfter: this.cache.size
    });
  }

  /**
   * Search for memories matching a query
   */
  public async search(query: MemorySearchQuery): Promise<Memory[]> {
    logger.info('[LongTermMemory] Searching memories', {
      query: {
        conversationId: query.conversationId,
        channel: query.channel,
        type: query.type,
        limit: query.limit,
        orderBy: query.orderBy,
        orderDirection: query.orderDirection
      }
    });

    const results = await this.storage.search(query);

    logger.info('[LongTermMemory] Search completed', {
      resultCount: results.length,
      results: results.map(m => ({
        id: m.id,
        type: m.type,
        role: m.role,
        contentPreview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        contentLength: m.content.length,
        timestamp: m.timestamp,
        conversationId: m.sessionMetadata?.conversationId
      }))
    });

    return results;
  }

  /**
   * Get a specific memory by ID
   */
  public async get(id: string): Promise<Memory | null> {
    logger.info('[LongTermMemory] Getting memory by ID', {
      memoryId: id,
      inCache: this.cache.has(id)
    });

    // Check cache first
    if (this.cache.has(id)) {
      const memory = this.cache.get(id)!;
      logger.info('[LongTermMemory] Memory retrieved from cache', {
        memoryId: id,
        type: memory.type,
        role: memory.role
      });
      return memory;
    }

    // Fetch from storage
    logger.info('[LongTermMemory] Memory not in cache, fetching from storage', { memoryId: id });
    const memory = await this.storage.get(id);
    if (memory) {
      this.cache.set(id, memory);
      logger.info('[LongTermMemory] Memory retrieved from storage and cached', {
        memoryId: id,
        type: memory.type,
        role: memory.role
      });
    } else {
      logger.info('[LongTermMemory] Memory not found in storage', { memoryId: id });
    }
    return memory;
  }

  /**
   * Check if a memory exists (in cache)
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
