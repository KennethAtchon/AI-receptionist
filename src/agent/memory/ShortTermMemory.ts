/**
 * ShortTermMemory - Working memory for recent conversation context
 *
 * This is a simple ring buffer that keeps the most recent messages
 * in memory for the current conversation context.
 */

import type { Memory, Message } from '../types';

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
    this.buffer.push(memory);

    // Evict oldest if over capacity
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
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
    return [...this.buffer];
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
