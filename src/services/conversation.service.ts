/**
 * Conversation Service
 * Manages conversation state and history via the Agent Memory system
 */

import { Conversation, ConversationMessage } from '../types';
import { Agent } from '../agent/core/Agent';
import { logger } from '../utils/logger';

export interface CreateConversationOptions {
  channel: 'call' | 'sms' | 'email';
  metadata?: Record<string, any>;
  callSid?: string;
  messageSid?: string;
}

export class ConversationService {
  private agent?: Agent;

  constructor() {}

  setAgent(agent: Agent): void {
    this.agent = agent;
  }

  /**
   * Create a new conversation
   */
  async create(options: CreateConversationOptions): Promise<Conversation> {
    this.ensureAgent();
    const conversationId = this.generateId();

    await this.agent!.getMemory().startSession({
      conversationId,
      channel: options.channel,
      metadata: options.metadata
    });

    if (options.callSid) {
      await this.attachCallSid(conversationId, options.callSid);
    }
    if (options.messageSid) {
      await this.attachMessageSid(conversationId, options.messageSid);
    }

    logger.info(`[ConversationService] Created conversation: ${conversationId} on channel: ${options.channel}`);

    return {
      id: conversationId,
      channel: options.channel,
      messages: [],
      metadata: options.metadata,
      status: 'active',
      startedAt: new Date(),
      callSid: options.callSid,
      messageSid: options.messageSid
    };
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'timestamp'>
  ): Promise<void> {
    this.ensureAgent();

    const channel = await this.getChannelForConversation(conversationId);

    await this.agent!.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: message.content,
      timestamp: new Date(),
      type: 'conversation',
      channel,
      role: message.role,
      toolCall: (message as any).toolCall,
      toolResult: (message as any).toolResult,
      sessionMetadata: { conversationId }
    });

    logger.info(`[ConversationService] Added message to ${conversationId}: ${message.role}`);
  }

  /**
   * Get conversation by ID
   */
  async get(conversationId: string): Promise<Conversation | null> {
    this.ensureAgent();
    const history = await this.agent!.getMemory().getConversationHistory(conversationId);
    if (!history || history.length === 0) return null;
    const first = history[0];
    const last = history[history.length - 1];
    const channel = first.channel as any || 'call';
    const status = last.sessionMetadata?.status || 'active';
    return {
      id: conversationId,
      channel,
      messages: await this.getMessages(conversationId),
      metadata: first.metadata as any,
      status: status as any,
      startedAt: first.timestamp,
      endedAt: status !== 'active' ? last.timestamp : undefined,
      callSid: first.sessionMetadata?.callSid,
      messageSid: first.sessionMetadata?.messageSid
    };
  }

  /**
   * Get conversation by call SID
   */
  async getByCallId(callSid: string): Promise<Conversation | null> {
    this.ensureAgent();
    const results = await this.agent!.getMemory().search({
      keywords: [],
      limit: 1,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });
    const match = results.find(m => m.sessionMetadata?.callSid === callSid);
    return match ? this.get(match.sessionMetadata!.conversationId!) : null;
  }

  /**
   * Get conversation by message SID
   */
  async getByMessageId(messageSid: string): Promise<Conversation | null> {
    this.ensureAgent();
    const results = await this.agent!.getMemory().search({
      keywords: [],
      limit: 1,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });
    const match = results.find(m => m.sessionMetadata?.messageSid === messageSid);
    return match ? this.get(match.sessionMetadata!.conversationId!) : null;
  }

  /**
   * Mark conversation as completed
   */
  async complete(conversationId: string): Promise<void> {
    this.ensureAgent();
    await this.agent!.getMemory().endSession(conversationId, 'Conversation completed');
    logger.info(`[ConversationService] Completed conversation: ${conversationId}`);
  }

  /**
   * Mark conversation as failed
   */
  async fail(conversationId: string): Promise<void> {
    this.ensureAgent();
    await this.agent!.getMemory().store({
      id: `session-failed-${conversationId}`,
      content: 'Conversation failed',
      timestamp: new Date(),
      type: 'system',
      sessionMetadata: { conversationId, status: 'failed' },
      importance: 7
    });
    logger.info(`[ConversationService] Failed conversation: ${conversationId}`);
  }

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    this.ensureAgent();
    const history = await this.agent!.getMemory().getConversationHistory(conversationId);
    return history.map(m => ({
      role: (m.role as any) || 'assistant',
      content: m.content,
      timestamp: m.timestamp,
      toolCall: m.toolCall as any,
      toolResult: m.toolResult as any
    }));
  }

  async attachCallSid(conversationId: string, callSid: string): Promise<void> {
    this.ensureAgent();
    const channel = await this.getChannelForConversation(conversationId);
    await this.agent!.getMemory().store({
      id: `session-call-${conversationId}`,
      content: 'Attached call SID',
      timestamp: new Date(),
      type: 'system',
      channel,
      sessionMetadata: { conversationId, callSid }
    });
  }

  async attachMessageSid(conversationId: string, messageSid: string): Promise<void> {
    this.ensureAgent();
    const channel = await this.getChannelForConversation(conversationId);
    await this.agent!.getMemory().store({
      id: `session-message-${conversationId}`,
      content: 'Attached message SID',
      timestamp: new Date(),
      type: 'system',
      channel,
      sessionMetadata: { conversationId, messageSid }
    });
  }

  private async getChannelForConversation(conversationId: string): Promise<'call' | 'sms' | 'email'> {
    const history = await this.agent!.getMemory().getConversationHistory(conversationId);
    if (history.length === 0) return 'call';
    return (history[0].channel as any) || 'call';
  }

  private ensureAgent(): void {
    if (!this.agent) {
      throw new Error('ConversationService not initialized with Agent. Call setAgent(agent).');
    }
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
