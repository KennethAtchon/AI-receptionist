/**
 * Call Service  
 * High-level voice call operations using CallProcessor
 */

import type { CallProcessor } from '../processors/call.processor';
import { ConversationService } from './conversation.service';
import type { MakeCallOptions, CallSession } from '../types';
import { logger } from '../utils/logger';

/**
 * CallService
 * Delegates to CallProcessor for AI-driven call orchestration
 */
export class CallService {
  constructor(
    private conversationService: ConversationService,
    private callProcessor: CallProcessor
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

    // 2. Delegate to processor to make the call
    const result = await this.callProcessor.initiateCall({
      to: options.to,
      conversationId: conversation.id,
      greeting: 'Hello! How can I help you today?'
    });

    logger.info(`[CallService] Call initiated: ${result.callSid}`);

    return {
      id: result.callSid,
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

    // 3. Get conversation history
    const history = await this.conversationService.getMessages(conversation.id);

    // 4. Delegate to processor - handles all orchestration using AI
    const response = await this.callProcessor.processUserSpeech({
      callSid,
      userSpeech,
      conversationHistory: history,
      availableTools: [] // TODO: Get from tool registry
    });

    // 5. Add assistant response to conversation
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: response.content
    });

    // 6. Handle special actions
    if (response.action === 'end_call') {
      await this.endCall(callSid);
    }

    logger.info(`[CallService] Response generated for call ${callSid}`);

    return response.content;
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

    // Delegate to processor to end call via provider
    await this.callProcessor.endCall(callSid);
  }
}
