/**
 * @loctelli/ai-receptionist
 * Agent-Centric AI Communication SDK
 *
 * Build AI agents that can communicate through multiple channels (calls, SMS, email)
 * with extensible tool systems and channel-specific handlers.
 */

// ============================================================================
// Main Client
// ============================================================================

export { AIReceptionist } from './client';

// ============================================================================
// Agent System (Five-Pillar Architecture)
// ============================================================================

export { Agent } from './agent/core/Agent';
export { AgentBuilder } from './agent/core/AgentBuilder';
export { SystemPromptBuilder } from './agent/prompt/SystemPromptBuilder';
export { PromptOptimizer, PromptTooLargeError } from './agent/prompt/PromptOptimizer';
export { AgentLogger, FileLogger } from './agent/observability/AgentLogger';
export { InteractionTracer } from './agent/observability/InteractionTracer';

// ============================================================================
// Resources (User-facing API)
// ============================================================================

export { CallsResource } from './resources/calls.resource';
export { SMSResource } from './resources/sms.resource';
export { EmailResource } from './resources/email.resource';
export { TextResource } from './resources/text.resource';

// ============================================================================
// Tools (Tool System)
// ============================================================================

export { ToolRegistry } from './tools/registry';
export { ToolBuilder } from './tools/builder';
export { Tools } from './tools';

// ============================================================================
// Providers (External API Adapters)
// ============================================================================

export { TwilioProvider } from './providers/api/twilio.provider';
export { OpenAIProvider } from './providers/ai/openai.provider';
export { OpenRouterProvider, OPENROUTER_MODELS } from './providers/ai/openrouter.provider';
export { GoogleProvider } from './providers/api/google.provider';

// Email Providers
export { ResendProvider, SendGridProvider, SMTPProvider, EmailRouter } from './providers';
export type { IEmailProvider } from './providers';

// ============================================================================
// Services (Business Logic Layer)
// ============================================================================

export { ConversationService } from './services/conversation.service';
export { CallService } from './services/call.service';

// ============================================================================
// Storage
// ============================================================================

// New Memory-Centric Storage
export { InMemoryStorage, DatabaseStorage } from './agent/storage';
export type { DatabaseStorageConfig } from './agent/storage';

// Database Schema & Migrations
export { memory, leads, callLogs } from './agent/storage';
export type { Memory as DBMemory, NewMemory, Lead, NewLead, CallLog, NewCallLog } from './agent/storage';
export {
  migrateConversationsToMemory,
  convertConversationToMemories,
  verifyMigration,
  rollbackMigration,
} from './agent/storage';
export type { MigrationOptions } from './agent/storage';

// ============================================================================
// Adapters (Protocol Adapters)
// ============================================================================


// ============================================================================
// Core Infrastructure (Provider Management & Validation)
// ============================================================================

export { ProviderRegistry, ProviderProxy } from './providers/core';
export type { ICredentialValidator, ValidationResult } from './providers/validation';
export { TwilioValidator, OpenAIValidator, GoogleValidator } from './providers/validation';
export {
  ProviderError,
  CredentialValidationError,
  ProviderNotConfiguredError,
  ProviderInitializationError
} from './providers/core/provider.errors';

// ============================================================================
// Utilities
// ============================================================================

export { logger, configureLogger, createLogger, getLogger, LogLevel } from './utils/logger';
export type { ILogger, LoggerConfig, LoggerContext } from './utils/logger';

// ============================================================================
// Types (All type exports)
// ============================================================================

export type {
  // Main SDK config
  AIReceptionistConfig,
  VoiceConfig,

  // Agent types (Six-Pillar Architecture)
  AgentConfiguration,
  AgentRequest,
  AgentResponse,
  AgentState,
  AgentStatus,

  // Identity Pillar
  Identity,
  IdentityConfig,

  // Personality Pillar
  PersonalityEngine,
  PersonalityConfig,
  PersonalityTrait,
  CommunicationStyleConfig,

  // Knowledge Pillar
  KnowledgeBase,
  KnowledgeConfig,
  LanguageConfig,


  // Memory Pillar
  Memory,
  MemoryConfig,
  ConversationHistory,
  ConversationHistoryMetadata,
  MemoryManager,
  MemoryStats,
  MemorySearchQuery,
  Message,
  IStorage,
  AgentToolCall,
  AgentToolResult,

  // Goals Pillar
  Goal,
  GoalConfig,
  GoalSystem,

  // Prompt System
  PromptContext,
  PromptSection,
  PromptExample,

  // Observability
  LogContext,
  Trace,
  TraceStep,
  InteractionMetrics,
  PerformanceMetrics,

  // Common
  Channel,

  // Tool system
  ITool,
  ToolHandlers,
  ToolHandler,
  ToolResult,
  ChannelResponse,
  ExecutionContext,
  ToolConfig,
  JSONSchema,

  // Conversation & Memory
  ToolCall,
  

  // Providers
  IProvider,
  TwilioConfig,
  AIModelConfig,
  GoogleConfig,
  ProviderConfig,

  // Email Providers
  BaseEmailConfig,
  ResendConfig,
  SendGridConfig,
  SMTPConfig,
  EmailProviderConfig,

  // Resources
  MakeCallOptions,
  SendSMSOptions,
  SendEmailOptions,
  CallSession,
  SMSSession,
  EmailSession,
  GenerateTextOptions,
  TextResponse,


  // Other
  CallOptions,
  SMSOptions,
  ChatOptions,
  AIResponse,
  CalendarEvent,
  NotificationConfig,
  AnalyticsConfig,
  CalendarToolConfig,
  BookingToolConfig,
  CRMToolConfig,
} from './types';
