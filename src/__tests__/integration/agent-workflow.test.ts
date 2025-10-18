/**
 * Integration Tests - Complete Agent Workflow
 *
 * These tests demonstrate end-to-end workflows with the SDK.
 * Note: These are integration tests that may require mocked providers.
 */

import { AIReceptionist } from '../../client';
import { ToolRegistry } from '../../tools/registry';
import { ConversationService } from '../../services/conversation.service';
import { InMemoryConversationStore } from '../../storage/in-memory-conversation.store';
import { mockAgentSarah, mockBookingTool } from '../fixtures';

// Mock external providers
jest.mock('../../providers/ai/openai.provider');
jest.mock('../../providers/communication/twilio.provider');

describe('Integration: Agent Workflow', () => {
  describe('complete conversation lifecycle', () => {
    it('should_handle_conversation_from_start_to_finish', async () => {
      // 1. Setup
      const conversationStore = new InMemoryConversationStore();
      const conversationService = new ConversationService(conversationStore);

      // 2. Create conversation
      const conversation = await conversationService.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
        metadata: { leadId: 'lead_123' },
      });

      expect(conversation).toBeDefined();
      expect(conversation.status).toBe('active');

      // 3. Simulate conversation flow
      await conversationService.addMessage(conversation.id, {
        role: 'user',
        content: 'I want to book an appointment',
      });

      await conversationService.addMessage(conversation.id, {
        role: 'assistant',
        content: 'I\'d be happy to help! What date works for you?',
      });

      await conversationService.addMessage(conversation.id, {
        role: 'user',
        content: 'Tomorrow at 2pm',
      });

      // 4. Complete conversation
      await conversationService.complete(conversation.id);

      // 5. Verify final state
      const finalConversation = await conversationService.get(conversation.id);
      expect(finalConversation?.status).toBe('completed');
      expect(finalConversation?.messages).toHaveLength(3);
      expect(finalConversation?.endedAt).toBeInstanceOf(Date);
    });

    it('should_handle_tool_execution_in_conversation', async () => {
      // 1. Setup tools
      const toolRegistry = new ToolRegistry();
      toolRegistry.register(mockBookingTool);

      // 2. Execute tool
      const result = await toolRegistry.execute(
        'book_appointment',
        {
          date: '2025-01-20',
          time: '2:00 PM',
          service: 'consultation',
        },
        {
          channel: 'call',
          conversationId: 'conv_test',
          agent: mockAgentSarah,
        }
      );

      // 3. Verify result
      expect(result.success).toBe(true);
      expect(result.data.appointmentId).toBeDefined();
      expect(result.response.speak).toContain('scheduled');
    });
  });

  describe('multi-agent scenario', () => {
    it('should_support_cloning_agents_with_different_personalities', async () => {
      const baseConfig = {
        agent: mockAgentSarah,
        model: {
          provider: 'openai' as const,
          apiKey: 'test-key',
          model: 'gpt-4',
        },
        providers: {},
      };

      // Create first agent
      const sarah = new AIReceptionist(baseConfig);
      await sarah.initialize();

      // Clone with different personality
      const bob = sarah.clone({
        agent: {
          name: 'Bob',
          role: 'Technical Support',
          personality: 'patient and technical',
        },
      });

      // Both agents should be valid
      expect(sarah).toBeInstanceOf(AIReceptionist);
      expect(bob).toBeInstanceOf(AIReceptionist);
    });
  });

  describe('conversation store filtering', () => {
    it('should_filter_conversations_by_multiple_criteria', async () => {
      const store = new InMemoryConversationStore();
      const service = new ConversationService(store);

      // Create multiple conversations
      await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      await service.create({
        channel: 'sms',
        agentConfig: mockAgentSarah,
      });

      const emailConv = await service.create({
        channel: 'email',
        agentConfig: mockAgentSarah,
      });

      await service.complete(emailConv.id);

      // Test filtering
      const allConversations = await store.list();
      expect(allConversations).toHaveLength(3);

      const callConversations = await store.list({ channel: 'call' });
      expect(callConversations.length).toBe(1);

      const activeConversations = await store.list({ status: 'active' });
      expect(activeConversations.length).toBe(2);

      const completedConversations = await store.list({ status: 'completed' });
      expect(completedConversations.length).toBe(1);
    });
  });

  describe('tool registry management', () => {
    it('should_dynamically_add_and_remove_tools', async () => {
      const registry = new ToolRegistry();

      // Start empty
      expect(registry.count()).toBe(0);

      // Add tools
      registry.register(mockBookingTool);
      expect(registry.count()).toBe(1);

      // Create custom tool
      const customTool = {
        name: 'check_inventory',
        description: 'Check product inventory',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
          },
          required: ['productId'],
        },
        handlers: {
          default: async (params: any) => ({
            success: true,
            data: { inStock: true, quantity: 10 },
            response: { text: 'In stock' },
          }),
        },
      };

      registry.register(customTool);
      expect(registry.count()).toBe(2);

      // Remove tool
      registry.unregister('check_inventory');
      expect(registry.count()).toBe(1);

      // Verify remaining tool
      const remaining = registry.get('book_appointment');
      expect(remaining).toBeDefined();
    });
  });

  describe('error handling scenarios', () => {
    it('should_handle_conversation_not_found_gracefully', async () => {
      const service = new ConversationService();

      const result = await service.get('non_existent_id');
      expect(result).toBeNull();
    });

    it('should_handle_adding_message_to_non_existent_conversation', async () => {
      const service = new ConversationService();

      await expect(
        service.addMessage('non_existent_id', {
          role: 'user',
          content: 'Test',
        })
      ).rejects.toThrow('Conversation non_existent_id not found');
    });

    it('should_handle_tool_execution_errors', async () => {
      const failingTool = {
        name: 'failing_tool',
        description: 'Always fails',
        parameters: { type: 'object' },
        handlers: {
          default: async () => {
            throw new Error('Intentional failure');
          },
        },
      };

      const registry = new ToolRegistry();
      registry.register(failingTool);

      const result = await registry.execute('failing_tool', {}, {
        channel: 'call',
        conversationId: 'conv_test',
        agent: mockAgentSarah,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Intentional failure');
    });
  });

  describe('performance scenarios', () => {
    it('should_handle_large_number_of_conversations', async () => {
      const store = new InMemoryConversationStore();
      const service = new ConversationService(store);

      const count = 100;
      const conversations = [];

      // Create many conversations
      for (let i = 0; i < count; i++) {
        const conv = await service.create({
          channel: 'call',
          agentConfig: mockAgentSarah,
          metadata: { index: i },
        });
        conversations.push(conv);
      }

      expect(store.count()).toBe(count);

      // Verify we can retrieve them
      const allConversations = await store.list();
      expect(allConversations).toHaveLength(count);

      // Verify we can filter them
      const limited = await store.list({ limit: 10 });
      expect(limited).toHaveLength(10);
    });

    it('should_handle_conversations_with_many_messages', async () => {
      const service = new ConversationService();

      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      // Add many messages
      for (let i = 0; i < 100; i++) {
        await service.addMessage(conversation.id, {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        });
      }

      const retrieved = await service.get(conversation.id);
      expect(retrieved?.messages).toHaveLength(100);
    });
  });
});
