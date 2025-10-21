/**
 * Database Migration Utilities
 *
 * Provides utilities to migrate from old conversation store
 * to new memory-centric architecture.
 */

import type { Memory, IStorage } from '../types';
import { logger } from '../../utils/logger';
// Minimal PgDatabase type to avoid optional dependency requirement
type PgDatabase<T = any> = {
  execute: (query: any) => Promise<any[]>;
};

export interface MigrationOptions {
  sourceDb: PgDatabase<any>;
  targetStorage: IStorage;
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Migrate data from old conversation store to new memory system
 */
export async function migrateConversationsToMemory(
  options: MigrationOptions
): Promise<{ migrated: number; errors: number }> {
  const { sourceDb, targetStorage, batchSize = 100, onProgress } = options;

  let migrated = 0;
  let errors = 0;

  try {
    // Fetch all conversations from old schema
    // This assumes the old table was named 'ai_receptionist_conversations'
    const conversations = await sourceDb.execute(
      sql`SELECT * FROM ai_receptionist_conversations ORDER BY created_at ASC`
    ) as any[];

    const total = conversations.length;

    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      const memories: Memory[] = [];

      for (const conv of batch) {
        try {
          // Convert each conversation to memories
          const convMemories = convertConversationToMemories(conv);
          memories.push(...convMemories);
        } catch (error) {
          logger.error(`Failed to convert conversation ${conv.id}: ${(error as Error).message}`);
          errors++;
        }
      }

      // Save batch to new storage
      if (memories.length > 0) {
        try {
          await targetStorage.saveBatch(memories);
          migrated += memories.length;

          if (onProgress) {
            onProgress(Math.min(i + batchSize, total), total);
          }
        } catch (error) {
          logger.error(`Failed to save memory batch: ${(error as Error).message}`);
          errors += memories.length;
        }
      }
    }
  } catch (error) {
    logger.error(`Migration failed: ${(error as Error).message}`);
    throw error;
  }

  return { migrated, errors };
}

/**
 * Convert old Conversation to new Memory format
 */
export function convertConversationToMemories(conversation: any): Memory[] {
  const memories: Memory[] = [];

  // Create session start memory
  memories.push({
    id: `${conversation.id}-session-start`,
    content: `Started ${conversation.channel} conversation`,
    timestamp: new Date(conversation.startedAt),
    type: 'system',
    importance: 5,
    channel: conversation.channel,
    sessionMetadata: {
      conversationId: conversation.id,
      callSid: conversation.callSid,
      messageSid: conversation.messageSid,
      status: conversation.status,
    },
    metadata: conversation.metadata || {},
  });

  // Convert each message to a memory
  const messages = conversation.messages || [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    memories.push({
      id: `${conversation.id}-msg-${i}`,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      type: 'conversation',
      importance: 5,
      channel: conversation.channel,
      sessionMetadata: {
        conversationId: conversation.id,
        callSid: conversation.callSid,
        messageSid: conversation.messageSid,
        status: conversation.status,
      },
      role: msg.role,
      toolCall: msg.toolCall,
      toolResult: msg.toolResult,
    });
  }

  // Create session end memory if conversation ended
  if (conversation.endedAt) {
    memories.push({
      id: `${conversation.id}-session-end`,
      content: 'Conversation ended',
      timestamp: new Date(conversation.endedAt),
      type: 'system',
      importance: 7,
      channel: conversation.channel,
      sessionMetadata: {
        conversationId: conversation.id,
        callSid: conversation.callSid,
        messageSid: conversation.messageSid,
        status: conversation.status,
      },
    });
  }

  return memories;
}

/**
 * Verify migration integrity
 * Compares counts between old and new systems
 */
export async function verifyMigration(
  sourceDb: PgDatabase<any>,
  targetStorage: IStorage
): Promise<{
  sourceCount: number;
  targetCount: number;
  isValid: boolean;
  details: string;
}> {
  try {
    // Count conversations in old schema
    const sourceResult = await sourceDb.execute(
      sql`SELECT COUNT(*) as count FROM ai_receptionist_conversations`
    ) as any[];
    const sourceCount = Number(sourceResult[0]?.count || 0);

    // Count session memories in new schema
    const sessionMemories = await targetStorage.search({
      type: 'system',
      limit: 100000, // High limit to count all
    });
    const targetCount = sessionMemories.filter(
      m => m.content.includes('Started') || m.content.includes('ended')
    ).length / 2; // Divide by 2 since each conversation has start+end

    const isValid = sourceCount === targetCount;
    const details = isValid
      ? 'Migration successful - counts match'
      : `Mismatch: ${sourceCount} conversations in old schema, ${targetCount} conversations in new schema`;

    return {
      sourceCount,
      targetCount,
      isValid,
      details,
    };
  } catch (error) {
    return {
      sourceCount: 0,
      targetCount: 0,
      isValid: false,
      details: `Verification failed: ${error}`,
    };
  }
}

/**
 * Rollback migration (delete all migrated memories)
 * USE WITH CAUTION - This will delete all memories
 */
export async function rollbackMigration(storage: IStorage): Promise<number> {
  const allMemories = await storage.search({
    limit: 100000,
  });

  let deleted = 0;
  for (const memory of allMemories) {
    await storage.delete(memory.id);
    deleted++;
  }

  return deleted;
}

// Placeholder for sql template literal
const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '');
  }, '');
};
