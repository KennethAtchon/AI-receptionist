/**
 * Storage implementations for agent memory
 */

export { InMemoryStorage } from './InMemoryStorage';
export { DatabaseStorage } from './DatabaseStorage';
export type { DatabaseStorageConfig } from './DatabaseStorage';

export { memory, leads, callLogs } from './schema';
export type { Memory, NewMemory, Lead, NewLead, CallLog, NewCallLog } from './schema';

export {
  migrateConversationsToMemory,
  convertConversationToMemories,
  verifyMigration,
  rollbackMigration,
} from './migrations';
export type { MigrationOptions } from './migrations';
