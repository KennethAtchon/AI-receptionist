/**
 * PromptOptimizer - Validates and formats prompts (deterministic only)
 *
 * Philosophy:
 * - System prompts are NEVER modified by AI (too risky, unpredictable)
 * - Only deterministic, rules-based cleanup (whitespace, deduplication)
 * - If over token budget, THROW ERROR - let user decide what to trim
 * - AI compression is ONLY for chat history (user/assistant messages)
 */

import type { PromptContext, PromptSection, Message, ITokenizer } from '../types';

/**
 * Custom error for prompts exceeding token budget
 */
export class PromptTooLargeError extends Error {
  constructor(
    message: string,
    public readonly details: {
      tokens: number;
      maxTokens: number;
      sections: Record<string, number>;
    }
  ) {
    super(message);
    this.name = 'PromptTooLargeError';
  }
}

/**
 * Simple tokenizer that estimates token count
 * In production, you would use tiktoken or similar
 */
export class SimpleTokenizer implements ITokenizer {
  /**
   * Estimate token count (rough approximation)
   * Real implementation would use tiktoken
   */
  public async count(text: string): Promise<number> {
    // Rough estimate: ~4 characters per token for English text
    // This is a simplification - actual tokenization is more complex
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;

    // Average of character-based and word-based estimates
    const charEstimate = charCount / 4;
    const wordEstimate = wordCount * 1.3; // English words average ~1.3 tokens

    return Math.ceil((charEstimate + wordEstimate) / 2);
  }
}

export class PromptOptimizer {
  private tokenizer: ITokenizer;
  private compressionModel?: any; // IAIProvider - only for chat history compression

  constructor(
    tokenizer?: ITokenizer,
    compressionModel?: any
  ) {
    this.tokenizer = tokenizer || new SimpleTokenizer();
    this.compressionModel = compressionModel;
  }

  /**
   * Validate and format system prompt (deterministic only)
   */
  public async optimize(prompt: string, context: PromptContext): Promise<string> {
    let optimized = prompt;

    // 1. Remove duplicate lines (deterministic)
    optimized = this.deduplicateLines(optimized);

    // 2. Compress whitespace (deterministic)
    optimized = this.normalizeWhitespace(optimized);

    // 3. Validate token budget - THROW if exceeded
    const tokens = await this.countTokens(optimized);
    const maxTokens = context.maxTokens || 8000;

    if (tokens > maxTokens) {
      const sections = this.getSectionSizes(optimized);
      throw new PromptTooLargeError(
        `System prompt exceeds token budget: ${tokens} > ${maxTokens}. ` +
        `Please reduce prompt size by removing sections or shortening content.`,
        { tokens, maxTokens, sections }
      );
    }

    // 4. Validate structure
    this.validateStructure(optimized);

    return optimized;
  }

  /**
   * Compress chat history using a lightweight model
   * This is SAFE because we're not modifying system instructions
   */
  public async compressChatHistory(
    messages: Message[],
    targetTokens: number
  ): Promise<Message[]> {
    if (!this.compressionModel) {
      // Fallback: just truncate oldest messages
      return this.truncateMessages(messages, targetTokens);
    }

    const currentTokens = await this.countTokens(
      messages.map(m => m.content).join('\n')
    );

    if (currentTokens <= targetTokens) {
      return messages; // No compression needed
    }

    // Keep most recent messages, compress older ones
    const recentCount = 5; // Always keep last 5 messages intact
    const recentMessages = messages.slice(-recentCount);
    const oldMessages = messages.slice(0, -recentCount);

    if (oldMessages.length === 0) {
      return recentMessages; // Can't compress further
    }

    // Compress old messages into a summary
    const summary = await this.summarizeMessages(oldMessages);

    return [
      {
        role: 'system',
        content: `Previous conversation summary:\n${summary}`,
        timestamp: new Date()
      },
      ...recentMessages
    ];
  }

  /**
   * Use lightweight AI model to summarize old messages
   */
  private async summarizeMessages(messages: Message[]): Promise<string> {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await this.compressionModel.chat({
      conversationId: 'compression',
      userMessage: `Summarize this conversation concisely, preserving key facts and context:\n\n${conversationText}`,
      systemPrompt: 'You are a conversation summarizer. Extract and preserve important facts, decisions, and context.',
      availableTools: []
    });

    return response.content;
  }

  /**
   * Deterministic: remove duplicate consecutive lines
   */
  private deduplicateLines(text: string): string {
    const lines = text.split('\n');
    const deduped: string[] = [];
    let lastLine = '';

    for (const line of lines) {
      const normalized = line.trim();
      if (normalized !== lastLine.trim()) {
        deduped.push(line);
        lastLine = line;
      }
    }

    return deduped.join('\n');
  }

  /**
   * Deterministic: normalize whitespace
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\n{3,}/g, '\n\n')   // Max 2 newlines
      .replace(/ {2,}/g, ' ')        // Single spaces
      .replace(/\t/g, '  ')          // Tabs to 2 spaces
      .trim();
  }

  /**
   * Count tokens using proper tokenizer
   */
  private async countTokens(text: string): Promise<number> {
    return this.tokenizer.count(text);
  }

  /**
   * Get size of each section for helpful error messages
   */
  private getSectionSizes(prompt: string): Record<string, number> {
    const sections = this.extractSections(prompt);
    const sizes: Record<string, number> = {};

    for (const section of sections) {
      // Use sync version for simplicity in error reporting
      const estimate = Math.ceil(section.content.length / 4);
      sizes[section.name] = estimate;
    }

    return sizes;
  }

  /**
   * Validate critical sections exist
   */
  private validateStructure(prompt: string): void {
    const required = ['# IDENTITY'];

    for (const section of required) {
      if (!prompt.includes(section)) {
        throw new Error(`Required section missing: ${section}`);
      }
    }
  }

  /**
   * Extract sections from prompt
   */
  private extractSections(prompt: string): PromptSection[] {
    const sections: PromptSection[] = [];
    const lines = prompt.split('\n');
    let currentSection: PromptSection | null = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          name: line.replace('# ', '').trim(),
          content: line + '\n'
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Truncate messages to fit within token budget
   */
  private truncateMessages(messages: Message[], targetTokens: number): Message[] {
    const kept: Message[] = [];
    let estimatedTokens = 0;

    // Keep messages from most recent, going backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = Math.ceil(messages[i].content.length / 4);

      if (estimatedTokens + msgTokens > targetTokens) {
        break; // Would exceed budget
      }

      kept.unshift(messages[i]);
      estimatedTokens += msgTokens;
    }

    return kept;
  }

  /**
   * Get detailed statistics about a prompt
   */
  public async getStats(prompt: string): Promise<{
    totalTokens: number;
    totalChars: number;
    totalLines: number;
    sections: Array<{ name: string; tokens: number; chars: number }>;
  }> {
    const sections = this.extractSections(prompt);
    const sectionStats = await Promise.all(
      sections.map(async (section) => ({
        name: section.name,
        tokens: await this.tokenizer.count(section.content),
        chars: section.content.length
      }))
    );

    return {
      totalTokens: await this.tokenizer.count(prompt),
      totalChars: prompt.length,
      totalLines: prompt.split('\n').length,
      sections: sectionStats
    };
  }

  /**
   * Suggest optimizations if prompt is too large
   */
  public async suggestOptimizations(
    prompt: string,
    maxTokens: number
  ): Promise<string[]> {
    const stats = await this.getStats(prompt);
    const suggestions: string[] = [];

    if (stats.totalTokens <= maxTokens) {
      return ['Prompt is within token budget. No optimization needed.'];
    }

    const excess = stats.totalTokens - maxTokens;
    suggestions.push(`Prompt is ${excess} tokens over budget.`);

    // Find largest sections
    const sortedSections = [...stats.sections].sort((a, b) => b.tokens - a.tokens);

    suggestions.push('\nLargest sections:');
    for (let i = 0; i < Math.min(3, sortedSections.length); i++) {
      const section = sortedSections[i];
      suggestions.push(`- ${section.name}: ${section.tokens} tokens`);
    }

    suggestions.push('\nOptimization suggestions:');
    suggestions.push('1. Reduce the number of examples');
    suggestions.push('2. Shorten personality trait descriptions');
    suggestions.push('3. Limit memory context to fewer messages');
    suggestions.push('4. Remove optional sections');

    return suggestions;
  }
}
