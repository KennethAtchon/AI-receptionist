/**
 * In-Memory Conversation Store (Default)
 * Stores conversation history in memory (lost on restart)
 */

import { IConversationStore, Conversation, ConversationFilters } from '../types';

export class InMemoryConversationStore implements IConversationStore {
  private conversations = new Map<string, Conversation>();
  private callIdIndex = new Map<string, string>(); // callSid -> conversationId
  private messageIdIndex = new Map<string, string>(); // messageSid -> conversationId

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);

    // Update indexes
    if (conversation.callSid) {
      this.callIdIndex.set(conversation.callSid, conversation.id);
    }
    if (conversation.messageSid) {
      this.messageIdIndex.set(conversation.messageSid, conversation.id);
    }

    console.log(`[InMemoryStore] Saved conversation: ${conversation.id}`);
  }

  async get(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async getByCallId(callSid: string): Promise<Conversation | null> {
    const conversationId = this.callIdIndex.get(callSid);
    if (!conversationId) return null;
    return this.get(conversationId);
  }

  async getByMessageId(messageSid: string): Promise<Conversation | null> {
    const conversationId = this.messageIdIndex.get(messageSid);
    if (!conversationId) return null;
    return this.get(conversationId);
  }

  async update(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const updated = { ...conversation, ...updates };
    await this.save(updated);
  }

  async delete(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      // Clean up indexes
      if (conversation.callSid) {
        this.callIdIndex.delete(conversation.callSid);
      }
      if (conversation.messageSid) {
        this.messageIdIndex.delete(conversation.messageSid);
      }
    }

    this.conversations.delete(conversationId);
    console.log(`[InMemoryStore] Deleted conversation: ${conversationId}`);
  }

  async list(filters?: ConversationFilters): Promise<Conversation[]> {
    let conversations = Array.from(this.conversations.values());

    if (!filters) {
      return conversations;
    }

    // Apply filters
    if (filters.channel) {
      conversations = conversations.filter(c => c.channel === filters.channel);
    }

    if (filters.status) {
      conversations = conversations.filter(c => c.status === filters.status);
    }

    if (filters.startDate) {
      conversations = conversations.filter(c => c.startedAt >= filters.startDate!);
    }

    if (filters.endDate) {
      conversations = conversations.filter(c => c.startedAt <= filters.endDate!);
    }

    // Apply limit
    if (filters.limit) {
      conversations = conversations.slice(0, filters.limit);
    }

    return conversations;
  }

  /**
   * Get total count of conversations
   */
  count(): number {
    return this.conversations.size;
  }

  /**
   * Clear all conversations (useful for testing)
   */
  clear(): void {
    this.conversations.clear();
    this.callIdIndex.clear();
    this.messageIdIndex.clear();
    console.log('[InMemoryStore] Cleared all conversations');
  }
}
