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

export type Channel = 'call' | 'sms' | 'email';

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
  toJSON(): Record<string, unknown>;
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
  certifications?: string[];
  industries?: string[];
  knownDomains?: string[];
  limitations?: string[];
  uncertaintyThreshold?: string;
}

export interface KnowledgeBase {
  domain: string;
  expertise: string[];
  languages: LanguageConfig;
  certifications: string[];
  industries: string[];
  knownDomains: string[];
  limitations: string[];
  uncertaintyThreshold: string;
  load(): Promise<void>;
  dispose(): Promise<void>;
  toJSON(): Record<string, unknown>;
}

// ==================== CAPABILITIES ====================

export interface SkillDefinition {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
  prerequisites?: string[];
}

export interface Skill {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
  prerequisites?: string[];
}

export interface Capability {
  name: string;
  description: string;
  skills: Skill[];
  tools: any[]; // ITool[] from your tool system
  supportedChannels: Channel[];
}

export interface CapabilityConfig {
  name: string;
  description: string;
  skills?: SkillDefinition[];
  tools?: any[];
  supportedChannels?: Channel[];
}

export interface CapabilityManager {
  register(capability: Capability): void;
  has(capabilityName: string): boolean;
  getTools(channel: Channel): any[];
  list(): string[];
  count(): number;
  execute(skillName: string, params: any): Promise<any>;
  initialize(): Promise<void>;
}

// ==================== MEMORY ====================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface Memory {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  importance?: number;
  type?: 'conversation' | 'decision' | 'error' | 'fact';
  goalAchieved?: boolean;
}

export interface MemoryContext {
  shortTerm?: Message[];
  longTerm?: Memory[];
  semantic?: Memory[];
}

export interface MemoryConfig {
  type?: 'simple' | 'vector';
  contextWindow?: number;
  longTermEnabled?: boolean;
  longTermStorage?: any; // IConversationStore
  vectorEnabled?: boolean;
  vectorStore?: any; // IVectorStore
}

export interface MemoryStats {
  shortTermCount: number;
  longTermCount: number;
  semanticCount: number;
}

export interface MemoryManager {
  retrieve(input: string): Promise<MemoryContext>;
  store(memory: Memory): Promise<void>;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  getStats(): MemoryStats;
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
}

export interface GoalSystem {
  getCurrent(): Goal[];
  trackProgress(request: AgentRequest, response: AgentResponse): Promise<void>;
  toJSON(): Record<string, unknown>;
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
  identity: IdentityConfig;
  personality?: PersonalityConfig;
  knowledge?: KnowledgeConfig;
  capabilities?: string[] | CapabilityConfig[];
  memory?: MemoryConfig;
  goals?: GoalConfig;
  tools?: any[];
  aiProvider: any; // IAIProvider
  observability?: ObservabilityConfig;
}

export interface AgentState {
  status: AgentStatus;
  identity: Record<string, unknown>;
  currentGoals: Goal[];
  memoryStats: MemoryStats;
  capabilityCount: number;
  performance?: PerformanceMetrics;
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
  capabilities?: string[];
  memoryContext?: MemoryContext;
  channel?: Channel;
  maxTokens?: number;
  policies?: PolicyRule[];
  escalationRules?: string[];
  examples?: PromptExample[];
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

// ==================== OBSERVABILITY ====================

export interface ObservabilityConfig {
  loggingEnabled?: boolean;
  tracingEnabled?: boolean;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export interface LogContext {
  agentId: string;
  agentName: string;
  version: string;
}

export interface TraceStep {
  step: string;
  data: any;
  timestamp: number;
  duration?: number;
}

export interface Trace {
  id: string;
  steps: TraceStep[];
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface InteractionMetrics {
  duration?: number;
  stepCount?: number;
  memoryRetrievalTime?: number;
  aiResponseTime?: number;
  toolExecutionTime?: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  totalInteractions: number;
}

// ==================== ERROR HANDLING ====================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  onOpen?: () => void;
  onClose?: () => void;
}

// ==================== SPECIALIZATION ====================

export interface Specialization {
  domain: string;
  additionalInstructions: string;
  defaultCapabilities: string[];
  requiredKnowledge: string[];
  complianceRequirements?: string[];
}

// ==================== TOKENIZATION ====================

export interface ITokenizer {
  count(text: string): Promise<number>;
}

// ==================== STORAGE INTERFACES ====================

export interface IConversationStore {
  save(data: any): Promise<void>;
  search(query: any): Promise<Memory[]>;
}

export interface IVectorStore {
  upsert(data: { id: string; vector: number[]; metadata: any }): Promise<void>;
  query(params: { vector: number[]; topK: number; threshold: number }): Promise<any[]>;
}

export interface SearchOptions {
  limit: number;
  threshold: number;
}

export interface Understanding {
  input: string;
  entities?: any[];
  intent?: string;
  embeddings?: number[];
}
