/**
 * LongTermMemory - Persistent memory storage
 *
 * Stores important information that should be remembered across conversations.
 * Uses generic IStorage backend for persistence.
 */

import type { Memory, IStorage, MemorySearchQuery } from '../types';

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
    // Store in persistent storage
    await this.storage.save(memory);

    // Update cache
    this.cache.set(memory.id, memory);
  }

  /**
   * Search for memories matching a query
   */
  public async search(query: MemorySearchQuery): Promise<Memory[]> {
    const results = await this.storage.search(query);
    return results;
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
