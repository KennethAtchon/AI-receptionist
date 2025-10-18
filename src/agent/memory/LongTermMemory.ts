/**
 * LongTermMemory - Persistent memory storage
 *
 * Stores important information that should be remembered across conversations.
 * Uses a conversation store backend for persistence.
 */

import type { Memory, IConversationStore } from '../types';

export class LongTermMemory {
  private readonly storage: IConversationStore;
  private cache: Map<string, Memory> = new Map();

  constructor(storage: IConversationStore) {
    this.storage = storage;
  }

  /**
   * Add a memory to long-term storage
   */
  public async add(memory: Memory): Promise<void> {
    // Store in persistent database
    await this.storage.save({
      id: memory.id,
      content: memory.content,
      metadata: memory.metadata,
      timestamp: memory.timestamp
    });

    // Update cache
    this.cache.set(memory.id, memory);
  }

  /**
   * Search for memories matching a query
   */
  public async search(query: any): Promise<Memory[]> {
    const results = await this.storage.search(query);
    return results;
  }

  /**
   * Get a specific memory by ID
   */
  public get(id: string): Memory | undefined {
    return this.cache.get(id);
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
