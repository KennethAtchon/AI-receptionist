/**
 * Call Service  
 * High-level voice call operations using Agent
 */

import type { Agent } from '../agent/core/Agent';
import { ConversationService } from './conversation.service';
import type { MakeCallOptions, CallSession, AgentRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * CallService
 * Delegates to Agent for AI-driven call orchestration
 */
export class CallService {
  constructor(
    private conversationService: ConversationService,
    private agent: Agent
  ) {}

  /**
   * Initiate an outbound call
   */
  async initiateCall(options: MakeCallOptions): Promise<CallSession> {
    logger.info(`[CallService] Initiating call to ${options.to}`);

    // 1. Create conversation context
    const conversation = await this.conversationService.create({
      channel: 'call',
      metadata: options.metadata
    });

    // 2. Delegate to Agent to orchestrate the call initiation
    const agentRequest: AgentRequest = {
      id: `call-init-${Date.now()}`,
      input: `Initiate a call to ${options.to}. Say: "Hello! How can I help you today?"`,
      channel: 'call',
      context: {
        channel: 'call',
        conversationId: conversation.id,
        metadata: { ...options.metadata, action: 'initiate_call', to: options.to }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);
    
    // Extract callSid from metadata (set by initiate_call tool)
    const callSid = agentResponse.metadata?.toolResults?.[0]?.data?.callSid || `CALL_${Date.now()}`;

    logger.info(`[CallService] Call initiated: ${callSid}`);

    return {
      id: callSid,
      conversationId: conversation.id,
      to: options.to,
      status: 'initiated',
      startedAt: new Date()
    };
  }

  /**
   * Handle incoming voice from user during call
   */
  async handleUserSpeech(callSid: string, userSpeech: string): Promise<string> {
    logger.info(`[CallService] Handling speech for call ${callSid}`);

    // 1. Get conversation context
    const conversation = await this.conversationService.getByCallId(callSid);
    if (!conversation) {
      throw new Error(`Conversation not found for call ${callSid}`);
    }

    // 2. Add user message to conversation
    await this.conversationService.addMessage(conversation.id, {
      role: 'user',
      content: userSpeech
    });

    // 3. Delegate to Agent - it handles all orchestration and tool calling
    const agentRequest: AgentRequest = {
      id: `call-speech-${Date.now()}`,
      input: userSpeech,
      channel: 'call',
      context: {
        channel: 'call',
        conversationId: conversation.id,
        callSid,
        metadata: { callSid }
      }
    };

    const agentResponse = await this.agent.process(agentRequest);

    // 4. Add assistant response to conversation
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: agentResponse.content
    });

    // 5. Check if agent used end_call tool
    const usedEndCall = agentResponse.metadata?.toolsUsed?.includes('end_call');
    if (usedEndCall) {
      await this.endCall(callSid);
    }

    logger.info(`[CallService] Response generated for call ${callSid}`);

    return agentResponse.content;
  }

  /**
   * End a call
   */
  async endCall(callSid: string): Promise<void> {
    logger.info(`[CallService] Ending call ${callSid}`);

    const conversation = await this.conversationService.getByCallId(callSid);
    if (conversation) {
      await this.conversationService.complete(conversation.id);
    }

    // Agent handles end_call via the end_call tool
    logger.info(`[CallService] Call ${callSid} marked as ended`);
  }
}
