/**
 * ShortTermMemory - Working memory for recent conversation context
 *
 * This is a simple ring buffer that keeps the most recent messages
 * in memory for the current conversation context.
 */

import type { Memory, Message } from '../types';
import { logger } from '../../utils/logger';

export class ShortTermMemory {
  private buffer: Memory[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  /**
   * Add a memory to short-term storage
   */
  public async add(memory: Memory): Promise<void> {
    const countBefore = this.buffer.length;
    const evictedCount = countBefore >= this.maxSize ? 1 : 0;
    const evictedMemory = countBefore >= this.maxSize ? this.buffer[0] : undefined;

    logger.info('[ShortTermMemory] Adding memory', {
      memoryId: memory.id,
      type: memory.type,
      role: memory.role,
      conversationId: memory.sessionMetadata?.conversationId,
      contentPreview: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
      bufferCountBefore: countBefore,
      maxSize: this.maxSize,
      willEvict: countBefore >= this.maxSize,
      evictedMemoryId: evictedMemory?.id
    });

    this.buffer.push(memory);

    // Evict oldest if over capacity
    while (this.buffer.length > this.maxSize) {
      const evicted = this.buffer.shift();
      logger.info('[ShortTermMemory] Evicted memory from buffer', {
        evictedMemoryId: evicted?.id,
        evictedType: evicted?.type,
        bufferCountAfter: this.buffer.length
      });
    }

    logger.info('[ShortTermMemory] Memory added', {
      memoryId: memory.id,
      bufferCountAfter: this.buffer.length,
      evictedCount
    });
  }

  /**
   * Get recent memories
   */
  public async getRecent(count: number): Promise<Memory[]> {
    return this.buffer.slice(-count);
  }

  /**
   * Get all memories in short-term storage
   */
  public getAll(): Memory[] {
    const memories = [...this.buffer];
    logger.info('[ShortTermMemory] Retrieved all memories', {
      count: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        type: m.type,
        role: m.role,
        contentPreview: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
      }))
    });
    return memories;
  }

  /**
   * Convert memories to messages format
   */
  public toMessages(): Message[] {
    return this.buffer.map(memory => ({
      role: 'assistant',
      content: memory.content,
      timestamp: memory.timestamp
    }));
  }

  /**
   * Clear all short-term memory
   */
  public clear(): void {
    this.buffer = [];
  }

  /**
   * Get count of memories in storage
   */
  public count(): number {
    return this.buffer.length;
  }

  /**
   * Check if storage is full
   */
  public isFull(): boolean {
    return this.buffer.length >= this.maxSize;
  }

  /**
   * Get oldest memory
   */
  public getOldest(): Memory | undefined {
    return this.buffer[0];
  }

  /**
   * Get newest memory
   */
  public getNewest(): Memory | undefined {
    return this.buffer[this.buffer.length - 1];
  }
}
