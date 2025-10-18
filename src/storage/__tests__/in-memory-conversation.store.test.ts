/**
 * Unit Tests - InMemoryConversationStore
 */

import { InMemoryConversationStore } from '../in-memory-conversation.store';
import { Conversation } from '../../types';
import {
  mockConversationCall,
  mockConversationSMS,
  mockConversationCompleted,
  mockConversationFailed,
} from '../../__tests__/fixtures';

describe('InMemoryConversationStore', () => {
  let store: InMemoryConversationStore;

  beforeEach(() => {
    store = new InMemoryConversationStore();
  });

  describe('constructor', () => {
    it('should_create_empty_store', () => {
      expect(store.count()).toBe(0);
    });
  });

  describe('save', () => {
    it('should_save_conversation_successfully', async () => {
      await store.save(mockConversationCall);

      expect(store.count()).toBe(1);
      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockConversationCall.id);
    });

    it('should_save_multiple_conversations', async () => {
      await store.save(mockConversationCall);
      await store.save(mockConversationSMS);
      await store.save(mockConversationCompleted);

      expect(store.count()).toBe(3);
    });

    it('should_update_conversation_when_saved_again', async () => {
      await store.save(mockConversationCall);

      const updated: Conversation = {
        ...mockConversationCall,
        status: 'completed',
      };

      await store.save(updated);

      expect(store.count()).toBe(1);
      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved?.status).toBe('completed');
    });

    it('should_index_by_callSid_when_present', async () => {
      await store.save(mockConversationCall);

      const retrieved = await store.getByCallId(mockConversationCall.callSid!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockConversationCall.id);
    });

    it('should_index_by_messageSid_when_present', async () => {
      await store.save(mockConversationSMS);

      const retrieved = await store.getByMessageId(mockConversationSMS.messageSid!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockConversationSMS.id);
    });

    it('should_handle_conversation_without_callSid', async () => {
      const emailConversation: Conversation = {
        id: 'conv_email_123',
        channel: 'email',
        messages: [],
        status: 'active',
        startedAt: new Date(),
      };

      await store.save(emailConversation);

      expect(store.count()).toBe(1);
      const retrieved = await store.get('conv_email_123');
      expect(retrieved).toBeDefined();
    });

    it('should_preserve_all_conversation_properties', async () => {
      await store.save(mockConversationCall);

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved?.channel).toBe(mockConversationCall.channel);
      expect(retrieved?.messages).toEqual(mockConversationCall.messages);
      expect(retrieved?.metadata).toEqual(mockConversationCall.metadata);
      expect(retrieved?.status).toBe(mockConversationCall.status);
      expect(retrieved?.callSid).toBe(mockConversationCall.callSid);
    });
  });

  describe('get', () => {
    it('should_retrieve_saved_conversation', async () => {
      await store.save(mockConversationCall);

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockConversationCall.id);
    });

    it('should_return_null_for_non_existent_conversation', async () => {
      const retrieved = await store.get('non_existent_id');
      expect(retrieved).toBeNull();
    });

    it('should_return_complete_conversation_object', async () => {
      await store.save(mockConversationCall);

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved).toEqual(mockConversationCall);
    });
  });

  describe('getByCallId', () => {
    it('should_retrieve_conversation_by_callSid', async () => {
      await store.save(mockConversationCall);

      const retrieved = await store.getByCallId(mockConversationCall.callSid!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockConversationCall.id);
    });

    it('should_return_null_for_non_existent_callSid', async () => {
      const retrieved = await store.getByCallId('CA_NON_EXISTENT');
      expect(retrieved).toBeNull();
    });

    it('should_update_index_when_conversation_updated', async () => {
      await store.save(mockConversationCall);

      const updated: Conversation = {
        ...mockConversationCall,
        status: 'completed',
      };

      await store.save(updated);

      const retrieved = await store.getByCallId(mockConversationCall.callSid!);
      expect(retrieved?.status).toBe('completed');
    });
  });

  describe('getByMessageId', () => {
    it('should_retrieve_conversation_by_messageSid', async () => {
      await store.save(mockConversationSMS);

      const retrieved = await store.getByMessageId(mockConversationSMS.messageSid!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockConversationSMS.id);
    });

    it('should_return_null_for_non_existent_messageSid', async () => {
      const retrieved = await store.getByMessageId('SM_NON_EXISTENT');
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('should_update_conversation_fields', async () => {
      await store.save(mockConversationCall);

      await store.update(mockConversationCall.id, {
        status: 'completed',
        endedAt: new Date(),
      });

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved?.status).toBe('completed');
      expect(retrieved?.endedAt).toBeInstanceOf(Date);
    });

    it('should_preserve_unchanged_fields', async () => {
      await store.save(mockConversationCall);

      await store.update(mockConversationCall.id, {
        status: 'completed',
      });

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved?.channel).toBe(mockConversationCall.channel);
      expect(retrieved?.callSid).toBe(mockConversationCall.callSid);
      expect(retrieved?.messages).toEqual(mockConversationCall.messages);
    });

    it('should_throw_error_when_updating_non_existent_conversation', async () => {
      await expect(
        store.update('non_existent_id', { status: 'completed' })
      ).rejects.toThrow('Conversation non_existent_id not found');
    });

    it('should_allow_updating_messages', async () => {
      await store.save(mockConversationCall);

      const newMessages = [
        ...mockConversationCall.messages,
        {
          role: 'user' as const,
          content: 'New message',
          timestamp: new Date(),
        },
      ];

      await store.update(mockConversationCall.id, {
        messages: newMessages,
      });

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved?.messages).toHaveLength(newMessages.length);
    });

    it('should_allow_updating_metadata', async () => {
      await store.save(mockConversationCall);

      const newMetadata = {
        ...mockConversationCall.metadata,
        updatedField: 'new value',
      };

      await store.update(mockConversationCall.id, {
        metadata: newMetadata,
      });

      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved?.metadata?.updatedField).toBe('new value');
    });
  });

  describe('delete', () => {
    it('should_delete_conversation', async () => {
      await store.save(mockConversationCall);
      expect(store.count()).toBe(1);

      await store.delete(mockConversationCall.id);

      expect(store.count()).toBe(0);
      const retrieved = await store.get(mockConversationCall.id);
      expect(retrieved).toBeNull();
    });

    it('should_remove_callSid_index_when_deleting', async () => {
      await store.save(mockConversationCall);

      await store.delete(mockConversationCall.id);

      const retrieved = await store.getByCallId(mockConversationCall.callSid!);
      expect(retrieved).toBeNull();
    });

    it('should_remove_messageSid_index_when_deleting', async () => {
      await store.save(mockConversationSMS);

      await store.delete(mockConversationSMS.id);

      const retrieved = await store.getByMessageId(mockConversationSMS.messageSid!);
      expect(retrieved).toBeNull();
    });

    it('should_handle_deleting_non_existent_conversation_gracefully', async () => {
      await expect(
        store.delete('non_existent_id')
      ).resolves.not.toThrow();
    });

    it('should_not_affect_other_conversations_when_deleting', async () => {
      await store.save(mockConversationCall);
      await store.save(mockConversationSMS);

      await store.delete(mockConversationCall.id);

      expect(store.count()).toBe(1);
      const retrieved = await store.get(mockConversationSMS.id);
      expect(retrieved).toBeDefined();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await store.save(mockConversationCall);
      await store.save(mockConversationSMS);
      await store.save(mockConversationCompleted);
      await store.save(mockConversationFailed);
    });

    it('should_return_all_conversations_when_no_filters', async () => {
      const conversations = await store.list();

      expect(conversations).toHaveLength(4);
    });

    it('should_filter_by_channel', async () => {
      const callConversations = await store.list({ channel: 'call' });

      expect(callConversations.length).toBeGreaterThan(0);
      callConversations.forEach(conv => {
        expect(conv.channel).toBe('call');
      });
    });

    it('should_filter_by_status', async () => {
      const activeConversations = await store.list({ status: 'active' });

      activeConversations.forEach(conv => {
        expect(conv.status).toBe('active');
      });
    });

    it('should_filter_by_startDate', async () => {
      const startDate = new Date('2025-01-15T09:30:00Z');
      const conversations = await store.list({ startDate });

      conversations.forEach(conv => {
        expect(conv.startedAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      });
    });

    it('should_filter_by_endDate', async () => {
      const endDate = new Date('2025-01-15T10:30:00Z');
      const conversations = await store.list({ endDate });

      conversations.forEach(conv => {
        expect(conv.startedAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should_apply_limit', async () => {
      const conversations = await store.list({ limit: 2 });

      expect(conversations).toHaveLength(2);
    });

    it('should_combine_multiple_filters', async () => {
      const conversations = await store.list({
        channel: 'call',
        status: 'active',
        limit: 1,
      });

      expect(conversations.length).toBeLessThanOrEqual(1);
      if (conversations.length > 0) {
        expect(conversations[0].channel).toBe('call');
        expect(conversations[0].status).toBe('active');
      }
    });

    it('should_return_empty_array_when_no_matches', async () => {
      const conversations = await store.list({
        channel: 'call',
        status: 'active',
        startDate: new Date('2030-01-01'),
      });

      expect(conversations).toEqual([]);
    });

    it('should_return_references_to_stored_conversations', async () => {
      const conversations = await store.list();
      const firstId = conversations[0].id;

      // Note: This test documents current behavior - list() returns references
      // Modifying the returned object affects the stored version
      conversations[0].status = 'failed';

      // Get the conversation - it will reflect the change
      const stored = await store.get(firstId);
      expect(stored?.status).toBe('failed');

      // This is a known limitation - consider returning deep copies in production
    });
  });

  describe('count', () => {
    it('should_return_zero_for_empty_store', () => {
      expect(store.count()).toBe(0);
    });

    it('should_return_correct_count_after_saves', async () => {
      await store.save(mockConversationCall);
      expect(store.count()).toBe(1);

      await store.save(mockConversationSMS);
      expect(store.count()).toBe(2);
    });

    it('should_update_count_after_deletion', async () => {
      await store.save(mockConversationCall);
      await store.save(mockConversationSMS);
      expect(store.count()).toBe(2);

      await store.delete(mockConversationCall.id);
      expect(store.count()).toBe(1);
    });

    it('should_not_increase_count_when_updating', async () => {
      await store.save(mockConversationCall);
      expect(store.count()).toBe(1);

      await store.save({ ...mockConversationCall, status: 'completed' });
      expect(store.count()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should_remove_all_conversations', async () => {
      await store.save(mockConversationCall);
      await store.save(mockConversationSMS);
      await store.save(mockConversationCompleted);

      expect(store.count()).toBe(3);

      store.clear();

      expect(store.count()).toBe(0);
    });

    it('should_clear_all_indexes', async () => {
      await store.save(mockConversationCall);
      await store.save(mockConversationSMS);

      store.clear();

      const byCallId = await store.getByCallId(mockConversationCall.callSid!);
      const byMessageId = await store.getByMessageId(mockConversationSMS.messageSid!);

      expect(byCallId).toBeNull();
      expect(byMessageId).toBeNull();
    });

    it('should_handle_clearing_empty_store', () => {
      expect(() => store.clear()).not.toThrow();
      expect(store.count()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should_handle_conversation_with_same_callSid_and_messageSid', async () => {
      const conversation: Conversation = {
        id: 'conv_both_123',
        channel: 'call',
        messages: [],
        status: 'active',
        startedAt: new Date(),
        callSid: 'CA123',
        messageSid: 'SM123',
      };

      await store.save(conversation);

      const byCallId = await store.getByCallId('CA123');
      const byMessageId = await store.getByMessageId('SM123');

      expect(byCallId?.id).toBe(conversation.id);
      expect(byMessageId?.id).toBe(conversation.id);
    });

    it('should_handle_large_number_of_conversations', async () => {
      const conversations: Conversation[] = [];

      for (let i = 0; i < 1000; i++) {
        conversations.push({
          id: `conv_${i}`,
          channel: 'call',
          messages: [],
          status: 'active',
          startedAt: new Date(),
        });
      }

      for (const conv of conversations) {
        await store.save(conv);
      }

      expect(store.count()).toBe(1000);

      const retrieved = await store.get('conv_500');
      expect(retrieved).toBeDefined();
    });

    it('should_handle_concurrent_saves', async () => {
      const conversations = [
        mockConversationCall,
        mockConversationSMS,
        mockConversationCompleted,
      ];

      await Promise.all(conversations.map(conv => store.save(conv)));

      expect(store.count()).toBe(3);
    });
  });
});
