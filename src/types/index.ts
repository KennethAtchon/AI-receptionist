/**
 * Core Type Definitions for AI Receptionist SDK
 */

// ============================================================================
// Provider Types
// ============================================================================

export interface IProvider {
  readonly name: string;
  readonly type: 'communication' | 'ai' | 'api' | 'calendar' | 'crm' | 'storage' | 'email' | 'custom';
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// Agent Configuration (Six-Pillar Architecture)
// ============================================================================

// Import types that we need to use in this file
import type {
  IdentityConfig as AgentIdentityConfig,
  PersonalityConfig as AgentPersonalityConfig,
  KnowledgeConfig as AgentKnowledgeConfig,
  GoalConfig as AgentGoalConfig,
  MemoryConfig as AgentMemoryConfig,
  Channel
} from '../agent/types';

// Re-export agent enums (as values, not types)
export { AgentStatus } from '../agent/types';

// Re-export all agent types from the agent module
export type {
  // Core Agent Types
  AgentConfiguration,
  AgentRequest,
  AgentResponse,
  AgentState,

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
  ToolCall as AgentToolCall,
  ToolResult as AgentToolResult,

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
  Channel
} from '../agent/types';

// Voice configuration for TTS
export interface VoiceConfig {
  provider?: 'elevenlabs' | 'google' | 'amazon';
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

// ============================================================================
// Tool System Types
// ============================================================================

export interface ITool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handlers: ToolHandlers;
}

export interface ToolHandlers {
  onCall?: ToolHandler;
  onSMS?: ToolHandler;
  onEmail?: ToolHandler;
  onText?: ToolHandler;
  default: ToolHandler;
}

export type ToolHandler = (params: any, context: ExecutionContext) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  response: ChannelResponse;
}

export interface ChannelResponse {
  speak?: string;      // For voice calls
  message?: string;    // For SMS
  html?: string;       // For email
  text?: string;       // Plain text fallback
  attachments?: any[]; // For email attachments
}

export interface ExecutionContext {
  channel: Channel;
  conversationId: string;
  callSid?: string;
  messageSid?: string;
  metadata?: Record<string, any>;
  // Reference to the agent (will be set by the system)
  agentId?: string;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

// ============================================================================
// Conversation & Memory Types 
// ============================================================================

export interface Conversation {
  id: string;
  channel: Channel;
  messages: ConversationMessage[];
  metadata?: Record<string, any>;
  status: 'active' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  callSid?: string;
  messageSid?: string;
}


export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

// (Removed IConversationStore and ConversationFilters in favor of memory-centric APIs)

// ============================================================================
// Communication Provider Types
// ============================================================================

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

// ============================================================================
// Email Provider Types
// ============================================================================

export interface BaseEmailConfig {
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  priority?: number; // Lower = higher priority (1 = primary, 2 = fallback, etc.)
  tags?: string[]; // Route emails with these tags to this provider
  domains?: string[]; // Route emails to these domains to this provider
}

export interface ResendConfig extends BaseEmailConfig {
  apiKey: string;
}

export interface SendGridConfig extends BaseEmailConfig {
  apiKey: string;
}

export interface SMTPConfig extends BaseEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  options?: Record<string, any>;
}

// Email provider configuration (supports multiple providers)
export interface EmailProviderConfig {
  resend?: ResendConfig;
  sendgrid?: SendGridConfig;
  smtp?: SMTPConfig;
}

export interface CallOptions {
  webhookUrl: string;
  statusCallback?: string;
  from?: string; // Override default number
  timeout?: number;
  aiConfig?: any;
}

export interface SMSOptions {
  statusCallback?: string;
  from?: string; // Override default number
}

// ============================================================================
// AI Provider Types
// ============================================================================

export interface AIModelConfig {
  provider: 'openai' | 'openrouter' | 'anthropic' | 'google';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatOptions {
  conversationId: string;
  userMessage: string;
  conversationHistory?: import('../agent/types').Message[];
  availableTools?: ITool[];
  toolResults?: ToolResult[];
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'tool_calls' | 'length';
}

/**
 * Interface that all AI providers must implement
 */
export interface IAIProvider extends IProvider {
  chat(options: ChatOptions): Promise<AIResponse>;
}

// ============================================================================
// Calendar Provider Types
// ============================================================================

export interface GoogleConfig {
  apiKey: string;
  calendarId: string;
  credentials?: any;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees?: string[];
}

// ============================================================================
// Main SDK Configuration
// ============================================================================

export interface AIReceptionistConfig {
  // Core agent configuration (Six-Pillar Architecture)
  agent: {
    // Identity - Who the agent is
    identity: AgentIdentityConfig;

    // Personality - How the agent behaves (optional, has defaults)
    personality?: AgentPersonalityConfig;

    // Knowledge - What the agent knows (optional, has defaults)
    knowledge?: AgentKnowledgeConfig;

    // Goals - What the agent aims to achieve (optional, has defaults)
    goals?: AgentGoalConfig;

    // Memory - What the agent remembers (optional, has defaults)
    memory?: AgentMemoryConfig;

    // Voice configuration for TTS (optional)
    voice?: VoiceConfig;
  };

  // AI model configuration
  model: AIModelConfig;

  // Tool configuration
  tools?: ToolConfig;

  // Provider configuration
  providers?: ProviderConfig;

  // Optional features
  notifications?: NotificationConfig;
  analytics?: AnalyticsConfig;
  debug?: boolean;

}

export interface ToolConfig {
  defaults?: ('calendar' | 'booking' | 'crm')[];
  custom?: ITool[];
  calendar?: CalendarToolConfig;
  booking?: BookingToolConfig;
  crm?: CRMToolConfig;
}

export interface CalendarToolConfig {
  provider: 'google' | 'microsoft' | 'apple';
  apiKey: string;
  calendarId?: string;
  credentials?: any;
}

export interface BookingToolConfig {
  apiUrl: string;
  apiKey: string;
}

export interface CRMToolConfig {
  provider: 'salesforce' | 'hubspot' | 'pipedrive';
  apiKey: string;
  credentials?: any;
}

export interface ProviderConfig {
  communication?: {
    twilio?: TwilioConfig;
  };
  email?: EmailProviderConfig;
  calendar?: {
    google?: GoogleConfig;
  };
  custom?: IProvider[];
}

export interface NotificationConfig {
  email?: string;
  webhook?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  provider?: 'mixpanel' | 'segment' | 'custom';
  apiKey?: string;
}

// ============================================================================
// Event Types
// ============================================================================



// ============================================================================
// Resource Types (User-facing API)
// ============================================================================

export interface MakeCallOptions {
  to: string;
  metadata?: Record<string, any>;
}

export interface SendSMSOptions {
  to: string;
  body: string;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  metadata?: Record<string, any>;
  provider?: string; // Force specific provider (e.g., 'resend', 'sendgrid', 'smtp')
  tags?: string[]; // Tags for provider routing
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

// AI-powered email generation options
export interface GenerateEmailOptions {
  prompt: string;
  conversationId?: string;
  to?: string; // Optional: AI can extract from conversation
  subject?: string; // Optional: AI can generate
  tone?: 'professional' | 'friendly' | 'casual' | 'formal';
  maxLength?: 'short' | 'medium' | 'long';
  metadata?: Record<string, any>;
  autoSend?: boolean; // Default: true
}

// AI email draft (doesn't send)
export interface DraftEmailOptions {
  prompt: string;
  conversationId?: string;
  to?: string;
  subject?: string;
  tone?: 'professional' | 'friendly' | 'casual' | 'formal';
  maxLength?: 'short' | 'medium' | 'long';
  includeHistory?: boolean; // Include conversation context
}

// Email draft result
export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  html?: string;
  metadata?: {
    generatedBy: 'ai';
    conversationId?: string;
    confidence?: number;
    reasoning?: string;
  };
}

export interface CallSession {
  id: string;
  conversationId: string;
  to: string;
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  endedAt?: Date;
}

export interface SMSSession {
  id: string;
  conversationId: string;
  to: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
}

export interface EmailSession {
  id: string;
  conversationId: string;
  to: string;
  from?: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  threadId?: string; // For tracking email threads
  inReplyTo?: string; // Parent email ID
  direction?: 'inbound' | 'outbound'; // Track incoming vs outgoing
  aiGenerated?: boolean; // Was this email AI-generated?
}

export interface GenerateTextOptions {
  prompt: string;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface TextResponse {
  text: string;
  metadata?: {
    timestamp: Date;
    conversationId: string;
    [key: string]: any;
  };
}

// ============================================================================
// Processor Types
// ============================================================================

export type {
  IProcessor,
  ProcessorResponse,
  AIConsultationParams,
  BookingResult,
  MessagingResult,
  ProcessUserSpeechParams,
  InitiateCallParams,
  FindAndBookParams,
  SendMessageParams
} from '../processors';
