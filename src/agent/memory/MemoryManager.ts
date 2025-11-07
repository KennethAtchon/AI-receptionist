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
   * Store new memory
   * 
   * IMPORTANT: Short-term memory is ONLY used if the information will 100% 
   * still be there in the 20 message window. For all persistent data, use 
   * long-term storage exclusively.
   */
  public async store(memory: Memory): Promise<void> {
    // Store in short-term memory ONLY if it's guaranteed to be in the 20 message window
    // This means: current conversation messages that haven't exceeded the context window
    // For all other data, skip short-term and go directly to long-term
    const shouldUseShortTerm = this.shouldUseShortTerm(memory);
    
    if (shouldUseShortTerm) {
      await this.shortTerm.add(memory);
    }

    // Decide if important enough for long-term storage
    if (this.shouldPersist(memory) && this.longTerm) {
      await this.longTerm.add(memory);
    }
  }

  /**
   * Determine if memory should be stored in short-term memory
   * 
   * Short-term memory should ONLY be used if:
   * - It's a conversation message (type: 'conversation')
   * - It's part of the current active conversation
   * - The short-term buffer has space (will definitely be in 20 message window)
   * 
   * All other memories (decisions, errors, tool executions, system events) 
   * should go directly to long-term storage.
   */
  private shouldUseShortTerm(memory: Memory): boolean {
    // Only conversation messages can use short-term memory
    if (memory.type !== 'conversation') {
      return false;
    }

    // Only if short-term memory has space (guaranteed to be in window)
    if (this.shortTerm.isFull()) {
      return false;
    }

    // Only for current conversation context
    // Short-term is for immediate context window, not historical data
    return true;
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
   * 
   * IMPORTANT: Short-term memory is ONLY used if:
   * 1. Long-term storage is not available (fallback only)
   * 2. The information will 100% still be there in the 20 message window
   * 
   * For all conversation history retrieval, use long-term storage exclusively.
   */
  public async getConversationHistory(conversationId: string): Promise<Memory[]> {
    if (!this.longTerm) {
      // Fallback to short-term ONLY if no long-term storage available
      // This is a development/testing scenario only
      return this.shortTerm.getAll().filter(
        m => m.sessionMetadata?.conversationId === conversationId
      );
    }

    // Always use long-term storage for conversation history
    // No limit - retrieve entire conversation
    return this.longTerm.search({
      conversationId,
      orderBy: 'timestamp',
      orderDirection: 'asc'
      // No limit - get full conversation history
    });
  }

  /**
   * Get all memories for a specific channel
   * 
   * IMPORTANT: Short-term memory is ONLY used if long-term storage is unavailable.
   * All channel history should use long-term storage exclusively.
   */
  public async getChannelHistory(
    channel: Channel,
    options?: { limit?: number; conversationId?: string }
  ): Promise<Memory[]> {
    if (!this.longTerm) {
      // Fallback to short-term ONLY if no long-term storage available
      return this.shortTerm.getAll().filter(m => m.channel === channel);
    }

    // Always use long-term storage for channel history
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
   * 
   * IMPORTANT: Short-term memory is ONLY used if long-term storage is unavailable.
   * All searches should use long-term storage exclusively.
   */
  public async search(query: MemorySearchQuery): Promise<Memory[]> {
    if (!this.longTerm) {
      // Fallback to short-term ONLY if no long-term storage available
      // This is a development/testing scenario only
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

    // Always use long-term storage for searches
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
        conversationId: session.conversationId
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
        conversationId
      },
      importance: 7 // Higher importance for session summaries
    };

    await this.store(memory);
  }

  /**
   * Get conversation by identifier (phone number, email, etc.)
   * Useful for webhook routing to find existing conversations
   */
  public async getConversationByIdentifier(
    channel: Channel,
    identifier: string
  ): Promise<Memory | null> {
    if (!this.longTerm) {
      // Fallback to short-term if no long-term storage
      const memories = this.shortTerm.getAll();
      return memories.find(m => {
        if (m.channel !== channel) return false;
        const metadata = m.sessionMetadata;
        if (channel === 'email' && metadata?.from === identifier) return true;
        if (channel === 'email' && metadata?.to === identifier) return true;
        if ((channel === 'call' || channel === 'sms') && metadata?.from === identifier) return true;
        if ((channel === 'call' || channel === 'sms') && metadata?.to === identifier) return true;
        return false;
      }) || null;
    }

    // Search for most recent conversation with this identifier
    const results = await this.longTerm.search({
      channel,
      orderBy: 'timestamp',
      orderDirection: 'desc',
      limit: 10
    });

    // Find match by identifier in sessionMetadata
    return results.find(m => {
      const metadata = m.sessionMetadata;
      if (channel === 'email' && (metadata?.from === identifier || metadata?.to === identifier)) {
        return true;
      }
      if ((channel === 'call' || channel === 'sms') && 
          (metadata?.from === identifier || metadata?.to === identifier)) {
        return true;
      }
      return false;
    }) || null;
  }

  /**
   * Generate a new conversation ID
   */
  public generateConversationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `conv_${timestamp}_${random}`;
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
}
