/**
 * VectorMemory - Semantic memory using vector embeddings
 *
 * Stores memories as vector embeddings for semantic similarity search.
 * Useful for retrieving contextually relevant memories.
 */

import type { Memory, IVectorStore, SearchOptions } from '../types';

export class VectorMemory {
  private readonly vectorStore: IVectorStore;

  constructor(vectorStore: IVectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * Add a memory with its vector embedding
   */
  public async add(embedding: number[], memory: Memory): Promise<void> {
    await this.vectorStore.upsert({
      id: memory.id,
      vector: embedding,
      metadata: memory
    });
  }

  /**
   * Search for semantically similar memories
   */
  public async similaritySearch(
    embedding: number[],
    options: SearchOptions
  ): Promise<Memory[]> {
    const results = await this.vectorStore.query({
      vector: embedding,
      topK: options.limit,
      threshold: options.threshold
    });

    return results.map(r => r.metadata as Memory);
  }

  /**
   * Find memories similar to a query embedding
   */
  public async findSimilar(
    queryEmbedding: number[],
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<Memory[]> {
    return this.similaritySearch(queryEmbedding, { limit, threshold });
  }
}
