/**
 * Text Resource
 * Enhanced text generation API with conversation management and tool usage
 *
 * This resource provides a comprehensive interface for testing the AI agent
 * with conversation continuity and tool execution capabilities.
 */

import { Agent } from '../agent/core/Agent';
import { ConversationService } from '../services/conversation.service';
import { GenerateTextOptions, TextResponse } from '../types';
import { logger } from '../utils/logger';

export class TextResource {
  constructor(
    private agent: Agent,
    private conversationService?: ConversationService
  ) {}

  /**
   * Generate text using the AI agent with conversation management and tool usage
   *
   * This enhanced interface provides:
   * - Conversation continuity through ConversationService
   * - Tool execution capabilities
   * - Rich metadata and context
   *
   * @example
   * ```typescript
   * const response = await client.text.generate({
   *   prompt: 'What is your name?'
   * });
   * console.log(response.text);
   * ```
   *
   * @example
   * ```typescript
   * // With conversation continuity
   * const response = await client.text.generate({
   *   prompt: 'Book a meeting for tomorrow at 2 PM',
   *   conversationId: 'user-123-conversation'
   * });
   * console.log(response.text);
   * ```
   */
  async generate(options: GenerateTextOptions): Promise<TextResponse> {
    logger.info(`[TextResource] Generating text for prompt: "${options.prompt.substring(0, 50)}..."`);

    try {
      // Get or create conversation if conversation service is available
      let conversationId = options.conversationId;
      if (this.conversationService && !conversationId) {
        const conversation = await this.conversationService.create({
          channel: 'text',
          metadata: options.metadata
        });
        conversationId = conversation.id;
        logger.info(`[TextResource] Created new conversation: ${conversationId}`);
      } else if (this.conversationService && conversationId) {
        // Add user message to existing conversation
        await this.conversationService.addMessage(conversationId, {
          role: 'user',
          content: options.prompt
        });
        logger.info(`[TextResource] Added user message to conversation: ${conversationId}`);
      }

      // Create agent request with enhanced context
      const agentResponse = await this.agent.process({
        id: `text-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        input: options.prompt,
        channel: 'text' as any,
        context: {
          conversationId: conversationId || `text-conv-${Date.now()}`,
          channel: 'text' as any,
          metadata: {
            ...options.metadata,
            source: 'text-resource',
            timestamp: new Date().toISOString()
          }
        }
      });

      // Add assistant response to conversation if conversation service is available
      if (this.conversationService && conversationId) {
        await this.conversationService.addMessage(conversationId, {
          role: 'assistant',
          content: agentResponse.content
        });
        logger.info(`[TextResource] Added assistant response to conversation: ${conversationId}`);
      }

      const response: TextResponse = {
        text: agentResponse.content,
        metadata: {
          ...agentResponse.metadata,
          timestamp: new Date(),
          conversationId: conversationId || `text-conv-${Date.now()}`,
          toolsUsed: agentResponse.metadata?.toolsUsed || [],
          toolResults: agentResponse.metadata?.toolResults || []
        }
      };

      logger.info(`[TextResource] Text generated successfully`, {
        conversationId,
        toolsUsed: response.metadata?.toolsUsed?.length || 0
      });
      return response;

    } catch (err) {
      logger.error(
        `[TextResource] Failed to generate text`,
        err instanceof Error ? err : new Error(String(err)),
        { prompt: options.prompt, conversationId: options.conversationId }
      );
      throw err;
    }
  }

  /**
   * Generate text in streaming mode (future enhancement)
   * TODO: Implement streaming support
   */
  async *stream(_options: GenerateTextOptions): AsyncIterableIterator<string> {
    throw new Error('Streaming not implemented yet. Use generate() instead.');
  }
}
