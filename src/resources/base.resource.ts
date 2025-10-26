/**
 * Base Resource Interface
 * Provides common functionality for all communication channel resources
 */

import type { Agent } from '../agent/core/Agent';
import type { Channel } from '../types';

export interface ResourceSession {
  id: string;
  conversationId: string;
  channel: Channel;
  status: 'active' | 'inactive' | 'completed';
  startedAt: Date;
  metadata?: Record<string, any>;
}

export interface WebhookContext {
  provider: string;
  payload: any;
  signature?: string;
  timestamp?: Date;
}

export abstract class BaseResource<TSession extends ResourceSession> {
  constructor(
    protected agent: Agent,
    protected channel: Channel
  ) {}

  /**
   * All resources use Agent.process() for actions
   */
  protected async processWithAgent(input: string, context: any): Promise<any> {
    return await this.agent.process({
      id: `${this.channel}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      input,
      channel: this.channel,
      context
    });
  }

  /**
   * Create a new session
   */
  protected async createSession(metadata?: Record<string, any>): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.agent.getMemory().startSession({
      conversationId,
      channel: this.channel,
      metadata
    });

    return conversationId;
  }

  /**
   * End a session
   */
  protected async endSession(conversationId: string): Promise<void> {
    await this.agent.getMemory().endSession(conversationId);
  }

  /**
   * Handle incoming webhook (to be implemented by each resource)
   */
  abstract handleWebhook(context: WebhookContext): Promise<any>;
}
