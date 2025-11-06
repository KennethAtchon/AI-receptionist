/**
 * Core type definitions for the Agent system
 *
 * This file contains all type definitions for the six core pillars:
 * 1. Identity
 * 2. Personality
 * 3. Knowledge
 * 4. Capabilities
 * 5. Memory
 * 6. Goals
 */

// ==================== CORE TYPES ====================

export type Channel = 'call' | 'sms' | 'email' | 'text';

export enum AgentStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  DISPOSED = 'DISPOSED'
}

// ==================== IDENTITY ====================

export interface IdentityConfig {
  name: string;
  role: string;
  title?: string;
  backstory?: string;
  department?: string;
  reportsTo?: string;
  authorityLevel?: 'low' | 'medium' | 'high';
  escalationRules?: string[];
  yearsOfExperience?: number;
  specializations?: string[];
  certifications?: string[];
}

export interface Identity {
  name: string;
  role: string;
  title: string;
  backstory: string;
  department?: string;
  reportsTo?: string;
  authorityLevel: 'low' | 'medium' | 'high';
  escalationRules: string[];
  yearsOfExperience: number;
  specializations: string[];
  certifications: string[];
  summary(): string;
  toJSON(): Record<string, unknown>;
  getDescription(): string;
  updateName(name: string): void;
  updateRole(role: string): void;
  updateTitle(title: string): void;
  updateBackstory(backstory: string): void;
  updateDepartment(department: string): void;
  updateReportsTo(reportsTo: string): void;
  setAuthorityLevel(level: 'low' | 'medium' | 'high'): void;
  addEscalationRule(rule: string): void;
  removeEscalationRule(rule: string): void;
  setYearsOfExperience(years: number): void;
  addSpecialization(specialization: string): void;
  removeSpecialization(specialization: string): void;
  addCertification(certification: string): void;
  removeCertification(certification: string): void;
}

// ==================== PERSONALITY ====================

export interface PersonalityTrait {
  name: string;
  description: string;
  weight?: number;
}

export interface CommunicationStyleConfig {
  primary: 'consultative' | 'assertive' | 'empathetic' | 'analytical' | 'casual';
  tone?: 'formal' | 'friendly' | 'professional' | 'casual';
  formalityLevel?: number; // 1-10
}

export interface PersonalityConfig {
  traits?: string[] | PersonalityTrait[];
  communicationStyle?: string | CommunicationStyleConfig;
  emotionalIntelligence?: 'low' | 'medium' | 'high';
  adaptability?: 'low' | 'medium' | 'high';
  conflictStyle?: string;
  decisionStyle?: string;
  stressResponse?: string;
  adaptabilityRules?: string[];
}

export interface PersonalityEngine {
  traits: PersonalityTrait[];
  communicationStyle: CommunicationStyleConfig;
  tone: string;
  formalityLevel: number;
  emotionalIntelligence: 'low' | 'medium' | 'high';
  adaptability: 'low' | 'medium' | 'high';
  conflictStyle: string;
  decisionStyle: string;
  stressResponse: string;
  adaptabilityRules: string[];
  getErrorMessage(channel: Channel): string;
  getDescription(): string;
  toJSON(): Record<string, unknown>;
  addTrait(trait: string | PersonalityTrait): void;
  removeTrait(traitName: string): void;
  updateTrait(traitName: string, updates: Partial<PersonalityTrait>): void;
  updateCommunicationStyle(style: Partial<CommunicationStyleConfig>): void;
  setFormalityLevel(level: number): void;
}

// ==================== KNOWLEDGE ====================

export interface LanguageConfig {
  fluent?: string[];
  conversational?: string[];
}

export interface KnowledgeConfig {
  domain: string;
  expertise?: string[];
  languages?: string[] | LanguageConfig;
  industries?: string[];
  knownDomains?: string[];
  limitations?: string[];
  uncertaintyThreshold?: string;
}

export interface KnowledgeBase {
  domain: string;
  expertise: string[];
  languages: LanguageConfig;
  industries: string[];
  knownDomains: string[];
  limitations: string[];
  uncertaintyThreshold: string;
  load(): Promise<void>;
  dispose(): Promise<void>;
  toJSON(): Record<string, unknown>;
  getDescription(): string;
  hasKnowledge(domain: string): boolean;
  isLimitedKnowledge(topic: string): boolean;
  updateDomain(domain: string): void;
  addExpertise(area: string): void;
  removeExpertise(area: string): void;
  addLanguage(language: string, proficiency?: 'fluent' | 'conversational'): void;
  removeLanguage(language: string): void;
  addIndustry(industry: string): void;
  removeIndustry(industry: string): void;
  addKnownDomain(domain: string): void;
  removeKnownDomain(domain: string): void;
  addLimitation(limitation: string): void;
  removeLimitation(limitation: string): void;
  updateUncertaintyThreshold(threshold: string): void;
}

// ==================== CAPABILITIES ====================

export interface SkillDefinition {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
  prerequisites?: string[];
}


// ==================== MEMORY ====================

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: Date;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Memory {
  // Core fields
  id: string;
  content: string;
  timestamp: Date;
  type: 'conversation' | 'decision' | 'error' | 'tool_execution' | 'system';
  importance?: number; // 1-10, determines if saved to long-term

  // Channel tracking
  channel?: Channel;

  // Session metadata
  sessionMetadata?: {
    conversationId?: string;
    callSid?: string;
    messageSid?: string;
    emailId?: string;
    threadId?: string; // Email thread tracking
    threadRoot?: string; // First message ID in the email thread
    inReplyTo?: string; // Parent email ID
    references?: string; // Full email thread references chain
    direction?: 'inbound' | 'outbound'; // Email/message direction
    to?: string; // Recipient (for emails/SMS)
    from?: string; // Sender (for emails/SMS)
    subject?: string; // Email subject
    status?: 'active' | 'completed' | 'failed';
    duration?: number; // For calls
    participants?: string[]; // Phone numbers, emails, etc.
    attachments?: Array<{ // Email/MMS attachments
      name: string;
      contentType: string;
      contentLength: number;
      contentId?: string;
    }>;
  };

  // Role tracking (like messages)
  role?: 'system' | 'user' | 'assistant' | 'tool';

  // Tool execution tracking
  toolCall?: ToolCall;
  toolResult?: ToolResult;

  // Additional metadata
  metadata?: Record<string, unknown>;
  goalAchieved?: boolean;
}

export interface ConversationHistory {
  messages: Message[];
  contextMessages?: Message[];
  metadata: ConversationHistoryMetadata;
}

export interface ConversationHistoryMetadata {
  conversationId?: string;
  messageCount: number;
  oldestMessageTimestamp?: Date;
  newestMessageTimestamp?: Date;
  hasLongTermContext: boolean;
}

export interface MemorySearchQuery {
  // Full-text search
  keywords?: string[];

  // Filter by type
  type?: Memory['type'] | Memory['type'][];

  // Filter by channel
  channel?: Channel;

  // Filter by conversation
  conversationId?: string;

  // Filter by sessionMetadata fields (JSONB query)
  sessionMetadata?: Record<string, any>;

  // Filter by date range
  startDate?: Date;
  endDate?: Date;

  // Filter by importance
  minImportance?: number;

  // Filter by role
  role?: 'system' | 'user' | 'assistant' | 'tool';

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  orderBy?: 'timestamp' | 'importance';
  orderDirection?: 'asc' | 'desc';
}

export interface IStorage {
  /**
   * Save a memory to persistent storage
   */
  save(memory: Memory): Promise<void>;

  /**
   * Save multiple memories in batch
   */
  saveBatch(memories: Memory[]): Promise<void>;

  /**
   * Get a specific memory by ID
   */
  get(id: string): Promise<Memory | null>;

  /**
   * Search memories with flexible query
   */
  search(query: MemorySearchQuery): Promise<Memory[]>;

  /**
   * Delete a memory
   */
  delete(id: string): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

export interface MemoryConfig {
  // Short-term config
  contextWindow?: number; // Default: 20 messages

  // Long-term config
  longTermEnabled?: boolean;
  longTermStorage?: IStorage; // Generic storage interface (per-agent, legacy)
  sharedLongTermMemory?: any; // Shared LongTermMemory instance (factory pattern) - `any` to avoid circular dependency

  // Auto-persistence rules
  autoPersist?: {
    minImportance?: number; // Auto-save if importance >= this
    types?: Memory['type'][]; // Auto-save these types
  };
}

export interface MemoryStats {
  shortTermCount: number;
  longTermCount: number;
}

export interface MemoryManager {
  retrieve(input: string, context?: {
    conversationId?: string;
    channel?: Channel;
  }): Promise<ConversationHistory>;
  store(memory: Memory): Promise<void>;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  getStats(): MemoryStats;
  getConversationHistory(conversationId: string): Promise<Memory[]>;
  getChannelHistory(channel: Channel, options?: {
    limit?: number;
    conversationId?: string;
  }): Promise<Memory[]>;
  search(query: MemorySearchQuery): Promise<Memory[]>;
  startSession(session: {
    conversationId: string;
    channel: Channel;
    metadata?: Record<string, any>;
  }): Promise<void>;
  endSession(conversationId: string, summary?: string): Promise<void>;
  getConversationByCallId(callSid: string): Promise<Memory | null>;
  getConversationByMessageId(messageSid: string): Promise<Memory | null>;
  attachCallSid(conversationId: string, callSid: string): Promise<void>;
  attachMessageSid(conversationId: string, messageSid: string): Promise<void>;
  clearShortTerm(): void;
  clearLongTerm(): void;
}

// ==================== GOALS ====================

export interface GoalConfig {
  primary: string;
  secondary?: string[];
  constraints?: string[];
  metrics?: Record<string, string>;
}

export interface Goal {
  name: string;
  description: string;
  type: 'primary' | 'secondary';
  priority: number;
  metric?: string;
  constraints: string[];
  completed?: boolean;
  completedAt?: Date;
  completionCriteria?: string;
}

export interface GoalSystem {
  getCurrent(): Goal[];
  getPrimary(): Goal | undefined;
  getSecondary(): Goal[];
  getCompleted(): Goal[];
  getIncomplete(): Goal[];
  getDescription(): string;
  getProgressStats(): {
    totalInteractions: number;
    goalContributions: Record<string, number>;
    completedGoals: number;
    totalGoals: number;
  };
  trackProgress(request: AgentRequest, response: AgentResponse): Promise<void>;
  markGoalCompleted(name: string, completionCriteria?: string): boolean;
  markGoalIncomplete(name: string): boolean;
  isGoalCompleted(name: string): boolean;
  toJSON(): Record<string, unknown>;
  addGoal(goal: Goal): void;
  removeGoal(name: string): boolean;
  updateGoal(name: string, updates: Partial<Goal>): boolean;
}

// ==================== AGENT REQUEST/RESPONSE ====================

export interface AgentRequest {
  id: string;
  input: string;
  channel: Channel;
  context: {
    conversationId: string;
    leadSource?: string;
    industry?: string;
    [key: string]: any;
  };
}

export interface AgentResponse {
  content: string;
  channel: Channel;
  metadata?: {
    confidence?: number;
    recoveredFromError?: boolean;
    error?: boolean;
    [key: string]: any;
  };
}

// ==================== AGENT CONFIGURATION ====================

export interface AgentConfiguration {
  identity?: IdentityConfig; // Optional if customSystemPrompt is provided
  personality?: PersonalityConfig;
  knowledge?: KnowledgeConfig;
  memory?: MemoryConfig;
  goals?: GoalConfig;
  tools?: any[];
  aiProvider: any; // IAIProvider
  customSystemPrompt?: string; // Optional: Bypass SystemPromptBuilder and use raw custom prompt
}

export interface AgentState {
  status: AgentStatus;
  identity: Record<string, unknown>;
  currentGoals: Goal[];
  memoryStats: MemoryStats;
}

// ==================== PROMPT BUILDING ====================

export interface PromptSection {
  name: string;
  priority?: number;
  content: string;
}

export interface PromptContext {
  identity?: Identity;
  personality?: PersonalityEngine;
  knowledge?: KnowledgeBase;
  goals?: Goal[];
  channel?: Channel;
  maxTokens?: number;
  policies?: PolicyRule[];
  escalationRules?: string[];
  examples?: PromptExample[];
  // Business context injection points for domain-specific data
  businessContext?: {
    companyInfo?: string;      // Formatted company information
    leadInfo?: string;          // Formatted lead/customer information
    additionalContext?: string; // Any other contextual data (e.g., booking availability, pricing)
  };
}

export interface PromptExample {
  scenario: string;
  input: string;
  reasoning: string;
  response: string;
  explanation: string[];
}

export interface PolicyRule {
  name: string;
  rule: string;
}

// ==================== TOKENIZATION ====================

export interface ITokenizer {
  count(text: string): Promise<number>;
}

// ==================== STORAGE INTERFACES ====================


export interface Understanding {
  input: string;
  entities?: any[];
  intent?: string;
  embeddings?: number[];
}
