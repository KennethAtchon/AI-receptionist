/**
 * Unit Tests - ConversationService
 */

import { ConversationService } from '../conversation.service';
import { InMemoryConversationStore } from '../../storage/in-memory-conversation.store';
import { IConversationStore, Conversation, ConversationMessage } from '../../types';
import { mockAgentSarah, mockConversationMessages } from '../../__tests__/fixtures';

describe('ConversationService', () => {
  let service: ConversationService;
  let store: IConversationStore;

  beforeEach(() => {
    store = new InMemoryConversationStore();
    service = new ConversationService(store);
  });

  describe('constructor', () => {
    it('should_create_service_with_provided_store', () => {
      const customStore = new InMemoryConversationStore();
      const customService = new ConversationService(customStore);

      expect(customService).toBeInstanceOf(ConversationService);
    });

    it('should_create_service_with_default_store_when_none_provided', () => {
      const defaultService = new ConversationService();

      expect(defaultService).toBeInstanceOf(ConversationService);
    });
  });

  describe('create', () => {
    it('should_create_new_conversation_successfully', async () => {
      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      expect(conversation).toBeDefined();
      expect(conversation.id).toMatch(/^conv_/);
      expect(conversation.channel).toBe('call');
      expect(conversation.status).toBe('active');
      expect(conversation.messages).toEqual([]);
      expect(conversation.startedAt).toBeInstanceOf(Date);
      expect(conversation.endedAt).toBeUndefined();
    });

    it('should_create_conversation_with_metadata', async () => {
      const metadata = {
        phoneNumber: '+1234567890',
        leadId: 'lead_123',
        source: 'website',
      };

      const conversation = await service.create({
        channel: 'sms',
        agentConfig: mockAgentSarah,
        metadata,
      });

      expect(conversation.metadata).toEqual(metadata);
    });

    it('should_create_conversation_with_callSid', async () => {
      const callSid = 'CA123456789';

      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
        callSid,
      });

      expect(conversation.callSid).toBe(callSid);
    });

    it('should_create_conversation_with_messageSid', async () => {
      const messageSid = 'SM987654321';

      const conversation = await service.create({
        channel: 'sms',
        agentConfig: mockAgentSarah,
        messageSid,
      });

      expect(conversation.messageSid).toBe(messageSid);
    });

    it('should_generate_unique_conversation_ids', async () => {
      const conv1 = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      const conv2 = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      expect(conv1.id).not.toBe(conv2.id);
    });

    it('should_save_conversation_to_store', async () => {
      const conversation = await service.create({
        channel: 'email',
        agentConfig: mockAgentSarah,
      });

      const retrieved = await store.get(conversation.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(conversation.id);
    });
  });

  describe('addMessage', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });
      conversationId = conversation.id;
    });

    it('should_add_message_to_conversation', async () => {
      await service.addMessage(conversationId, {
        role: 'user',
        content: 'Hello, I need help',
      });

      const conversation = await service.get(conversationId);
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0].content).toBe('Hello, I need help');
      expect(conversation?.messages[0].role).toBe('user');
    });

    it('should_add_timestamp_to_message', async () => {
      const beforeTime = Date.now();

      await service.addMessage(conversationId, {
        role: 'assistant',
        content: 'How can I help you?',
      });

      const afterTime = Date.now();
      const conversation = await service.get(conversationId);
      const messageTime = conversation?.messages[0].timestamp.getTime();

      expect(messageTime).toBeGreaterThanOrEqual(beforeTime);
      expect(messageTime).toBeLessThanOrEqual(afterTime);
    });

    it('should_add_multiple_messages_in_order', async () => {
      await service.addMessage(conversationId, {
        role: 'user',
        content: 'First message',
      });

      await service.addMessage(conversationId, {
        role: 'assistant',
        content: 'Second message',
      });

      await service.addMessage(conversationId, {
        role: 'user',
        content: 'Third message',
      });

      const conversation = await service.get(conversationId);
      expect(conversation?.messages).toHaveLength(3);
      expect(conversation?.messages[0].content).toBe('First message');
      expect(conversation?.messages[1].content).toBe('Second message');
      expect(conversation?.messages[2].content).toBe('Third message');
    });

    it('should_add_system_messages', async () => {
      await service.addMessage(conversationId, {
        role: 'system',
        content: 'You are a helpful assistant',
      });

      const conversation = await service.get(conversationId);
      expect(conversation?.messages[0].role).toBe('system');
    });

    it('should_add_tool_messages_with_tool_call', async () => {
      await service.addMessage(conversationId, {
        role: 'tool',
        content: 'Tool executed successfully',
        toolCall: {
          id: 'call_123',
          name: 'book_appointment',
          parameters: { date: '2025-01-20' },
        },
      });

      const conversation = await service.get(conversationId);
      expect(conversation?.messages[0].toolCall).toBeDefined();
      expect(conversation?.messages[0].toolCall?.name).toBe('book_appointment');
    });

    it('should_throw_error_when_conversation_not_found', async () => {
      await expect(
        service.addMessage('non_existent_id', {
          role: 'user',
          content: 'Test',
        })
      ).rejects.toThrow('Conversation non_existent_id not found');
    });

    it('should_preserve_existing_messages_when_adding_new', async () => {
      await service.addMessage(conversationId, {
        role: 'user',
        content: 'Message 1',
      });

      await service.addMessage(conversationId, {
        role: 'assistant',
        content: 'Message 2',
      });

      const conversation = await service.get(conversationId);
      expect(conversation?.messages).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should_retrieve_conversation_by_id', async () => {
      const created = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      const retrieved = await service.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should_return_null_when_conversation_not_found', async () => {
      const result = await service.get('non_existent_id');

      expect(result).toBeNull();
    });

    it('should_retrieve_conversation_with_messages', async () => {
      const conversation = await service.create({
        channel: 'sms',
        agentConfig: mockAgentSarah,
      });

      await service.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message',
      });

      const retrieved = await service.get(conversation.id);
      expect(retrieved?.messages).toHaveLength(1);
    });
  });

  describe('getByCallId', () => {
    it('should_retrieve_conversation_by_call_sid', async () => {
      const callSid = 'CA123456789';

      const created = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
        callSid,
      });

      const retrieved = await service.getByCallId(callSid);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.callSid).toBe(callSid);
    });

    it('should_return_null_when_call_sid_not_found', async () => {
      const result = await service.getByCallId('CA_NON_EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getByMessageId', () => {
    it('should_retrieve_conversation_by_message_sid', async () => {
      const messageSid = 'SM987654321';

      const created = await service.create({
        channel: 'sms',
        agentConfig: mockAgentSarah,
        messageSid,
      });

      const retrieved = await service.getByMessageId(messageSid);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.messageSid).toBe(messageSid);
    });

    it('should_return_null_when_message_sid_not_found', async () => {
      const result = await service.getByMessageId('SM_NON_EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('complete', () => {
    it('should_mark_conversation_as_completed', async () => {
      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      await service.complete(conversation.id);

      const updated = await service.get(conversation.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.endedAt).toBeInstanceOf(Date);
    });

    it('should_set_endedAt_timestamp', async () => {
      const conversation = await service.create({
        channel: 'email',
        agentConfig: mockAgentSarah,
      });

      const beforeTime = Date.now();
      await service.complete(conversation.id);
      const afterTime = Date.now();

      const updated = await service.get(conversation.id);
      const endTime = updated?.endedAt?.getTime();

      expect(endTime).toBeDefined();
      expect(endTime!).toBeGreaterThanOrEqual(beforeTime);
      expect(endTime!).toBeLessThanOrEqual(afterTime);
    });

    it('should_preserve_messages_when_completing', async () => {
      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      await service.addMessage(conversation.id, {
        role: 'user',
        content: 'Test',
      });

      await service.complete(conversation.id);

      const updated = await service.get(conversation.id);
      expect(updated?.messages).toHaveLength(1);
    });
  });

  describe('fail', () => {
    it('should_mark_conversation_as_failed', async () => {
      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
      });

      await service.fail(conversation.id);

      const updated = await service.get(conversation.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.endedAt).toBeInstanceOf(Date);
    });

    it('should_set_endedAt_timestamp_when_failed', async () => {
      const conversation = await service.create({
        channel: 'sms',
        agentConfig: mockAgentSarah,
      });

      await service.fail(conversation.id);

      const updated = await service.get(conversation.id);
      expect(updated?.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('conversation lifecycle', () => {
    it('should_handle_complete_conversation_lifecycle', async () => {
      // Create
      const conversation = await service.create({
        channel: 'call',
        agentConfig: mockAgentSarah,
        metadata: { leadId: 'lead_001' },
      });

      expect(conversation.status).toBe('active');

      // Add messages
      await service.addMessage(conversation.id, {
        role: 'user',
        content: 'I need help',
      });

      await service.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Happy to help!',
      });

      // Small delay before completion to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 2));

      // Complete
      await service.complete(conversation.id);

      // Verify final state
      const final = await service.get(conversation.id);
      expect(final?.status).toBe('completed');
      expect(final?.messages).toHaveLength(2);
      expect(final?.endedAt).toBeInstanceOf(Date);
      expect(final?.startedAt.getTime()).toBeLessThanOrEqual(final?.endedAt!.getTime());
    });
  });
});
