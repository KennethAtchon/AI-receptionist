/**
 * Base Processor
 * Abstract base class for all processors
 */

import type { IAIProvider, AIResponse } from '../types';
import type { IProcessor, AIConsultationParams } from './processor.types';
import { logger } from '../utils/logger';

/**
 * Base processor class
 * All processors should extend this class
 */
export abstract class BaseProcessor implements IProcessor {
  abstract readonly name: string;
  abstract readonly type: 'call' | 'calendar' | 'messaging' | 'custom';

  protected readonly logger = logger;

  constructor(
    protected aiProvider: IAIProvider
  ) {}

  /**
   * Ask AI for guidance on how to proceed
   * 
   * @param params - Consultation parameters
   * @returns AI response with guidance
   */
  protected async consultAI(params: AIConsultationParams): Promise<AIResponse> {
    this.logger.info(`[${this.name}Processor] Consulting AI`, {
      context: params.context.substring(0, 100),
      options: params.options
    });

    const systemPrompt = this.buildSystemPrompt(params.options);
    const conversationId = `processor-${this.name}-${Date.now()}`;

    const response = await this.aiProvider.chat({
      conversationId,
      userMessage: params.context,
      systemPrompt,
      conversationHistory: params.history?.map(h => ({
        role: 'user' as const,
        content: h,
        timestamp: new Date()
      }))
    });

    this.logger.info(`[${this.name}Processor] AI guidance received`, {
      response: response.content.substring(0, 100),
      finishReason: response.finishReason
    });

    return response;
  }

  /**
   * Build system prompt for AI guidance
   * Must be implemented by subclasses
   * 
   * @param options - Available options for AI to choose from
   * @returns System prompt string
   */
  protected abstract buildSystemPrompt(options: string[]): string;
}

