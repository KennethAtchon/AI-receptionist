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

/**
 * Factory configuration uses AIReceptionistConfig but with agent config optional.
 * Agent configuration is provided per-instance via AgentInstanceConfig.
 * 
 * @deprecated Use AIReceptionistConfig directly. FactoryConfig is kept for backward compatibility.
 */
export type FactoryConfig = Omit<AIReceptionistConfig, 'agent'> & {
  // Agent config is optional for factory (provided per-instance)
  agent?: never; // Explicitly disallow agent config at factory level
};

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
    // Auto-persistence rules
    autoPersist?: {
      minImportance?: number; // Auto-save if importance >= this
      types?: Array<'conversation' | 'decision' | 'error' | 'tool_execution' | 'system'>; // Auto-save these types
      persistAll?: boolean; // Auto-save all memories
    };
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
