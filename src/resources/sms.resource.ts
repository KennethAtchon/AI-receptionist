/**
 * SMS Resource
 * User-facing API for SMS operations with webhook support
 */

import { BaseResource, ResourceSession, WebhookContext } from './base.resource';
import type { Agent } from '../agent/core/Agent';
import { logger } from '../utils/logger';

export interface SMSSession extends ResourceSession {
  messageSid?: string;
  to: string;
  from?: string;
  direction: 'inbound' | 'outbound';
}

export interface SendSMSOptions {
  to: string;
  body: string;
  metadata?: Record<string, any>;
}

export class SMSResource extends BaseResource<SMSSession> {
  constructor(agent: Agent) {
    super(agent, 'sms');
  }

  /**
   * Send an SMS
   * Uses Agent → send_sms tool → Twilio provider
   */
  async send(options: SendSMSOptions): Promise<SMSSession> {
    logger.info(`[SMSResource] Sending SMS to ${options.to}`);

    const conversationId = await this.createSession(options.metadata);

    const agentResponse = await this.processWithAgent(
      `Send SMS to ${options.to}: ${options.body}`,
      {
        conversationId,
        toolHint: 'send_sms',
        toolParams: {
          to: options.to,
          message: options.body
        }
      }
    );

    const messageSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageSid;

    return {
      id: messageSid || `sms-${Date.now()}`,
      messageSid,
      conversationId,
      to: options.to,
      channel: 'sms',
      direction: 'outbound',
      status: 'completed',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   */
  async handleWebhook(context: WebhookContext): Promise<any> {
    logger.info('[SMSResource] Handling inbound SMS webhook');

    const { MessageSid, From, To, Body } = context.payload;

    // Find or create conversation
    let conversationId = await this.findConversationByParticipants(From, To);
    if (!conversationId) {
      conversationId = await this.createSession({
        messageSid: MessageSid,
        from: From,
        to: To,
        direction: 'inbound'
      });
    }

    // Store incoming SMS
    await this.agent.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: Body,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'sms',
      role: 'user',
      sessionMetadata: {
        conversationId,
        messageSid: MessageSid,
        from: From,
        to: To
      }
    });

    // Use Agent to compose reply
    const agentResponse = await this.processWithAgent(Body, {
      conversationId,
      messageSid: MessageSid,
      from: From,
      to: To
    });

    // Return TwiML response
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${agentResponse.content}</Message>
</Response>`;
  }

  private async findConversationByParticipants(from: string, to: string): Promise<string | null> {
    // Search for SMS conversations and filter by participants
    const memory = await this.agent.getMemory().search({
      channel: 'sms',
      limit: 50 // Get more results to filter through
    });

    // Filter by participants
    const match = memory.find(m => 
      m.sessionMetadata?.from === from && 
      m.sessionMetadata?.to === to
    );

    return match?.sessionMetadata?.conversationId || null;
  }
}
