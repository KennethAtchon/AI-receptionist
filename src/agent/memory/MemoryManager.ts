/**
 * MemoryManager - Multi-tier memory system
 *
 * The Memory pillar encompasses:
 * - Short-term memory (working memory)
 * - Long-term memory (persistent storage)
 */

import type {
  MemoryManager as IMemoryManager,
  MemoryConfig,
  Memory,
  ConversationHistory,
  ConversationHistoryMetadata,
  MemoryStats,
  MemorySearchQuery,
  Message,
  Channel
} from '../types';

import { ShortTermMemory } from './ShortTermMemory';
import { LongTermMemory } from './LongTermMemory';
import { logger } from '../../utils/logger';

export class MemoryManagerImpl implements IMemoryManager {
  private readonly shortTerm: ShortTermMemory;
  private readonly longTerm?: LongTermMemory;
  private readonly config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;

    // Initialize short-term memory (always present)
    this.shortTerm = new ShortTermMemory(config.contextWindow || 20);

    // Initialize long-term memory if enabled
    if (config.longTermEnabled) {
      if (config.sharedLongTermMemory) {
        // Use shared LongTermMemory instance (factory pattern)
        this.longTerm = config.sharedLongTermMemory;
      } else if (config.longTermStorage) {
        // Create per-agent LongTermMemory (legacy pattern)
        this.longTerm = new LongTermMemory(config.longTermStorage);
      }
    }
  }

  /**
   * Initialize the memory manager
   */
  public async initialize(): Promise<void> {
    // Future: Load initial context from storage
  }

  /**
   * TODO: Refractor this, remove the input (user message) because it is utterly meaningless to retrieve a CONVERSATION HISTORY, make sure there is NO limit. Just retrieve the conversation using the ID, this function should be as simple as that. Just query the long term storage, completely remove short term from here
   * @param input - The user's message
   * @param context - convo Id, channel
   * @returns 
   */
  public async retrieve(input: string, context?: {
    conversationId?: string;
    channel?: Channel;
  }): Promise<ConversationHistory> {
    const messages: Message[] = [];
    const contextMessages: Message[] = [];

    if (context?.conversationId) {
      const conversationMemories = this.shortTerm.getAll().filter(
        m => m.sessionMetadata?.conversationId === context.conversationId
      );
      messages.push(...this.convertMemoriesToMessages(conversationMemories));
    }

    if (this.longTerm && context?.conversationId) {
      try {
        const keywords = this.extractKeywords(input);
        const searchQuery: MemorySearchQuery = {
          keywords,
          limit: 5,
          minImportance: 5,
          conversationId: context.conversationId
        };

        if (context?.channel) {
          searchQuery.channel = context.channel;
        }

        const longTermMemories = await this.longTerm.search(searchQuery);

        if (longTermMemories.length > 0) {
          contextMessages.push({
            role: 'system',
            content: this.formatLongTermContext(longTermMemories),
            timestamp: new Date()
          });
        }
      } catch (error) {
        logger.warn('[MemoryManager] Long-term memory search failed:', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    const metadata: ConversationHistoryMetadata = {
      conversationId: context?.conversationId,
      messageCount: messages.length,
      oldestMessageTimestamp: messages[0]?.timestamp,
      newestMessageTimestamp: messages[messages.length - 1]?.timestamp,
      hasLongTermContext: !!contextMessages.length
    };

    return {
      messages,
      contextMessages,
      metadata
    };
  }

  /**
   * Store new memory
   */
  public async store(memory: Memory): Promise<void> {
    // Always store in short-term memory
    await this.shortTerm.add(memory);

    // Decide if important enough for long-term storage
    if (this.shouldPersist(memory) && this.longTerm) {
      await this.longTerm.add(memory);
    }
  }

  /**
   * Determine if a memory should be persisted to long-term storage
   */
  private shouldPersist(memory: Memory): boolean {
    // Use auto-persist rules if configured
    if (this.config.autoPersist) {
      const { minImportance, types } = this.config.autoPersist;

      if (minImportance && memory.importance && memory.importance >= minImportance) {
        return true;
      }

      if (types && types.includes(memory.type)) {
        return true;
      }
    }

    // Default rules: Persist if:
    // - High importance (> 7)
    // - Decision was made
    // - Error occurred (for learning)
    // - Goal was achieved
    // - Tool was executed
    // - System event
    return (
      (memory.importance !== undefined && memory.importance > 7) ||
      memory.type === 'decision' ||
      memory.type === 'error' ||
      memory.type === 'tool_execution' ||
      memory.type === 'system' ||
      memory.goalAchieved === true
    );
  }

  /**
   * Delete this, what the fuck is this?
   * Extract keywords from input (simple implementation)
   */
  private extractKeywords(input: string): string[] {
    // Simple keyword extraction - remove common words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const words = input.toLowerCase().split(/\s+/);
    return words.filter(word => !commonWords.has(word) && word.length > 3);
  }

  /**
   * Get memory statistics
   */
  public getStats(): MemoryStats {
    return {
      shortTermCount: this.shortTerm.count(),
      longTermCount: this.longTerm?.count() || 0
    };
  }

  /**
   * Dispose of memory resources
   */
  public async dispose(): Promise<void> {
    this.shortTerm.clear();
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }

  /**
   * Clear all memory (useful for testing)
   */
  public async clearAll(): Promise<void> {
    this.shortTerm.clear();
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }

  /**
   * Clear short-term memory only
   */
  public clearShortTerm(): void {
    this.shortTerm.clear();
  }

  /**
   * Clear long-term memory cache
   */
  public clearLongTerm(): void {
    if (this.longTerm) {
      this.longTerm.clearCache();
    }
  }

  // ==================== NEW METHODS FOR CONVERSATION MANAGEMENT ====================

  /**
   * Get all memories for a specific conversation
   */
  public async getConversationHistory(conversationId: string): Promise<Memory[]> {
    if (!this.longTerm) {
      // Fallback to short-term if no long-term storage
      return this.shortTerm.getAll().filter(
        m => m.sessionMetadata?.conversationId === conversationId
      );
    }

    return this.longTerm.search({
      conversationId,
      orderBy: 'timestamp',
      orderDirection: 'asc'
    });
  }

  /**
   * Get all memories for a specific channel
   */
  public async getChannelHistory(
    channel: Channel,
    options?: { limit?: number; conversationId?: string }
  ): Promise<Memory[]> {
    if (!this.longTerm) {
      return this.shortTerm.getAll().filter(m => m.channel === channel);
    }

    return this.longTerm.search({
      channel,
      conversationId: options?.conversationId,
      limit: options?.limit,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });
  }

  /**
   * Search memories with advanced filtering
   */
  public async search(query: MemorySearchQuery): Promise<Memory[]> {
    if (!this.longTerm) {
      // Basic filtering on short-term memory
      let results = this.shortTerm.getAll();

      if (query.channel) {
        results = results.filter(m => m.channel === query.channel);
      }

      if (query.conversationId) {
        results = results.filter(
          m => m.sessionMetadata?.conversationId === query.conversationId
        );
      }

      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        results = results.filter(m => types.includes(m.type));
      }

      return results.slice(0, query.limit || 10);
    }

    return this.longTerm.search(query);
  }

  /**
   * Create a new conversation session
   */
  public async startSession(session: {
    conversationId: string;
    channel: Channel;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const memory: Memory = {
      id: `session-start-${session.conversationId}`,
      content: `Started ${session.channel} conversation`,
      timestamp: new Date(),
      type: 'system',
      channel: session.channel,
      sessionMetadata: {
        conversationId: session.conversationId,
        status: 'active'
      },
      metadata: session.metadata,
      importance: 5
    };

    await this.store(memory);
  }

  /**
   * End a conversation session
   */
  public async endSession(conversationId: string, summary?: string): Promise<void> {
    const memory: Memory = {
      id: `session-end-${conversationId}`,
      content: summary || 'Conversation ended',
      timestamp: new Date(),
      type: 'system',
      sessionMetadata: {
        conversationId,
        status: 'completed'
      },
      importance: 7 // Higher importance for session summaries
    };

    await this.store(memory);
  }

  /**
   * Get conversation by call SID
   * Moved from ConversationService to preserve functionality
   */
  public async getConversationByCallId(callSid: string): Promise<Memory | null> {
    const results = await this.search({
      keywords: [],
      limit: 1,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });
    
    const match = results.find(m => m.sessionMetadata?.callSid === callSid);
    return match || null;
  }

  /**
   * Get conversation by message SID
   * Moved from ConversationService to preserve functionality
   */
  public async getConversationByMessageId(messageSid: string): Promise<Memory | null> {
    const results = await this.search({
      keywords: [],
      limit: 1,
      orderBy: 'timestamp',
      orderDirection: 'desc'
    });
    
    const match = results.find(m => m.sessionMetadata?.messageSid === messageSid);
    return match || null;
  }

  /**
   * Attach call SID to conversation
   * Moved from ConversationService to preserve functionality
   */
  public async attachCallSid(conversationId: string, callSid: string): Promise<void> {
    const memory: Memory = {
      id: `session-call-${conversationId}`,
      content: 'Attached call SID',
      timestamp: new Date(),
      type: 'system',
      sessionMetadata: { conversationId, callSid }
    };
    
    await this.store(memory);
  }

  /**
   * Attach message SID to conversation
   * Moved from ConversationService to preserve functionality
   */
  public async attachMessageSid(conversationId: string, messageSid: string): Promise<void> {
    const memory: Memory = {
      id: `session-message-${conversationId}`,
      content: 'Attached message SID',
      timestamp: new Date(),
      type: 'system',
      sessionMetadata: { conversationId, messageSid }
    };
    
    await this.store(memory);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Convert Memory objects to Message format
   */
  private convertMemoriesToMessages(memories: Memory[]): Message[] {
    return memories.map(memory => ({
      role: memory.role || 'assistant',
      content: memory.content,
      timestamp: memory.timestamp,
      toolCall: memory.toolCall,
      toolResult: memory.toolResult
    }));
  }

  /**
   * Format long-term memories as context message content
   */
  private formatLongTermContext(memories: Memory[]): string {
    let context = 'Relevant context from past interactions:\n';
    for (const memory of memories) {
      const timestamp = memory.timestamp.toLocaleDateString();
      context += `- [${timestamp}] ${memory.content}\n`;
    }
    return context.trim();
  }
}
