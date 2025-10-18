/**
 * Conversation Service
 * Manages conversation state and history
 */

import { IConversationStore, Conversation, ConversationMessage, AgentConfig } from '../types';
import { InMemoryConversationStore } from '../storage/in-memory-conversation.store';

export interface CreateConversationOptions {
  channel: 'call' | 'sms' | 'email';
  agentConfig: AgentConfig;
  metadata?: Record<string, any>;
  callSid?: string;
  messageSid?: string;
}

export class ConversationService {
  private store: IConversationStore;

  constructor(store?: IConversationStore) {
    this.store = store || new InMemoryConversationStore();
  }

  /**
   * Create a new conversation
   */
  async create(options: CreateConversationOptions): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.generateId(),
      channel: options.channel,
      messages: [],
      metadata: options.metadata,
      status: 'active',
      startedAt: new Date(),
      callSid: options.callSid,
      messageSid: options.messageSid
    };

    await this.store.save(conversation);

    console.log(`[ConversationService] Created conversation: ${conversation.id} on channel: ${options.channel}`);

    return conversation;
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'timestamp'>
  ): Promise<void> {
    const conversation = await this.store.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messageWithTimestamp: ConversationMessage = {
      ...message,
      timestamp: new Date()
    };

    conversation.messages.push(messageWithTimestamp);

    await this.store.update(conversationId, { messages: conversation.messages });

    console.log(`[ConversationService] Added message to ${conversationId}: ${message.role}`);
  }

  /**
   * Get conversation by ID
   */
  async get(conversationId: string): Promise<Conversation | null> {
    return this.store.get(conversationId);
  }

  /**
   * Get conversation by call SID
   */
  async getByCallId(callSid: string): Promise<Conversation | null> {
    return this.store.getByCallId(callSid);
  }

  /**
   * Get conversation by message SID
   */
  async getByMessageId(messageSid: string): Promise<Conversation | null> {
    return this.store.getByMessageId(messageSid);
  }

  /**
   * Mark conversation as completed
   */
  async complete(conversationId: string): Promise<void> {
    await this.store.update(conversationId, {
      status: 'completed',
      endedAt: new Date()
    });

    console.log(`[ConversationService] Completed conversation: ${conversationId}`);
  }

  /**
   * Mark conversation as failed
   */
  async fail(conversationId: string): Promise<void> {
    await this.store.update(conversationId, {
      status: 'failed',
      endedAt: new Date()
    });

    console.log(`[ConversationService] Failed conversation: ${conversationId}`);
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
