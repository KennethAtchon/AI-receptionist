/**
 * Core Type Definitions for AI Receptionist SDK
 */

// ============================================================================
// Provider Types
// ============================================================================

export interface IProvider {
  readonly name: string;
  readonly type: 'communication' | 'ai' | 'calendar' | 'crm' | 'storage' | 'custom';
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  name: string;
  role: string;
  personality?: string;
  systemPrompt?: string;
  instructions?: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  voice?: VoiceConfig;
}

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
  channel: 'call' | 'sms' | 'email';
  conversationId: string;
  callSid?: string;
  messageSid?: string;
  metadata?: Record<string, any>;
  agent: AgentConfig;
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
  channel: 'call' | 'sms' | 'email';
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

export interface IConversationStore {
  save(conversation: Conversation): Promise<void>;
  get(conversationId: string): Promise<Conversation | null>;
  getByCallId(callSid: string): Promise<Conversation | null>;
  getByMessageId(messageSid: string): Promise<Conversation | null>;
  update(conversationId: string, updates: Partial<Conversation>): Promise<void>;
  delete(conversationId: string): Promise<void>;
  list(filters?: ConversationFilters): Promise<Conversation[]>;
}

export interface ConversationFilters {
  channel?: 'call' | 'sms' | 'email';
  status?: 'active' | 'completed' | 'failed';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// ============================================================================
// Communication Provider Types
// ============================================================================

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export interface CallOptions {
  webhookUrl: string;
  statusCallback?: string;
  aiConfig?: any;
}

export interface SMSOptions {
  statusCallback?: string;
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
  conversationHistory?: ConversationMessage[];
  availableTools?: ITool[];
  toolResults?: ToolResult[];
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

export interface GoogleCalendarConfig {
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
  // Core agent configuration
  agent: AgentConfig;

  // AI model configuration
  model: AIModelConfig;

  // Tool configuration
  tools?: ToolConfig;

  // Provider configuration
  providers: ProviderConfig;

  // Optional features
  conversationStore?: IConversationStore;
  notifications?: NotificationConfig;
  analytics?: AnalyticsConfig;
  debug?: boolean;

  // Event callbacks
  onToolExecute?: (event: ToolExecutionEvent) => void;
  onToolError?: (event: ToolErrorEvent) => void;
  onConversationStart?: (event: ConversationEvent) => void;
  onConversationEnd?: (event: ConversationEvent) => void;
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
    sendgrid?: SendGridConfig;
  };
  calendar?: {
    google?: GoogleCalendarConfig;
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

export interface ToolExecutionEvent {
  toolName: string;
  parameters: any;
  result: ToolResult;
  duration: number;
  timestamp: Date;
}

export interface ToolErrorEvent {
  toolName: string;
  parameters: any;
  error: Error;
  timestamp: Date;
}

export interface ConversationEvent {
  conversationId: string;
  channel: 'call' | 'sms' | 'email';
  timestamp: Date;
  metadata?: Record<string, any>;
}

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
  metadata?: Record<string, any>;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  metadata?: Record<string, any>;
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
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
}
