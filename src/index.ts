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
// Agent System (Six-Pillar Architecture)
// ============================================================================

export { Agent } from './agent/core/Agent';
export { AgentBuilder } from './agent/core/AgentBuilder';
export { Capability } from './agent/capabilities/Capability';
export { Skill } from './agent/capabilities/Skill';
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

export { TwilioProvider } from './providers/communication/twilio.provider';
export { OpenAIProvider } from './providers/ai/openai.provider';
export { OpenRouterProvider, OPENROUTER_MODELS } from './providers/ai/openrouter.provider';
export { GoogleCalendarProvider } from './providers/calendar/google-calendar.provider';

// ============================================================================
// Services (Business Logic Layer)
// ============================================================================

export { ConversationService } from './services/conversation.service';
export { ToolExecutionService } from './services/tool-execution.service';
export { CallService } from './services/call.service';

// ============================================================================
// Storage
// ============================================================================

export { InMemoryConversationStore } from './storage/in-memory-conversation.store';

// ============================================================================
// Adapters (Protocol Adapters)
// ============================================================================

export { MCPAdapter, MCPServer } from './adapters/mcp';
export type {
  MCPTool,
  MCPToolListResponse,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPContent,
  MCPContentType,
  MCPServerConfig,
  MCPAdapterOptions
} from './adapters/mcp';

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

  // Capabilities Pillar
  Capability as ICapability,
  CapabilityConfig,
  CapabilityManager,
  Skill as ISkill,
  SkillDefinition,

  // Memory Pillar
  Memory,
  MemoryConfig,
  MemoryContext,
  MemoryManager,
  MemoryStats,
  Message,

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
  Conversation,
  ConversationMessage,
  ToolCall,
  IConversationStore,
  ConversationFilters,

  // Providers
  IProvider,
  TwilioConfig,
  SendGridConfig,
  AIModelConfig,
  GoogleCalendarConfig,
  ProviderConfig,

  // Resources
  MakeCallOptions,
  SendSMSOptions,
  SendEmailOptions,
  CallSession,
  SMSSession,
  EmailSession,
  GenerateTextOptions,
  TextResponse,

  // Events
  ToolExecutionEvent,
  ToolErrorEvent,
  ConversationEvent,

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
