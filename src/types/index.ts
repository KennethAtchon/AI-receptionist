/**
 * Core Type Definitions for AI Receptionist SDK
 */

// ============================================================================
// Provider Types
// ============================================================================

export interface IProvider {
  readonly name: string;
  readonly type: 'ai' | 'api' | 'email' | 'custom';
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
  /**
   * Optional version string for tool versioning
   * Format: "major.minor.patch" (e.g., "1.0.0")
   * @default "1.0.0"
   */
  version?: string;
}

export interface ToolHandlers {
  onCall?: ToolHandler;
  onSMS?: ToolHandler;
  onEmail?: ToolHandler;
  onText?: ToolHandler;
  default: ToolHandler;
}

export type ToolHandler = (params: any, context: ExecutionContext) => Promise<ToolResult>;

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
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
  properties?: Record<string, any>; // { name : { type: 'DATA_TYPE', description: 'READABLE_DESC'  } 
  required?: string[]; // [ name, desc, product] - which properties need to be passed in
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
  // Webhook configuration (Twilio-specific)
  webhookBaseUrl?: string; // Base URL for webhooks (e.g., 'https://your-app.com')
  voiceWebhookPath?: string; // Voice webhook path (e.g., '/webhooks/voice/inbound')
  smsWebhookPath?: string; // SMS webhook path (e.g., '/webhooks/sms/inbound')
  // Voice/TTS configuration (Twilio-specific)
  voice?: VoiceConfig;
}

// ============================================================================
// Email Provider Types
// ============================================================================

export type EmailContentMode = 'text' | 'html' | 'template';

export interface BaseEmailConfig {
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  priority?: number; // Lower = higher priority (1 = primary, 2 = fallback, etc.)
  tags?: string[]; // Route emails with these tags to this provider
  domains?: string[]; // Route emails to these domains to this provider
  archiveCc?: string | string[]; // CC address(es) for all outbound emails (for monitoring/archiving)
}

export interface PostmarkConfig extends BaseEmailConfig {
  apiKey: string;
  // Webhook secret for verifying inbound webhook signatures (optional)
  // Note: The webhook URL is configured in Postmark's dashboard, not here
  webhookSecret?: string;
}

// Email provider configuration - now only Postmark
export interface EmailProviderConfig {
  postmark?: PostmarkConfig;
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
  httpReferer?: string; // For OpenRouter: HTTP-Referer header (optional)
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
// Google Provider Types
// ============================================================================

/**
 * Service Account credentials for Google Calendar API
 * Used for server-to-server authentication
 */
export interface GoogleServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

/**
 * OAuth2 credentials for Google Calendar API
 * Used for user authentication with refresh tokens
 */
export interface GoogleOAuth2Credentials {
  client_id: string;
  client_secret: string;
  refresh_token?: string;
  redirect_uri?: string;
  access_token?: string;
  expiry_date?: number;
}

/**
 * Google Calendar API configuration
 * Supports authentication via Service Account, OAuth2, or API Key
 */
export interface GoogleConfig {
  /**
   * API Key for Google Calendar API (optional)
   * Note: API keys have limited functionality - use credentials for write operations
   * Either apiKey or credentials must be provided
   */
  apiKey?: string;
  
  /**
   * Calendar ID to use (e.g., 'primary' or email address)
   */
  calendarId: string;
  
  /**
   * Authentication credentials (optional)
   * Either Service Account or OAuth2 credentials
   * Either apiKey or credentials must be provided
   */
  credentials?: GoogleServiceAccountCredentials | GoogleOAuth2Credentials;
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
// Webhook Configuration
// ============================================================================

export interface WebhookConfig {
  baseUrl: string; // Consumer's base webhook URL (e.g., 'https://your-app.com')
  endpoints: {
    voice?: string; // Voice webhook endpoint path (e.g., '/webhooks/voice')
    sms?: string; // SMS webhook endpoint path (e.g., '/webhooks/sms')
    email?: string; // Email webhook endpoint path (e.g., '/webhooks/email')
  };
}

// ============================================================================
// Main SDK Configuration
// ============================================================================

export interface AIReceptionistConfig {
  // Core agent configuration (Six-Pillar Architecture)
  agent: {
    // Identity - Who the agent is (optional if customSystemPrompt is provided)
    identity?: AgentIdentityConfig;

    // Personality - How the agent behaves (optional, has defaults)
    personality?: AgentPersonalityConfig;

    // Knowledge - What the agent knows (optional, has defaults)
    knowledge?: AgentKnowledgeConfig;

    // Goals - What the agent aims to achieve (optional, has defaults)
    goals?: AgentGoalConfig;

    // Memory - What the agent remembers (optional, has defaults)
    memory?: AgentMemoryConfig;

    // Custom system prompt - Bypasses all SystemPromptBuilder features
    // WARNING: You are responsible for providing a complete, well-formatted system prompt
    customSystemPrompt?: string;
  };

  // AI model configuration
  model: AIModelConfig;

  // Tool configuration
  tools?: ToolConfig;

  // Provider configuration
  providers?: ProviderConfig;

  // Optional features
  debug?: boolean;

  // Logger configuration
  logger?: LoggerConfig;
}

// ============================================================================
// Logger Configuration
// ============================================================================

export interface LoggerConfig {
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';
  prefix?: string;
  enableTimestamps?: boolean;
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
  provider?: string; // Force specific provider (currently only 'postmark' is supported)
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
// Email Types (Extended)
// ============================================================================

export type {
  EmailAttachment,
  InboundEmailPayload,
  EmailWebhookOptions,
  EmailWebhookResult,
  StoreOutboundEmailOptions,
  BulkEmailMessage,
  BulkEmailResult,
  BulkEmailOptions
} from './email.types';

// ============================================================================
// SMS Types
// ============================================================================

export type {
  InboundSMSPayload,
  SMSMedia,
  OutboundSMSOptions,
  SMSSessionMetadata,
  SMSAutoReplyReport
} from './sms.types';

// ============================================================================
// Voice Types
// ============================================================================

export type {
  InboundCallPayload,
  CallStatus,
  OutboundCallOptions,
  CallSessionMetadata,
  CallOutcome,
  MediaStreamEvent,
  TwiMLConfig,
  VoiceType,
  SpamDetectionReport,
  IVRMenu,
  IVROption,
  IVRAction
} from './voice.types';

// ============================================================================
// Processor Types (Deprecated - Using Agent/Tool system instead)
// ============================================================================

// Note: Processors have been replaced by the Agent + Tool architecture
// These types are kept for backward compatibility but are not actively used
