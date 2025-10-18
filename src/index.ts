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
// Resources (User-facing API)
// ============================================================================

export { CallsResource } from './resources/calls.resource';
export { SMSResource } from './resources/sms.resource';
export { EmailResource } from './resources/email.resource';

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
// Types (All type exports)
// ============================================================================

export type {
  // Main SDK config
  AIReceptionistConfig,

  // Agent config
  AgentConfig,
  VoiceConfig,

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
