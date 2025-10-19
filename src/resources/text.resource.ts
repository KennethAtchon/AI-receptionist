/**
 * Text Resource
 * Simple text generation API for testing AI Agent capabilities
 *
 * This resource provides a minimal interface for testing the AI agent
 * independently without the complexity of multi-channel communication.
 */

import { Agent } from '../agent/core/Agent';
import { GenerateTextOptions, TextResponse } from '../types';
import { logger } from '../utils/logger';

export class TextResource {
  constructor(private agent: Agent) {}

  /**
   * Generate text using the AI agent
   *
   * This is a simple, direct interface to the AI agent for testing purposes.
   * It bypasses communication channels and tool execution, focusing purely
   * on the agent's ability to process text and generate responses.
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
   * // With metadata
   * const response = await client.text.generate({
   *   prompt: 'Summarize the benefits of TypeScript',
   *   metadata: { context: 'documentation', audience: 'beginners' }
   * });
   * console.log(response.text);
   * ```
   */
  async generate(options: GenerateTextOptions): Promise<TextResponse> {
    logger.info(`[TextResource] Generating text for prompt: "${options.prompt.substring(0, 50)}..."`);

    try {
      // Create a simple request for the agent
      const agentResponse = await this.agent.process({
        id: `text-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        input: options.prompt,
        channel: 'text' as any, // Using 'text' as a simple channel
        context: {
          conversationId: options.conversationId || `text-conv-${Date.now()}`,
          channel: 'text' as any,
          metadata: options.metadata
        }
      });

      const response: TextResponse = {
        text: agentResponse.content,
        metadata: {
          ...agentResponse.metadata,
          timestamp: new Date(),
          conversationId: options.conversationId || `text-conv-${Date.now()}`
        }
      };

      logger.info(`[TextResource] Text generated successfully`);
      return response;

    } catch (err) {
      logger.error(
        `[TextResource] Failed to generate text`,
        err instanceof Error ? err : new Error(String(err)),
        { prompt: options.prompt }
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
