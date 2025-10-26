/**
 * Voice Resource (formerly CallsResource)
 * User-facing API for voice call operations with webhook support
 */

import { BaseResource, ResourceSession, WebhookContext } from '../base.resource';
import type { Agent } from '../../agent/core/Agent';
import { logger } from '../../utils/logger';

export interface VoiceSession extends ResourceSession {
  callSid: string;
  to: string;
  from?: string;
  direction: 'inbound' | 'outbound';
}

export interface MakeCallOptions {
  to: string;
  greeting?: string;
  metadata?: Record<string, any>;
}

export class VoiceResource extends BaseResource<VoiceSession> {
  constructor(agent: Agent) {
    super(agent, 'call');
  }

  /**
   * Make an outbound call
   * Uses Agent → initiate_call tool → Twilio provider
   */
  async make(options: MakeCallOptions): Promise<VoiceSession> {
    logger.info(`[VoiceResource] Initiating call to ${options.to}`);

    // Create conversation session
    const conversationId = await this.createSession(options.metadata);

    // Use Agent to make the call via tools
    const agentResponse = await this.processWithAgent(
      `Make a call to ${options.to} with greeting: ${options.greeting || 'Hello!'}`,
      {
        conversationId,
        toolHint: 'initiate_call', // Hint which tool to use
        toolParams: {
          to: options.to,
          greeting: options.greeting,
          webhookUrl: `${process.env.BASE_URL || 'https://your-app.com'}/webhooks/voice/inbound`
        }
      }
    );

    // Extract call SID from tool result
    const callSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.callSid;

    return {
      id: callSid,
      callSid,
      conversationId,
      to: options.to,
      channel: 'call',
      direction: 'outbound',
      status: 'active',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming call webhook (Twilio)
   */
  async handleWebhook(context: WebhookContext): Promise<any> {
    logger.info('[VoiceResource] Handling inbound call webhook');

    const { CallSid, From, To, CallStatus } = context.payload;

    // Create or retrieve conversation
    let conversationId = await this.findConversationByCallSid(CallSid);
    if (!conversationId) {
      conversationId = await this.createSession({
        callSid: CallSid,
        from: From,
        to: To,
        direction: 'inbound'
      });
    }

    // Use Agent to handle the call
    const agentResponse = await this.processWithAgent(
      'Handle incoming call', // Agent will generate appropriate response
      {
        conversationId,
        callSid: CallSid,
        from: From,
        to: To,
        callStatus: CallStatus
      }
    );

    // Return TwiML for Twilio
    return this.generateTwiML(agentResponse.content);
  }

  /**
   * Continue an active call conversation
   * This maintains the session while AI uses tools in the background
   */
  async handleConversation(callSid: string, userSpeech: string): Promise<string> {
    const conversationId = await this.findConversationByCallSid(callSid);
    if (!conversationId) {
      throw new Error(`No conversation found for call ${callSid}`);
    }

    // Agent processes speech and can use tools (send email, SMS, etc.)
    const agentResponse = await this.processWithAgent(userSpeech, {
      conversationId,
      callSid
    });

    return agentResponse.content; // Return text for TTS
  }

  /**
   * End an active call
   */
  async end(callSid: string): Promise<void> {
    logger.info(`[VoiceResource] Ending call ${callSid}`);

    const conversationId = await this.findConversationByCallSid(callSid);
    if (conversationId) {
      await this.endSession(conversationId);
    }

    // Use Agent to end the call via tools
    await this.processWithAgent(
      `End call ${callSid}`,
      {
        conversationId,
        toolHint: 'end_call',
        toolParams: { callSid }
      }
    );
  }

  private async findConversationByCallSid(callSid: string): Promise<string | null> {
    // Use the specific method for finding conversation by call SID
    const memory = await this.agent.getMemory().getConversationByCallId(callSid);
    return memory?.sessionMetadata?.conversationId || null;
  }

  private generateTwiML(response: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${response}</Say>
  <Gather input="speech" action="/webhooks/voice/continue" method="POST">
    <Say>You can continue speaking...</Say>
  </Gather>
</Response>`;
  }
}
