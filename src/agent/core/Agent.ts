/**
 * Agent - The core intelligent agent class
 *
 * An Agent is a self-contained, intelligent entity built on the Six Pillars:
 * 1. Identity: Who they are
 * 2. Personality: How they behave
 * 3. Knowledge: What they know
 * 4. Capabilities: What they can do
 * 5. Memory: What they remember
 * 6. Goals: What they aim to achieve
 *
 * IMPORTANT: We do NOT include explicit Reasoning or Planning engines.
 * Modern AI providers handle this natively through their training.
 */

import type {
  AgentConfiguration,
  AgentRequest,
  AgentResponse,
  AgentState,
  Identity,
  PersonalityEngine,
  KnowledgeBase,
  CapabilityManager,
  MemoryManager,
  GoalSystem,
  MemoryContext,
  PerformanceMetrics
} from '../types';

import { AgentStatus } from '../types';

import { IdentityImpl } from '../identity/Identity';
import { PersonalityEngineImpl } from '../personality/PersonalityEngine';
import { KnowledgeBaseImpl } from '../knowledge/KnowledgeBase';
import { CapabilityManagerImpl } from '../capabilities/CapabilityManager';
import { MemoryManagerImpl } from '../memory/MemoryManager';
import { GoalSystemImpl } from '../goals/GoalSystem';
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { AgentLogger } from '../observability/AgentLogger';
import { InteractionTracer } from '../observability/InteractionTracer';
import { AgentBuilder } from './AgentBuilder';

export class Agent {
  // ==================== CORE COMPONENTS (The 6 Pillars) ====================
  private readonly identity: Identity;
  private readonly personality: PersonalityEngine;
  private readonly knowledge: KnowledgeBase;
  private readonly capabilities: CapabilityManager;
  private readonly memory: MemoryManager;
  private readonly goals: GoalSystem;

  // ==================== SUPPORTING SYSTEMS ====================
  private readonly promptBuilder: SystemPromptBuilder;

  // ==================== STATE ====================
  private state: AgentStatus;
  private performanceMetrics: PerformanceMetrics;

  // ==================== EXTERNAL DEPENDENCIES ====================
  private aiProvider: any; // IAIProvider
  private toolExecutor: any; // ToolExecutionService
  private conversationService?: any; // ConversationService

  // ==================== OBSERVABILITY ====================
  private readonly logger: AgentLogger;
  private readonly tracer: InteractionTracer;

  /**
   * Private constructor - use Agent.builder() to create instances
   */
  private constructor(config: AgentConfiguration) {
    // Initialize identity
    this.identity = new IdentityImpl(config.identity);

    // Initialize personality
    this.personality = new PersonalityEngineImpl(config.personality || {});

    // Initialize knowledge base
    this.knowledge = new KnowledgeBaseImpl(config.knowledge || { domain: 'general' });

    // Initialize capabilities
    this.capabilities = new CapabilityManagerImpl();

    // Initialize memory
    this.memory = new MemoryManagerImpl(config.memory || {});

    // Initialize goals
    this.goals = new GoalSystemImpl(config.goals || { primary: 'Assist users effectively' });

    // Initialize prompt builder
    this.promptBuilder = new SystemPromptBuilder();

    // Initialize observability
    const agentId = `agent-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.logger = new AgentLogger(agentId, this.identity.name);
    this.tracer = new InteractionTracer();

    // Set external dependencies
    this.aiProvider = config.aiProvider;

    // Initialize state
    this.state = AgentStatus.INITIALIZING;
    this.performanceMetrics = {
      averageResponseTime: 0,
      successRate: 0,
      errorRate: 0,
      totalInteractions: 0
    };
  }

  /**
   * Create an agent using the builder pattern
   */
  public static builder(): AgentBuilder {
    return new AgentBuilder();
  }

  /**
   * Initialize the agent and all its subsystems
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing agent', { identity: this.identity.summary() });

    try {
      // Initialize memory systems
      await this.memory.initialize();

      // Load knowledge base
      await this.knowledge.load();

      // Initialize capabilities
      await this.capabilities.initialize();

      // Build initial system prompt
      await this.rebuildSystemPrompt();

      this.state = AgentStatus.READY;
      this.logger.info('Agent initialized successfully');
    } catch (error) {
      this.state = AgentStatus.ERROR;
      this.logger.error('Failed to initialize agent', { error });
      throw error;
    }
  }

  /**
   * Process input and generate response
   */
  public async process(request: AgentRequest): Promise<AgentResponse> {
    const interactionId = request.id;
    this.tracer.startInteraction(interactionId);
    this.state = AgentStatus.PROCESSING;

    const startTime = Date.now();

    try {
      // 1. Retrieve relevant context from memory
      const memoryContext = await this.memory.retrieve(request.input);
      this.tracer.log('memory_retrieval', memoryContext);

      // 2. Build context-aware system prompt
      const systemPrompt = await this.promptBuilder.build({
        identity: this.identity,
        personality: this.personality,
        knowledge: this.knowledge,
        goals: this.goals.getCurrent(),
        capabilities: this.capabilities.list(),
        memoryContext,
        channel: request.channel
      });

      // 3. Execute with AI provider
      const response = await this.execute(request, systemPrompt, memoryContext);
      this.tracer.log('response', response);

      // 4. Update memory
      await this.memory.store({
        id: `${interactionId}-memory`,
        content: `User: ${request.input}\nAssistant: ${response.content}`,
        metadata: { request, response },
        timestamp: new Date(),
        type: 'conversation',
        importance: 5
      });

      // 5. Track goal progress
      await this.goals.trackProgress(request, response);

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime, true);

      this.state = AgentStatus.READY;
      return response;

    } catch (error) {
      this.logger.error('Error processing request', { error, request });
      this.updatePerformanceMetrics(Date.now() - startTime, false);
      this.state = AgentStatus.ERROR;
      return this.handleError(error as Error, request);
    } finally {
      this.tracer.endInteraction();
      this.state = AgentStatus.READY;
    }
  }

  /**
   * Execute request with AI provider
   */
  private async execute(
    request: AgentRequest,
    systemPrompt: string,
    memoryContext: MemoryContext
  ): Promise<AgentResponse> {
    // Execute with AI provider
    const aiResponse = await this.aiProvider.chat({
      conversationId: request.context.conversationId,
      userMessage: request.input,
      conversationHistory: memoryContext.shortTerm || [],
      availableTools: this.capabilities.getTools(request.channel),
      systemPrompt: systemPrompt
    });

    // If tool calls needed, execute them
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0 && this.toolExecutor) {
      const toolResults = await this.toolExecutor.executeAll(
        aiResponse.toolCalls,
        request.context
      );

      // Get final response after tool execution
      return this.synthesizeResponse(aiResponse, toolResults, request.channel);
    }

    return {
      content: aiResponse.content,
      channel: request.channel,
      metadata: {
        confidence: aiResponse.confidence
      }
    };
  }

  /**
   * Synthesize final response after tool execution
   */
  private async synthesizeResponse(
    aiResponse: any,
    toolResults: any[],
    channel: string
  ): Promise<AgentResponse> {
    // This would integrate tool results back into the conversation
    // For now, return a basic response
    return {
      content: aiResponse.content || 'Task completed.',
      channel: channel as any,
      metadata: {
        toolsUsed: toolResults.map(t => t.toolName)
      }
    };
  }

  /**
   * Rebuild system prompt (can be called to refresh)
   */
  public async rebuildSystemPrompt(): Promise<void> {
    const prompt = await this.promptBuilder.build({
      identity: this.identity,
      personality: this.personality,
      knowledge: this.knowledge,
      goals: this.goals.getCurrent(),
      capabilities: this.capabilities.list()
    });

    this.logger.debug('System prompt rebuilt', {
      length: prompt.length,
      sections: this.promptBuilder.getSections()
    });
  }

  /**
   * Get current agent state
   */
  public getState(): AgentState {
    return {
      status: this.state,
      identity: this.identity.toJSON(),
      currentGoals: this.goals.getCurrent(),
      memoryStats: this.memory.getStats(),
      capabilityCount: this.capabilities.count(),
      performance: this.performanceMetrics
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(duration: number, success: boolean): void {
    const total = this.performanceMetrics.totalInteractions;
    const newTotal = total + 1;

    // Update average response time
    this.performanceMetrics.averageResponseTime =
      (this.performanceMetrics.averageResponseTime * total + duration) / newTotal;

    // Update success/error rates
    if (success) {
      this.performanceMetrics.successRate =
        (this.performanceMetrics.successRate * total + 1) / newTotal;
    } else {
      this.performanceMetrics.errorRate =
        (this.performanceMetrics.errorRate * total + 1) / newTotal;
    }

    this.performanceMetrics.totalInteractions = newTotal;
  }

  /**
   * Error handling with graceful degradation
   */
  private async handleError(error: Error, request: AgentRequest): Promise<AgentResponse> {
    this.logger.error('Agent error', { error, request });

    // Try to generate a graceful error response
    const fallbackPrompt = this.promptBuilder.buildErrorRecoveryPrompt(error, request);

    try {
      const response = await this.aiProvider.chat({
        conversationId: request.context.conversationId,
        userMessage: request.input,
        systemPrompt: fallbackPrompt
      });

      return {
        content: response.content,
        channel: request.channel,
        metadata: { recoveredFromError: true }
      };
    } catch (fallbackError) {
      // Last resort: static fallback
      return {
        content: this.personality.getErrorMessage(request.channel),
        channel: request.channel,
        metadata: { error: true }
      };
    }
  }

  /**
   * Set tool executor (optional)
   */
  public setToolExecutor(executor: any): void {
    this.toolExecutor = executor;
  }

  /**
   * Set conversation service (optional)
   */
  public setConversationService(service: any): void {
    this.conversationService = service;
  }

  /**
   * Dispose of agent resources
   */
  public async dispose(): Promise<void> {
    this.state = AgentStatus.DISPOSED;
    await this.memory.dispose();
    await this.knowledge.dispose();
    this.logger.info('Agent disposed');
  }
}
