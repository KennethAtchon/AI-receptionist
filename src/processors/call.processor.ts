/**
 * Call Processor
 * DEPRECATED: AI orchestration now handled by Agent + Tools.
 * This processor remains for backward compatibility but no longer performs AI orchestration.
 * Use call-tools.ts instead.
 */

import { BaseProcessor } from './base.processor';
import type { TwilioProvider } from '../providers/core/twilio.provider';
import type { ToolExecutionService } from '../services/tool-execution.service';
import type { IAIProvider, ToolResult } from '../types';
import type { 
  ProcessorResponse, 
  ProcessUserSpeechParams,
  InitiateCallParams 
} from './processor.types';
import { logger } from '../utils/logger';

/**
 * CallProcessor
 * Uses AI to orchestrate voice call interactions
 */
export class CallProcessor extends BaseProcessor {
  readonly name = 'call';
  readonly type = 'call' as const;

  private twilioClient: any = null;

  constructor(
    aiProvider: IAIProvider,
    private twilioProvider: TwilioProvider,
    private toolExecutor: ToolExecutionService
  ) {
    super(aiProvider);
  }

  /**
   * Initialize Twilio client using the provider
   */
  private ensureTwilioClient(): any {
    if (!this.twilioClient) {
      this.twilioClient = this.twilioProvider.createClient();
      this.logger.info('[CallProcessor] Twilio client created');
    }
    return this.twilioClient;
  }

  /**
   * Initiate an outbound call
   */
  async initiateCall(params: InitiateCallParams): Promise<{ callSid: string }> {
    this.logger.info('[CallProcessor] Initiating call', { to: params.to });

    // Get Twilio client from provider
    const client = this.ensureTwilioClient();
    const config = this.twilioProvider.getConfig();

    // Ask AI for greeting
    const greeting = params.greeting || await this.generateGreeting(params);

    try {
      const call = await client.calls.create({
        to: params.to,
        from: config.phoneNumber,
        url: `http://localhost:3000/webhooks/calls/${params.conversationId}`,
        statusCallback: `http://localhost:3000/webhooks/call-status/${params.conversationId}`
      });

      this.logger.info('[CallProcessor] Call initiated', { callSid: call.sid });
      return { callSid: call.sid };
    } catch (error) {
      this.logger.error('[CallProcessor] Failed to initiate call:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Process user speech during a call
   * AI decides what to do (respond, use tools, end call, etc.)
   */
  async processUserSpeech(params: ProcessUserSpeechParams): Promise<ProcessorResponse> {
    this.logger.info('[CallProcessor] Processing speech', { 
      callSid: params.callSid,
      speech: params.userSpeech.substring(0, 50) 
    });

    // 1. Ask AI what to do
    const aiResponse = await this.consultAI({
      context: `User said: "${params.userSpeech}"\n\nWhat should I do?`,
      options: ['respond', 'use_tools', 'transfer_call', 'end_call'],
      history: params.conversationHistory.map(m => m.content)
    });

    // 2. If AI wants to use tools, execute them
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      this.logger.info('[CallProcessor] AI requested tool calls', { 
        count: aiResponse.toolCalls.length,
        tools: aiResponse.toolCalls.map(tc => tc.name)
      });

      const toolResults = await this.executeTools(
        aiResponse.toolCalls,
        params.callSid,
        params.conversationHistory.map(m => m.content)
      );

      // 3. Ask AI again with tool results to get final response
      const finalResponse = await this.consultAI({
        context: `I executed these tools:\n${JSON.stringify(toolResults, null, 2)}\n\nWhat should I say to the user?`,
        options: ['respond_with_results', 'use_more_tools', 'end_call'],
        history: [
          ...params.conversationHistory.map(m => m.content),
          aiResponse.content,
          `Tool results: ${JSON.stringify(toolResults)}`
        ]
      });

      return {
        content: finalResponse.content,
        action: 'respond',
        metadata: {
          toolsUsed: aiResponse.toolCalls.map(tc => tc.name),
          toolResults
        }
      };
    }

    // 4. Check if AI wants to end call
    if (aiResponse.content.toLowerCase().includes('end call') || 
        aiResponse.content.toLowerCase().includes('goodbye')) {
      return {
        content: aiResponse.content,
        action: 'end_call'
      };
    }

    // 5. No tools needed, just respond
    return {
      content: aiResponse.content,
      action: 'respond'
    };
  }

  /**
   * Execute tools with AI guidance on error handling
   */
  private async executeTools(
    toolCalls: Array<{ id: string; name: string; parameters: any }>,
    callSid: string,
    conversationHistory: string[]
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        this.logger.info('[CallProcessor] Executing tool', { tool: toolCall.name });

        const result = await this.toolExecutor.execute(
          toolCall.name,
          toolCall.parameters,
          {
            channel: 'call',
            conversationId: callSid,
            callSid
          }
        );
        results.push(result);

        this.logger.info('[CallProcessor] Tool executed successfully', { 
          tool: toolCall.name,
          success: result.success 
        });
      } catch (error) {
        this.logger.warn('[CallProcessor] Tool execution failed', { 
          tool: toolCall.name,
          error: error instanceof Error ? error.message : String(error)
        });

        // Ask AI how to handle the error
        const errorGuidance = await this.consultAI({
          context: `Tool "${toolCall.name}" failed with error: ${error instanceof Error ? error.message : String(error)}. What should I do?`,
          options: ['retry', 'skip', 'use_alternative', 'inform_user'],
          history: conversationHistory
        });

        this.logger.info('[CallProcessor] AI error guidance', { guidance: errorGuidance.content });

        // Handle based on AI guidance
        if (errorGuidance.content.toLowerCase().includes('retry')) {
          // Retry once
          try {
            const retryResult = await this.toolExecutor.execute(
              toolCall.name,
              toolCall.parameters,
              { channel: 'call', conversationId: callSid, callSid }
            );
            results.push(retryResult);
            this.logger.info('[CallProcessor] Tool retry succeeded');
          } catch (retryError) {
            results.push({
              success: false,
              error: retryError instanceof Error ? retryError.message : String(retryError),
              response: { speak: 'I had trouble with that action. Let me try something else.' }
            });
          }
        } else {
          // Add error result with AI's suggestion
          results.push({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            response: { speak: errorGuidance.content }
          });
        }
      }
    }

    return results;
  }

  /**
   * End a call
   */
  async endCall(callSid: string): Promise<void> {
    this.logger.info('[CallProcessor] Ending call', { callSid });

    const client = this.ensureTwilioClient();

    try {
      await client.calls(callSid).update({ status: 'completed' });
      this.logger.info('[CallProcessor] Call ended', { callSid });
    } catch (error) {
      this.logger.error('[CallProcessor] Failed to end call:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate greeting using AI
   */
  private async generateGreeting(params: InitiateCallParams): Promise<string> {
    const response = await this.consultAI({
      context: 'Generate a friendly greeting for an outbound call.',
      options: ['greeting'],
      history: []
    });
    return response.content;
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI assistant helping to orchestrate a phone call.
Available actions: ${options.join(', ')}
Choose the most appropriate action and provide a clear, conversational response.
Keep responses concise and natural for voice conversation.`;
  }
}

