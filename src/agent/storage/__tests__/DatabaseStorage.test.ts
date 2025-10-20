/**
 * Integration tests for DatabaseStorage
 *
 * Note: These tests require a database connection to run.
 * They are meant to be run in integration test suites, not unit tests.
 */

import { DatabaseStorage } from '../DatabaseStorage';
import type { Memory } from '../../types';

// Mock Drizzle DB for unit testing
const createMockDb = () => {
  const mockData = new Map<string, any>();

  return {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            then: (resolve: any) => resolve(Array.from(mockData.values())),
          })),
        })),
        limit: jest.fn(() => ({
          then: (resolve: any) => resolve(Array.from(mockData.values())),
        })),
      })),
    })),
    insert: jest.fn((table) => ({
      values: jest.fn((data: any) => {
        if (Array.isArray(data)) {
          data.forEach((item) => mockData.set(item.id, item));
        } else {
          mockData.set(data.id, data);
        }
        return Promise.resolve();
      }),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve()),
    })),
    _mockData: mockData,
  };
};

describe('DatabaseStorage', () => {
  let mockDb: any;
  let storage: DatabaseStorage;

  beforeEach(() => {
    mockDb = createMockDb();
    storage = new DatabaseStorage({
      db: mockDb,
      autoMigrate: false, // Don't attempt migrations in tests
    });
  });

  describe('constructor', () => {
    it('should create instance with database connection', () => {
      expect(storage).toBeInstanceOf(DatabaseStorage);
    });

    it('should accept custom table name', () => {
      const customStorage = new DatabaseStorage({
        db: mockDb,
        tableName: 'custom_memory',
        autoMigrate: false,
      });

      expect(customStorage).toBeInstanceOf(DatabaseStorage);
    });
  });

  describe('save', () => {
    it('should call database insert with correct data', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
        importance: 5,
        channel: 'call',
        sessionMetadata: {
          conversationId: 'conv_1',
        },
      };

      await storage.save(memory);

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value;
      expect(insertCall.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mem_1',
          content: 'Test memory',
          type: 'conversation',
        })
      );
    });

    it('should handle memories with all fields', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Complete memory',
        timestamp: new Date(),
        type: 'tool_execution',
        importance: 9,
        channel: 'email',
        role: 'tool',
        sessionMetadata: {
          conversationId: 'conv_123',
          status: 'completed',
          duration: 300,
        },
        toolCall: {
          id: 'tool_1',
          name: 'book_appointment',
          parameters: { date: '2025-10-20' },
        },
        toolResult: {
          success: true,
          data: { bookingId: 'booking_123' },
        },
        metadata: {
          custom: 'value',
        },
        goalAchieved: true,
      };

      await storage.save(memory);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('saveBatch', () => {
    it('should save multiple memories in one operation', async () => {
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
      ];

      await storage.saveBatch(memories);

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.results[0].value;
      expect(insertCall.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'mem_1' }),
          expect.objectContaining({ id: 'mem_2' }),
        ])
      );
    });

    it('should handle empty array', async () => {
      await storage.saveBatch([]);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should retrieve memory by id', async () => {
      const memory: Memory = {
        id: 'mem_1',
        content: 'Test memory',
        timestamp: new Date(),
        type: 'conversation',
      };

      // Setup mock to return data
      mockDb._mockData.set('mem_1', memory);

      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([memory])),
          })),
        })),
      });

      const result = await storage.get('mem_1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null for non-existent id', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
      });

      const result = await storage.get('non_existent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete memory by id', async () => {
      await storage.delete('mem_1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is accessible', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([])),
        })),
      });

      const healthy = await storage.healthCheck();

      expect(healthy).toBe(true);
    });

    it('should return false when database throws error', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => ({
          limit: jest.fn(() => Promise.reject(new Error('Connection failed'))),
        })),
      });

      const healthy = await storage.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should count memories', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => Promise.resolve([{ count: 42 }])),
      });

      const count = await storage.count();

      expect(count).toBe(42);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should handle zero count', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn(() => Promise.resolve([{ count: 0 }])),
      });

      const count = await storage.count();

      expect(count).toBe(0);
    });

    it('should clear all memories', async () => {
      await storage.clear();

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

/**
 * REAL DATABASE INTEGRATION TESTS
 *
 * These tests should be run separately with a real database connection.
 * They are skipped by default in unit tests.
 */
describe.skip('DatabaseStorage - Integration Tests', () => {
  // These tests require actual database setup
  // Run with: TEST_DATABASE_URL=postgresql://... npm test -- --testNamePattern="Integration"

  let storage: DatabaseStorage;

  beforeAll(async () => {
    // Setup real database connection
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL environment variable required for integration tests');
    }

    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { Pool } = await import('pg');

    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
    });

    const db = drizzle(pool);

    storage = new DatabaseStorage({
      db,
      autoMigrate: true,
    });

    // Clear test data
    await storage.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await storage.clear();
  });

  it('should save and retrieve memory from real database', async () => {
    const memory: Memory = {
      id: 'integration_test_1',
      content: 'Real database test',
      timestamp: new Date(),
      type: 'conversation',
      importance: 8,
      channel: 'call',
    };

    await storage.save(memory);

    const retrieved = await storage.get('integration_test_1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe('Real database test');
  });

  it('should search with complex queries', async () => {
    const memories: Memory[] = [
      {
        id: 'test_1',
        content: 'First memory',
        timestamp: new Date(),
        type: 'conversation',
        importance: 5,
        channel: 'call',
        sessionMetadata: { conversationId: 'conv_1' },
      },
      {
        id: 'test_2',
        content: 'Second memory',
        timestamp: new Date(),
        type: 'decision',
        importance: 9,
        channel: 'call',
        sessionMetadata: { conversationId: 'conv_1' },
      },
      {
        id: 'test_3',
        content: 'Third memory',
        timestamp: new Date(),
        type: 'conversation',
        importance: 6,
        channel: 'sms',
        sessionMetadata: { conversationId: 'conv_2' },
      },
    ];

    await storage.saveBatch(memories);

    const results = await storage.search({
      conversationId: 'conv_1',
      channel: 'call',
      minImportance: 5,
    });

    expect(results).toHaveLength(2);
  });
});
