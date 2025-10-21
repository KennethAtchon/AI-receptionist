/**
 * Unit Tests - ConversationService (memory-centric)
 */

import { ConversationService } from '../conversation.service';
import type { Memory, MemorySearchQuery } from '../../agent/types';

class TestMemory {
  private memories: Memory[] = [];

  async startSession(session: { conversationId: string; channel: 'call' | 'sms' | 'email'; metadata?: Record<string, any> }): Promise<void> {
    this.memories.push({
      id: `session-start-${session.conversationId}`,
      content: `Started ${session.channel} conversation`,
      timestamp: new Date(),
      type: 'system',
      importance: 5,
      channel: session.channel,
      sessionMetadata: { conversationId: session.conversationId, status: 'active' },
      metadata: session.metadata || {},
    } as Memory);
  }

  async store(memory: Memory): Promise<void> {
    this.memories.push(memory);
  }

  async getConversationHistory(conversationId: string): Promise<Memory[]> {
    return this.memories
      .filter(m => m.sessionMetadata?.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async search(query: MemorySearchQuery): Promise<Memory[]> {
    let results = [...this.memories];
    if (query.conversationId) {
      results = results.filter(m => m.sessionMetadata?.conversationId === query.conversationId);
    }
    if (query.channel) {
      results = results.filter(m => m.channel === query.channel);
    }
    if (query.startDate) {
      results = results.filter(m => m.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter(m => m.timestamp <= query.endDate!);
    }
    if (query.minImportance !== undefined) {
      results = results.filter(m => (m.importance ?? 0) >= query.minImportance!);
    }
    if (query.orderBy === 'timestamp') {
      results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (query.orderDirection === 'desc') results.reverse();
    }
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }
    return results;
  }

  async endSession(conversationId: string, summary?: string): Promise<void> {
    const first = this.memories.find(m => m.sessionMetadata?.conversationId === conversationId);
    this.memories.push({
      id: `session-end-${conversationId}`,
      content: summary || 'Conversation ended',
      timestamp: new Date(),
      type: 'system',
      importance: 7,
      channel: first?.channel,
      sessionMetadata: { conversationId, status: 'completed' },
    } as Memory);
  }

  getAll(): Memory[] { return this.memories; }
}

describe('ConversationService', () => {
  let service: ConversationService;
  let memory: TestMemory;

  beforeEach(() => {
    memory = new TestMemory();
    const agent = { getMemory: () => memory } as any;
    service = new ConversationService();
    service.setAgent(agent);
  });

  describe('create', () => {
    it('creates a new conversation and starts a session', async () => {
      const conversation = await service.create({ channel: 'call', metadata: { leadId: 'lead_123' } });

      expect(conversation).toBeDefined();
      expect(conversation.id).toMatch(/^conv_/);
      expect(conversation.channel).toBe('call');
      expect(conversation.status).toBe('active');
      expect(conversation.messages).toEqual([]);
      expect(conversation.startedAt).toBeInstanceOf(Date);

      expect(memory.getAll().length).toBeGreaterThanOrEqual(1);
    });

    it('attaches callSid and messageSid when provided', async () => {
      const callSid = 'CA123456789';
      const messageSid = 'SM987654321';
      const conversation = await service.create({ channel: 'sms', callSid, messageSid });

      expect(conversation.callSid).toBe(callSid);
      expect(conversation.messageSid).toBe(messageSid);

      const foundByCall = await service.getByCallId(callSid);
      expect(foundByCall?.id).toBe(conversation.id);

      const foundByMsg = await service.getByMessageId(messageSid);
      expect(foundByMsg?.id).toBe(conversation.id);
    });
  });

  describe('messages', () => {
    it('adds and retrieves messages for a conversation', async () => {
      const conversation = await service.create({ channel: 'call' });
      await service.addMessage(conversation.id, { role: 'user', content: 'Hello, I need help' });

      const messages = await service.getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello, I need help');
      expect(messages[0].role).toBe('user');
    });
  });

  describe('get', () => {
    it('retrieves conversation by id', async () => {
      const created = await service.create({ channel: 'call' });
      await service.addMessage(created.id, { role: 'assistant', content: 'How can I help you?' });

      const retrieved = await service.get(created.id);
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.messages.length).toBe(1);
    });

    it('returns null when conversation not found', async () => {
      const result = await service.get('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('complete and fail', () => {
    it('marks conversation as completed', async () => {
      const conversation = await service.create({ channel: 'call' });
      await service.complete(conversation.id);
      const updated = await service.get(conversation.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.endedAt).toBeInstanceOf(Date);
    });

    it('marks conversation as failed', async () => {
      const conversation = await service.create({ channel: 'sms' });
      await service.fail(conversation.id);
      const updated = await service.get(conversation.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('lifecycle', () => {
    it('handles a complete conversation lifecycle', async () => {
      const conversation = await service.create({ channel: 'call', metadata: { leadId: 'lead_001' } });

      await service.addMessage(conversation.id, { role: 'user', content: 'I need help' });
      await service.addMessage(conversation.id, { role: 'assistant', content: 'Happy to help!' });

      await service.complete(conversation.id);
      const final = await service.get(conversation.id);
      expect(final?.status).toBe('completed');
      expect(final?.messages).toHaveLength(2);
      expect(final?.endedAt).toBeInstanceOf(Date);
      expect(final?.startedAt.getTime()).toBeLessThanOrEqual(final?.endedAt!.getTime());
    });
  });
});
