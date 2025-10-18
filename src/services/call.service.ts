/**
 * Call Service
 * Business logic for managing voice calls
 */

import { TwilioProvider } from '../providers/communication/twilio.provider';
import { ConversationService } from './conversation.service';
import { ToolExecutionService } from './tool-execution.service';
import { MakeCallOptions, CallSession, AgentConfig, IAIProvider } from '../types';

export class CallService {
  constructor(
    private twilioProvider: TwilioProvider,
    private aiProvider: IAIProvider,
    private conversationService: ConversationService,
    private toolExecutor: ToolExecutionService,
    private agentConfig: AgentConfig,
    private webhookBaseUrl: string = 'http://localhost:3000'
  ) {}

  /**
   * Initiate an outbound call
   */
  async initiateCall(options: MakeCallOptions): Promise<CallSession> {
    console.log(`[CallService] Initiating call to ${options.to}`);

    // 1. Create conversation context
    const conversation = await this.conversationService.create({
      channel: 'call',
      agentConfig: this.agentConfig,
      metadata: options.metadata
    });

    // 2. Get available tools for this channel
    const availableTools = this.toolExecutor.getToolsForChannel('call');
    console.log(`[CallService] Available tools: ${availableTools.map(t => t.name).join(', ')}`);

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

    console.log(`[CallService] Call initiated: ${callSid}`);

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
    console.log(`[CallService] Handling speech for call ${callSid}: "${userSpeech}"`);

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
    const aiResponse = await this.aiProvider.chat({
      conversationId: conversation.id,
      userMessage: userSpeech,
      conversationHistory: conversation.messages,
      availableTools: this.toolExecutor.getToolsForChannel('call')
    });

    // 4. If AI wants to use tools, execute them
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      console.log(`[CallService] AI requested ${aiResponse.toolCalls.length} tool calls`);

      for (const toolCall of aiResponse.toolCalls) {
        const toolResult = await this.toolExecutor.execute(
          toolCall.name,
          toolCall.parameters,
          {
            channel: 'call',
            conversationId: conversation.id,
            callSid,
            agent: this.agentConfig
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
      const finalResponse = await this.aiProvider.chat({
        conversationId: conversation.id,
        userMessage: '',
        conversationHistory: conversation.messages
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
    console.log(`[CallService] Ending call ${callSid}`);

    const conversation = await this.conversationService.getByCallId(callSid);
    if (conversation) {
      await this.conversationService.complete(conversation.id);
    }
  }
}
