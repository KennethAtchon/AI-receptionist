/**
 * Call Service
 * Business logic for managing voice calls
 */

import { TwilioProvider } from '../providers/communication/twilio.provider';
import { ConversationService } from './conversation.service';
import { ToolExecutionService } from './tool-execution.service';
import { MakeCallOptions, CallSession, IAIProvider } from '../types';
import { logger } from '../utils/logger';

export class CallService {
  constructor(
    private twilioProvider: TwilioProvider,
    private aiProvider: IAIProvider,
    private conversationService: ConversationService,
    private toolExecutor: ToolExecutionService,
    private agentId: string,
    private webhookBaseUrl: string = 'http://localhost:3000'
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

    // 2. Get available tools for this channel
    const availableTools = this.toolExecutor.getToolsForChannel('call');
    logger.info(`[CallService] Available tools: ${availableTools.map(t => t.name).join(', ')}`);

    // 3. Make the call via Twilio provider
    const webhookUrl = `${this.webhookBaseUrl}/webhooks/calls/${conversation.id}`;
    const statusCallback = `${this.webhookBaseUrl}/webhooks/call-status/${conversation.id}`;

    const callSid = await this.twilioProvider.makeCall(options.to, {
      webhookUrl,
      statusCallback,
      aiConfig: {
        tools: availableTools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    });

    // 4. Update conversation with callSid
    await this.conversationService.get(conversation.id);
    // TODO: Update conversation with callSid via store

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
    logger.info(`[CallService] Handling speech for call ${callSid}: "${userSpeech}"`);

    // 1. Get conversation
    const conversation = await this.conversationService.getByCallId(callSid);
    if (!conversation) {
      throw new Error(`Conversation not found for call ${callSid}`);
    }

    // 2. Add user message to conversation
    await this.conversationService.addMessage(conversation.id, {
      role: 'user',
      content: userSpeech
    });

    // 3. Get AI response
    const history = await this.conversationService.getMessages(conversation.id);
    const agentHistory = history.map(m => ({
      role: m.role as any,
      content: m.content,
      timestamp: m.timestamp,
      toolCall: m.toolCall as any,
      toolResult: m.toolResult as any
    }));

    const aiResponse = await this.aiProvider.chat({
      conversationId: conversation.id,
      userMessage: userSpeech,
      conversationHistory: agentHistory,
      availableTools: this.toolExecutor.getToolsForChannel('call')
    });

    // 4. If AI wants to use tools, execute them
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      logger.info(`[CallService] AI requested ${aiResponse.toolCalls.length} tool calls`);

      for (const toolCall of aiResponse.toolCalls) {
        const toolResult = await this.toolExecutor.execute(
          toolCall.name,
          toolCall.parameters,
          {
            channel: 'call',
            conversationId: conversation.id,
            callSid,
            agentId: this.agentId
          }
        );

        // Add tool result to conversation
        await this.conversationService.addMessage(conversation.id, {
          role: 'tool',
          content: JSON.stringify(toolResult),
          toolResult
        });
      }

      // Get final AI response after tool execution
      const finalHistory = await this.conversationService.getMessages(conversation.id);
      const finalAgentHistory = finalHistory.map(m => ({
        role: m.role as any,
        content: m.content,
        timestamp: m.timestamp,
        toolCall: m.toolCall as any,
        toolResult: m.toolResult as any
      }));

      const finalResponse = await this.aiProvider.chat({
        conversationId: conversation.id,
        userMessage: '',
        conversationHistory: finalAgentHistory
      });

      // Add assistant response
      await this.conversationService.addMessage(conversation.id, {
        role: 'assistant',
        content: finalResponse.content
      });

      return finalResponse.content;
    }

    // No tool calls, just return AI response
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: aiResponse.content
    });

    return aiResponse.content;
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
  }
}
