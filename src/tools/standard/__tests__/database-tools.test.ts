/**
 * Unit tests for database tools
 */

import { ToolRegistry } from '../../registry';
import { setupDatabaseTools } from '../database-tools';
import { InMemoryStorage } from '../../../agent/storage/InMemoryStorage';
import type { Agent } from '../../../agent/core/Agent';
import type { MemoryManager } from '../../../agent/types';

// Mock Agent
const createMockAgent = (): Agent => {
  const mockStorage = new InMemoryStorage();

  const mockMemory: MemoryManager = {
    store: jest.fn(async (memory) => {
      await mockStorage.save(memory);
    }),
    retrieve: jest.fn(),
    initialize: jest.fn(),
    dispose: jest.fn(),
    getStats: jest.fn(() => ({ shortTermCount: 0, longTermCount: 0, semanticCount: 0 })),
    getConversationHistory: jest.fn(),
    getChannelHistory: jest.fn(),
    search: jest.fn(async (query) => {
      return await mockStorage.search(query);
    }),
    startSession: jest.fn(),
    endSession: jest.fn(),
  };

  return {
    memory: mockMemory,
    // Add other required Agent properties as mocks
  } as any;
};

describe('Database Tools', () => {
  let registry: ToolRegistry;
  let mockAgent: Agent;
  let mockStorage: InMemoryStorage;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockStorage = new InMemoryStorage();
    mockAgent = createMockAgent();
  });

  describe('setupDatabaseTools', () => {
    it('should register all 5 database tools', () => {
      setupDatabaseTools(registry, {
        agent: mockAgent,
        storage: mockStorage,
      });

      expect(registry.has('save_customer_info')).toBe(true);
      expect(registry.has('find_customer')).toBe(true);
      expect(registry.has('log_call_outcome')).toBe(true);
      expect(registry.has('remember_preference')).toBe(true);
      expect(registry.has('recall_preference')).toBe(true);
      expect(registry.count()).toBe(5);
    });
  });

  describe('save_customer_info', () => {
    beforeEach(() => {
      setupDatabaseTools(registry, { agent: mockAgent, storage: mockStorage });
    });

    it('should save customer information to memory', async () => {
      const tool = registry.get('save_customer_info');
      const result = await tool.handlers.default(
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company: 'Acme Corp',
        },
        {
          channel: 'call',
          conversationId: 'conv_123',
          callSid: 'call_456',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('customerId');
      expect(result.data?.savedFields).toContain('name');
      expect(result.data?.savedFields).toContain('email');
      expect(result.response.speak).toContain('saved your information');

      // Verify memory was stored
      expect(mockAgent.memory.store).toHaveBeenCalled();
    });

    it('should handle partial customer data', async () => {
      const tool = registry.get('save_customer_info');
      const result = await tool.handlers.default(
        {
          email: 'jane@example.com',
        },
        {
          channel: 'sms',
          conversationId: 'conv_789',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.savedFields).toEqual(['email']);
    });

    it('should handle errors gracefully', async () => {
      // Create agent with failing memory store
      const failingAgent = {
        memory: {
          store: jest.fn().mockRejectedValue(new Error('Storage failure')),
        },
      } as any;

      const failingRegistry = new ToolRegistry();
      setupDatabaseTools(failingRegistry, { agent: failingAgent, storage: mockStorage });

      const tool = failingRegistry.get('save_customer_info');
      const result = await tool.handlers.default(
        { name: 'Test' },
        { channel: 'call', conversationId: 'conv_123' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save');
    });
  });

  describe('find_customer', () => {
    beforeEach(() => {
      setupDatabaseTools(registry, { agent: mockAgent, storage: mockStorage });
    });

    it('should find existing customer by email', async () => {
      // First save a customer
      const saveTool = registry.get('save_customer_info');
      await saveTool.handlers.default(
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      // Now find the customer
      const findTool = registry.get('find_customer');
      const result = await findTool.handlers.default(
        { email: 'john@example.com' },
        { channel: 'call', conversationId: 'conv_456' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.found).toBe(true);
      expect(result.data?.customer).toHaveProperty('name', 'John Doe');
      expect(result.data?.customer).toHaveProperty('email', 'john@example.com');
    });

    it('should return not found for unknown customer', async () => {
      const tool = registry.get('find_customer');
      const result = await tool.handlers.default(
        { email: 'unknown@example.com' },
        { channel: 'call', conversationId: 'conv_123' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.found).toBe(false);
      expect(result.response.speak).toContain("don't have any previous records");
    });

    it('should search by phone number', async () => {
      // Save a customer
      const saveTool = registry.get('save_customer_info');
      await saveTool.handlers.default(
        {
          name: 'Jane Doe',
          phone: '+9876543210',
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      // Find by phone
      const findTool = registry.get('find_customer');
      const result = await findTool.handlers.default(
        { phone: '+9876543210' },
        { channel: 'call', conversationId: 'conv_456' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.found).toBe(true);
      expect(result.data?.customer).toHaveProperty('name', 'Jane Doe');
    });
  });

  describe('log_call_outcome', () => {
    beforeEach(() => {
      setupDatabaseTools(registry, { agent: mockAgent, storage: mockStorage });
    });

    it('should log successful appointment booking', async () => {
      const tool = registry.get('log_call_outcome');
      const result = await tool.handlers.default(
        {
          outcome: 'appointment_booked',
          summary: 'Booked demo for Tuesday 2pm',
          nextSteps: 'Send calendar invite',
        },
        {
          channel: 'call',
          conversationId: 'conv_123',
          callSid: 'call_456',
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.outcome).toBe('appointment_booked');
      expect(result.response.speak).toContain('logged the outcome');

      // Verify memory was stored with goal achieved
      expect(mockAgent.memory.store).toHaveBeenCalled();
      const storedMemory = (mockAgent.memory.store as jest.Mock).mock.calls[0][0];
      expect(storedMemory.goalAchieved).toBe(true);
      expect(storedMemory.type).toBe('system');
      expect(storedMemory.importance).toBe(8);
    });

    it('should log callback requests', async () => {
      const tool = registry.get('log_call_outcome');
      const result = await tool.handlers.default(
        {
          outcome: 'callback_requested',
          summary: 'Customer wants callback next week',
        },
        { channel: 'call', conversationId: 'conv_789' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.outcome).toBe('callback_requested');
    });

    it('should mark qualified leads as goal achieved', async () => {
      const tool = registry.get('log_call_outcome');
      await tool.handlers.default(
        {
          outcome: 'qualified_lead',
          summary: 'High-value lead qualified',
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      const storedMemory = (mockAgent.memory.store as jest.Mock).mock.calls[0][0];
      expect(storedMemory.goalAchieved).toBe(true);
    });

    it('should not mark unsuccessful outcomes as goal achieved', async () => {
      const tool = registry.get('log_call_outcome');
      await tool.handlers.default(
        {
          outcome: 'not_interested',
          summary: 'Customer not interested',
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      const storedMemory = (mockAgent.memory.store as jest.Mock).mock.calls[0][0];
      expect(storedMemory.goalAchieved).toBe(false);
    });
  });

  describe('remember_preference', () => {
    beforeEach(() => {
      setupDatabaseTools(registry, { agent: mockAgent, storage: mockStorage });
    });

    it('should remember customer preference with default importance', async () => {
      const tool = registry.get('remember_preference');
      const result = await tool.handlers.default(
        {
          key: 'preferred_time',
          value: 'morning appointments',
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.key).toBe('preferred_time');
      expect(result.data?.value).toBe('morning appointments');
      expect(result.response.speak).toContain('remember that you prefer');

      // Verify memory was stored
      expect(mockAgent.memory.store).toHaveBeenCalled();
      const storedMemory = (mockAgent.memory.store as jest.Mock).mock.calls[0][0];
      expect(storedMemory.type).toBe('decision');
      expect(storedMemory.importance).toBe(7); // Default
    });

    it('should respect custom importance level', async () => {
      const tool = registry.get('remember_preference');
      await tool.handlers.default(
        {
          key: 'dietary_restriction',
          value: 'vegetarian',
          importance: 9,
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      const storedMemory = (mockAgent.memory.store as jest.Mock).mock.calls[0][0];
      expect(storedMemory.importance).toBe(9);
    });

    it('should remember communication preferences', async () => {
      const tool = registry.get('remember_preference');
      const result = await tool.handlers.default(
        {
          key: 'communication_style',
          value: 'formal communication',
          importance: 8,
        },
        { channel: 'email', conversationId: 'conv_456' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.value).toBe('formal communication');
    });
  });

  describe('recall_preference', () => {
    beforeEach(() => {
      setupDatabaseTools(registry, { agent: mockAgent, storage: mockStorage });
    });

    it('should recall previously saved preference', async () => {
      // First remember a preference
      const rememberTool = registry.get('remember_preference');
      await rememberTool.handlers.default(
        {
          key: 'preferred_time',
          value: 'afternoon meetings',
        },
        { channel: 'call', conversationId: 'conv_123' }
      );

      // Now recall it
      const recallTool = registry.get('recall_preference');
      const result = await recallTool.handlers.default(
        { key: 'preferred_time' },
        { channel: 'call', conversationId: 'conv_456' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.found).toBe(true);
      expect(result.data?.value).toBe('afternoon meetings');
      expect(result.response.speak).toContain('remember you prefer');
    });

    it('should return not found for unknown preference', async () => {
      const tool = registry.get('recall_preference');
      const result = await tool.handlers.default(
        { key: 'unknown_preference' },
        { channel: 'call', conversationId: 'conv_123' }
      );

      expect(result.success).toBe(true);
      expect(result.data?.found).toBe(false);
      expect(result.response.speak).toContain("don't have a saved preference");
    });

    it('should return the most recent preference value', async () => {
      const rememberTool = registry.get('remember_preference');

      // Remember first value
      await rememberTool.handlers.default(
        { key: 'contact_method', value: 'email' },
        { channel: 'call', conversationId: 'conv_1' }
      );

      // Update to new value
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      await rememberTool.handlers.default(
        { key: 'contact_method', value: 'phone' },
        { channel: 'call', conversationId: 'conv_2' }
      );

      // Recall should return the most recent
      const recallTool = registry.get('recall_preference');
      const result = await recallTool.handlers.default(
        { key: 'contact_method' },
        { channel: 'call', conversationId: 'conv_3' }
      );

      expect(result.data?.value).toBe('phone');
    });
  });

  describe('Cross-tool integration', () => {
    beforeEach(() => {
      setupDatabaseTools(registry, { agent: mockAgent, storage: mockStorage });
    });

    it('should save customer and recall their preferences', async () => {
      // Save customer
      const saveTool = registry.get('save_customer_info');
      await saveTool.handlers.default(
        {
          name: 'Alice Johnson',
          email: 'alice@example.com',
        },
        { channel: 'call', conversationId: 'conv_1' }
      );

      // Remember preference
      const rememberTool = registry.get('remember_preference');
      await rememberTool.handlers.default(
        {
          key: 'preferred_day',
          value: 'Tuesdays',
          importance: 8,
        },
        { channel: 'call', conversationId: 'conv_1' }
      );

      // Log outcome
      const logTool = registry.get('log_call_outcome');
      await logTool.handlers.default(
        {
          outcome: 'appointment_booked',
          summary: 'Booked for next Tuesday',
        },
        { channel: 'call', conversationId: 'conv_1' }
      );

      // Later, find customer and recall preference
      const findTool = registry.get('find_customer');
      const customerResult = await findTool.handlers.default(
        { email: 'alice@example.com' },
        { channel: 'call', conversationId: 'conv_2' }
      );

      const recallTool = registry.get('recall_preference');
      const preferenceResult = await recallTool.handlers.default(
        { key: 'preferred_day' },
        { channel: 'call', conversationId: 'conv_2' }
      );

      expect(customerResult.data?.found).toBe(true);
      expect(customerResult.data?.customer.name).toBe('Alice Johnson');
      expect(preferenceResult.data?.found).toBe(true);
      expect(preferenceResult.data?.value).toBe('Tuesdays');

      // Verify all memories were stored
      expect(mockAgent.memory.store).toHaveBeenCalledTimes(3);
    });
  });
});
