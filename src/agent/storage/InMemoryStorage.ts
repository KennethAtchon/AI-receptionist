/**
 * In-Memory Storage Implementation
 * For development and testing
 *
 * This storage keeps all memories in memory and loses data on restart.
 * Perfect for development, testing, and prototyping.
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

  // Utility methods for testing and debugging
  clear(): void {
    this.memories.clear();
    this.conversationIndex.clear();
    this.channelIndex.clear();
  }

  count(): number {
    return this.memories.size;
  }

  getAll(): Memory[] {
    return Array.from(this.memories.values());
  }
}
