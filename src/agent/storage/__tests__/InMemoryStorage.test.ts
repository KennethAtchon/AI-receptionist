/**
 * Unit tests for InMemoryStorage
 */

import { InMemoryStorage } from '../InMemoryStorage';
import type { Memory } from '../../types';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('save', () => {
    it('should save a memory', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
        importance: 5,
        channel: 'call',
        sessionMetadata: {
          conversationId: 'conv_1',
          status: 'active',
        },
      };

      await storage.save(memory);

      const retrieved = await storage.get('mem_1');
      expect(retrieved).toEqual(memory);
    });

    it('should update indexes when saving', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
        channel: 'call',
        sessionMetadata: {
          conversationId: 'conv_123',
        },
      };

      await storage.save(memory);

      // Verify conversation index
      const byConversation = await storage.search({
        conversationId: 'conv_123',
      });
      expect(byConversation).toHaveLength(1);
      expect(byConversation[0].id).toBe('mem_1');

      // Verify channel index
      const byChannel = await storage.search({
        channel: 'call',
      });
      expect(byChannel).toHaveLength(1);
      expect(byChannel[0].id).toBe('mem_1');
    });

    it('should overwrite existing memory with same id', async () => {
      const memory1: Memory = {
        id: 'mem_1',
        content: 'Original content',
        timestamp: new Date(),
        type: 'conversation',
      };

      const memory2: Memory = {
        id: 'mem_1',
        content: 'Updated content',
        timestamp: new Date(),
        type: 'decision',
        importance: 8,
      };

      await storage.save(memory1);
      await storage.save(memory2);

      const retrieved = await storage.get('mem_1');
      expect(retrieved?.content).toBe('Updated content');
      expect(retrieved?.type).toBe('decision');
      expect(storage.count()).toBe(1);
    });
  });

  describe('saveBatch', () => {
    it('should save multiple memories', async () => {
      const memories: Memory[] = [
        {
          id: 'mem_1',
          content: 'Memory 1',
          timestamp: new Date(),
          type: 'conversation',
        },
        {
          id: 'mem_2',
          content: 'Memory 2',
          timestamp: new Date(),
          type: 'decision',
        },
        {
          id: 'mem_3',
          content: 'Memory 3',
          timestamp: new Date(),
          type: 'tool_execution',
        },
      ];

      await storage.saveBatch(memories);

      expect(storage.count()).toBe(3);
      const mem1 = await storage.get('mem_1');
      const mem2 = await storage.get('mem_2');
      const mem3 = await storage.get('mem_3');

      expect(mem1).toBeDefined();
      expect(mem2).toBeDefined();
      expect(mem3).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve existing memory', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
      };

      await storage.save(memory);
      const retrieved = await storage.get('mem_1');

      expect(retrieved).toEqual(memory);
    });

    it('should return null for non-existent memory', async () => {
      const retrieved = await storage.get('non_existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Setup test data
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const memories: Memory[] = [
        {
          id: 'mem_1',
          content: 'Hello world',
          timestamp: now,
          type: 'conversation',
          importance: 5,
          channel: 'call',
          role: 'user',
          sessionMetadata: { conversationId: 'conv_1' },
        },
        {
          id: 'mem_2',
          content: 'Important decision made',
          timestamp: now,
          type: 'decision',
          importance: 9,
          channel: 'call',
          role: 'assistant',
          sessionMetadata: { conversationId: 'conv_1' },
        },
        {
          id: 'mem_3',
          content: 'Error occurred',
          timestamp: yesterday,
          type: 'error',
          importance: 7,
          channel: 'sms',
          role: 'system',
          sessionMetadata: { conversationId: 'conv_2' },
        },
        {
          id: 'mem_4',
          content: 'Tool executed successfully',
          timestamp: tomorrow,
          type: 'tool_execution',
          importance: 6,
          channel: 'email',
          role: 'tool',
          sessionMetadata: { conversationId: 'conv_3' },
        },
      ];

      await storage.saveBatch(memories);
    });

    it('should search by conversationId', async () => {
      const results = await storage.search({
        conversationId: 'conv_1',
      });

      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['mem_1', 'mem_2']);
    });

    it('should search by channel', async () => {
      const results = await storage.search({
        channel: 'call',
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.channel === 'call')).toBe(true);
    });

    it('should search by type (single)', async () => {
      const results = await storage.search({
        type: 'decision',
      });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('decision');
    });

    it('should search by type (multiple)', async () => {
      const results = await storage.search({
        type: ['conversation', 'decision'],
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => ['conversation', 'decision'].includes(r.type))).toBe(true);
    });

    it('should search by role', async () => {
      const results = await storage.search({
        role: 'assistant',
      });

      expect(results).toHaveLength(1);
      expect(results[0].role).toBe('assistant');
    });

    it('should search by date range', async () => {
      const now = new Date();
      const results = await storage.search({
        startDate: new Date(now.getTime() - 1000), // 1 second ago
        endDate: new Date(now.getTime() + 1000), // 1 second from now
      });

      expect(results).toHaveLength(2); // mem_1 and mem_2
    });

    it('should search by importance', async () => {
      const results = await storage.search({
        minImportance: 8,
      });

      expect(results).toHaveLength(1);
      expect(results[0].importance).toBeGreaterThanOrEqual(8);
    });

    it('should search by keywords', async () => {
      const results = await storage.search({
        keywords: ['decision'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('decision');
    });

    it('should search with multiple keywords (OR logic)', async () => {
      const results = await storage.search({
        keywords: ['Hello', 'Error'],
      });

      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['mem_1', 'mem_3']);
    });

    it('should combine multiple filters', async () => {
      const results = await storage.search({
        channel: 'call',
        type: 'decision',
        minImportance: 8,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem_2');
    });

    it('should sort by timestamp ascending', async () => {
      const results = await storage.search({
        orderBy: 'timestamp',
        orderDirection: 'asc',
      });

      expect(results[0].id).toBe('mem_3'); // yesterday
      expect(results[3].id).toBe('mem_4'); // tomorrow
    });

    it('should sort by timestamp descending (default)', async () => {
      const results = await storage.search({
        orderBy: 'timestamp',
        orderDirection: 'desc',
      });

      expect(results[0].id).toBe('mem_4'); // tomorrow
      expect(results[3].id).toBe('mem_3'); // yesterday
    });

    it('should sort by importance', async () => {
      const results = await storage.search({
        orderBy: 'importance',
        orderDirection: 'desc',
      });

      expect(results[0].importance).toBe(9); // mem_2
      expect(results[3].importance).toBe(5); // mem_1
    });

    it('should paginate results', async () => {
      const page1 = await storage.search({
        limit: 2,
        offset: 0,
      });

      const page2 = await storage.search({
        limit: 2,
        offset: 2,
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should return empty array for no matches', async () => {
      const results = await storage.search({
        conversationId: 'non_existent',
      });

      expect(results).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a memory', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
        channel: 'call',
        sessionMetadata: { conversationId: 'conv_1' },
      };

      await storage.save(memory);
      expect(storage.count()).toBe(1);

      await storage.delete('mem_1');
      expect(storage.count()).toBe(0);

      const retrieved = await storage.get('mem_1');
      expect(retrieved).toBeNull();
    });

    it('should clean up indexes when deleting', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
        channel: 'call',
        sessionMetadata: { conversationId: 'conv_1' },
      };

      await storage.save(memory);
      await storage.delete('mem_1');

      // Indexes should be cleaned
      const byConversation = await storage.search({ conversationId: 'conv_1' });
      const byChannel = await storage.search({ channel: 'call' });

      expect(byConversation).toHaveLength(0);
      expect(byChannel).toHaveLength(0);
    });

    it('should not throw when deleting non-existent memory', async () => {
      await expect(storage.delete('non_existent')).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should always return true for in-memory storage', async () => {
      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should clear all memories', async () => {
      await storage.saveBatch([
        { id: 'mem_1', content: 'Test 1', timestamp: new Date(), type: 'conversation' },
        { id: 'mem_2', content: 'Test 2', timestamp: new Date(), type: 'decision' },
      ]);

      expect(storage.count()).toBe(2);

      storage.clear();

      expect(storage.count()).toBe(0);
      const retrieved = await storage.get('mem_1');
      expect(retrieved).toBeNull();
    });

    it('should count memories correctly', async () => {
      expect(storage.count()).toBe(0);

      await storage.save({
        id: 'mem_1',
        content: 'Test',
        timestamp: new Date(),
        type: 'conversation',
      });

      expect(storage.count()).toBe(1);

      await storage.save({
        id: 'mem_2',
        content: 'Test 2',
        timestamp: new Date(),
        type: 'decision',
      });

      expect(storage.count()).toBe(2);

      await storage.delete('mem_1');

      expect(storage.count()).toBe(1);
    });

    it('should get all memories', async () => {
      const memories: Memory[] = [
        { id: 'mem_1', content: 'Test 1', timestamp: new Date(), type: 'conversation' },
        { id: 'mem_2', content: 'Test 2', timestamp: new Date(), type: 'decision' },
        { id: 'mem_3', content: 'Test 3', timestamp: new Date(), type: 'error' },
      ];

      await storage.saveBatch(memories);

      const all = storage.getAll();
      expect(all).toHaveLength(3);
      expect(all.map(m => m.id).sort()).toEqual(['mem_1', 'mem_2', 'mem_3']);
    });
  });

  describe('edge cases', () => {
    it('should handle memories without optional fields', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Minimal memory',
        timestamp: new Date(),
        type: 'system',
      };

      await storage.save(memory);
      const retrieved = await storage.get('mem_1');

      expect(retrieved).toEqual(memory);
    });

    it('should handle empty search results with pagination', async () => {
      const results = await storage.search({
        conversationId: 'non_existent',
        limit: 10,
        offset: 0,
      });

      expect(results).toEqual([]);
    });

    it('should handle searches with all filters combined', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Important decision about booking',
        timestamp: new Date(),
        type: 'decision',
        importance: 9,
        channel: 'call',
        role: 'assistant',
        sessionMetadata: {
          conversationId: 'conv_123',
          status: 'active',
        },
      };

      await storage.save(memory);

      const results = await storage.search({
        conversationId: 'conv_123',
        channel: 'call',
        type: 'decision',
        role: 'assistant',
        minImportance: 8,
        keywords: ['booking'],
        orderBy: 'timestamp',
        orderDirection: 'desc',
        limit: 10,
        offset: 0,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('mem_1');
    });
  });
});
