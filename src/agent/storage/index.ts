/**
 * Storage implementations for agent memory
 */

export { InMemoryStorage } from './InMemoryStorage';
export { DatabaseStorage } from './DatabaseStorage';
export type { DatabaseStorageConfig } from './DatabaseStorage';

// Type alias for DatabaseStorage (commonly referred to as DrizzleStorage)
import type { DatabaseStorage } from './DatabaseStorage';
export type DrizzleStorage = DatabaseStorage;

export { memory, leads, callLogs, allowlist } from './schema';
export type {
  Memory,
  NewMemory,
  Lead,
  NewLead,
  CallLog,
  NewCallLog,
  Allowlist,
  NewAllowlist
} from './schema';

