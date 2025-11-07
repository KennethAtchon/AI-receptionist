/**
 * Factory Pattern Types
 *
 * Type definitions for the AIReceptionistFactory pattern that enables
 * efficient concurrent request handling with shared resources.
 */

import type {
  IdentityConfig,
  PersonalityConfig,
  KnowledgeConfig,
  GoalConfig
} from '../agent/types';
import type { Agent } from '../agent/core/Agent';
import type { VoiceResource } from '../resources/voice';
import type { SMSResource } from '../resources/sms';
import type { EmailResource } from '../resources/email';
import type { TextResource } from '../resources/text';
import type { AIReceptionistConfig } from '../types';

// ============================================================================
// Factory Configuration
// ============================================================================

export interface FactoryConfig {
  // Model configuration (shared across all agents)
  model: {
    provider: 'openai' | 'openrouter';
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };

  // Provider configuration (shared) - reuse existing config structure
  providers?: AIReceptionistConfig['providers'];

  // Storage configuration (shared)
  storage?: {
    type: 'database' | 'memory';
    database?: {
      /**
       * Database connection configuration.
       * You can provide a connection string, connection details, or an existing Drizzle instance.
       * 
       * @example Using connection string (simplest)
       * ```typescript
       * const factory = await AIReceptionistFactory.create({
       *   // ...
       *   storage: {
       *     type: 'database',
       *     database: {
       *       connectionString: process.env.DATABASE_URL,
       *       autoMigrate: true
       *     }
       *   }
       * });
       * ```
       * 
       * @example Using connection details
       * ```typescript
       * const factory = await AIReceptionistFactory.create({
       *   // ...
       *   storage: {
       *     type: 'database',
       *     database: {
       *       host: 'localhost',
       *       port: 5432,
       *       database: 'myapp',
       *       user: 'postgres',
       *       password: 'password',
       *       autoMigrate: true
       *     }
       *   }
       * });
       * ```
       * 
       * @example Using existing Drizzle instance (advanced)
       * ```typescript
       * import { drizzle } from 'drizzle-orm/node-postgres';
       * import { Pool } from 'pg';
       * 
       * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
       * const db = drizzle(pool);
       * 
       * const factory = await AIReceptionistFactory.create({
       *   // ...
       *   storage: {
       *     type: 'database',
       *     database: {
       *       db: db,
       *       autoMigrate: true
       *     }
       *   }
       * });
       * ```
       */
      connectionString?: string;
      host?: string;
      port?: number;
      database?: string;
      user?: string;
      password?: string;
      ssl?: boolean | { rejectUnauthorized?: boolean };
      db?: any; // Existing Drizzle ORM instance (alternative to connectionString/details)
      /**
       * Automatically create tables if they don't exist.
       * Default: false (requires manual migrations via drizzle-kit)
       * Set to true to enable automatic table creation on initialization.
       */
      autoMigrate?: boolean;
    };
  };

  // Tool configuration
  tools?: {
    defaults?: ('calendar' | 'booking' | 'crm')[];
    custom?: any[]; // Custom tools array
  };

  // Debug mode
  debug?: boolean;
}

// ============================================================================
// Agent Instance Configuration
// ============================================================================

export interface AgentInstanceConfig {
  // Agent configuration (per-agent, customizable)
  identity?: IdentityConfig;
  personality?: PersonalityConfig;
  knowledge?: KnowledgeConfig;
  goals?: GoalConfig;

  // Custom system prompt (overrides builder)
  customSystemPrompt?: string;

  // Memory configuration
  memory?: {
    contextWindow?: number; // ShortTermMemory size
    // longTermStorage is automatically configured by factory
    // Per-agent storage override (optional, for hybrid pattern)
    longTermStorage?: any;
  };
}

// ============================================================================
// Agent Instance
// ============================================================================

export interface AgentInstance {
  agent: Agent;
  voice: VoiceResource;
  sms: SMSResource;
  email: EmailResource;
  text: TextResource;
  dispose: () => Promise<void>;
}
