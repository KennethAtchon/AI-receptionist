/**
 * Agent - The core intelligent agent class
 *
 * An Agent is a self-contained, intelligent entity built on the Five Pillars:
 * 1. Identity: Who they are
 * 2. Personality: How they behave
 * 3. Knowledge: What they know
 * 4. Memory: What they remember
 * 5. Goals: What they aim to achieve
 *
 * IMPORTANT: We do NOT include explicit Reasoning or Planning engines.
 * Modern AI providers handle this natively through their training.
 */

import type {
  AgentConfiguration,
  AgentRequest,
  AgentResponse,
  Identity,
  PersonalityEngine,
  KnowledgeBase,
  MemoryManager,
  GoalSystem,
  ConversationHistory
} from '../types';

import { AgentStatus } from '../types';

import { IdentityImpl } from '../identity/Identity';
import { PersonalityEngineImpl } from '../personality/PersonalityEngine';
import { KnowledgeBaseImpl } from '../knowledge/KnowledgeBase';
import { MemoryManagerImpl } from '../memory/MemoryManager';
import { GoalSystemImpl } from '../goals/GoalSystem';
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { PromptOptimizer } from '../prompt/PromptOptimizer';
import { AgentBuilder } from './AgentBuilder';
import { InputValidator } from '../security/InputValidator';
import { logger } from '../../utils/logger';

export class Agent {
  // ==================== CORE COMPONENTS (The 5 Pillars) ====================
  private readonly identity: Identity;
  private readonly personality: PersonalityEngine;
  private readonly knowledge: KnowledgeBase;
  private readonly memory: MemoryManager;
  private readonly goals: GoalSystem;

  // ==================== SUPPORTING SYSTEMS ====================
  private readonly promptBuilder: SystemPromptBuilder;
  private readonly promptOptimizer: PromptOptimizer;
  private cachedSystemPrompt: string | null = null;
  private readonly customSystemPrompt?: string; // User-provided raw system prompt

  // ==================== STATE ====================
  private state: AgentStatus;

  // ==================== EXTERNAL DEPENDENCIES ====================
  private aiProvider: any; // IAIProvider
  private toolRegistry?: any; // ToolRegistry - source of truth for tools

  // ==================== AGENT ID ====================
  public readonly id: string;

  // ==================== SECURITY ====================
  private readonly inputValidator: InputValidator;
  private readonly securityEnabled: boolean;

  /**
   * Private constructor - use Agent.builder() to create instances
   */
  private constructor(config: AgentConfiguration) {
    // Initialize identity (use default if custom system prompt is provided without identity)
    this.identity = new IdentityImpl(config.identity || {
      name: 'Custom Agent',
      role: 'AI Assistant',
      authorityLevel: 'medium'
    });

    // Initialize personality
    this.personality = new PersonalityEngineImpl(config.personality || {});

    // Initialize knowledge base
    this.knowledge = new KnowledgeBaseImpl(config.knowledge || { domain: 'general' });


    // Initialize memory
    this.memory = new MemoryManagerImpl(config.memory || {});

    // Initialize goals (ensure primary exists)
    const goalConfig = config.goals || { primary: 'Assist users effectively' };
    if (!goalConfig.primary || goalConfig.primary.trim().length === 0) {
      goalConfig.primary = 'Assist users effectively';
    }
    this.goals = new GoalSystemImpl(goalConfig);

    // Initialize prompt builder and optimizer
    this.promptBuilder = new SystemPromptBuilder();
    this.promptOptimizer = new PromptOptimizer();

    // Initialize agent ID
    this.id = `agent-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Initialize security
    this.inputValidator = new InputValidator();
    this.securityEnabled = (config as any).security?.inputValidation !== false; // Enabled by default

    // Set external dependencies
    this.aiProvider = config.aiProvider;
    this.toolRegistry = (config as any).toolRegistry;

    // Set custom system prompt if provided
    this.customSystemPrompt = config.customSystemPrompt;

    // Initialize state
    this.state = AgentStatus.INITIALIZING;
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
    logger.info('Initializing agent', { agentId: this.id, identity: this.identity.summary() });

    try {
      // Initialize memory systems
      await this.memory.initialize();

      // Build initial system prompt
      await this.rebuildSystemPrompt();

      this.state = AgentStatus.READY;
      logger.info('Agent initialized successfully', { agentId: this.id });
    } catch (error) {
      this.state = AgentStatus.ERROR;
      logger.error('Failed to initialize agent', error as Error, { agentId: this.id });
      throw error;
    }
  }

  /**
   * Process input and generate response
   */
  public async process(request: AgentRequest): Promise<AgentResponse> {
    const interactionId = request.id;
    this.state = AgentStatus.PROCESSING;

    const startTime = Date.now();

    try {
      // 1. Security validation
      if (this.securityEnabled) {
        const securityCheck = this.inputValidator.validate(request.input);

        if (!securityCheck.isSecure) {
          logger.warn('Security check failed', {
            agentId: this.id,
            detectedPatterns: securityCheck.detectedPatterns,
            riskLevel: securityCheck.riskLevel,
            conversationId: request.context.conversationId
          });

          // Block high-risk attempts immediately
          if (securityCheck.riskLevel === 'high') {
            return {
              content: this.inputValidator.getSecurityResponse('high'),
              channel: request.channel,
              metadata: {
                securityBlock: true,
                riskLevel: 'high',
                detectedPatterns: securityCheck.detectedPatterns
              }
            };
          }

          // For medium risk, log but continue with sanitized content
          logger.info('Processing with sanitized content', {
            agentId: this.id,
            riskLevel: securityCheck.riskLevel
          });
        }

        // Use sanitized content for all subsequent processing
        request = { ...request, input: securityCheck.sanitizedContent };
      }

      // 2. Retrieve conversation history
      const conversationHistory = await this.memory.retrieve(request.input, {
        conversationId: request.context.conversationId,
        channel: request.channel
      });

      // 3. Build system prompt (static, no memory)
      let systemPrompt = request.channel
        ? await this.promptBuilder.build({
            identity: this.identity,
            personality: this.personality,
            knowledge: this.knowledge,
            goalSystem: this.goals,
            channel: request.channel,
            businessContext: request.context.businessContext
          })
        : this.cachedSystemPrompt!;

      // Append system prompt enhancement if provided
      if (request.context.systemPromptEnhancement) {
        systemPrompt = `${systemPrompt}\n\n${request.context.systemPromptEnhancement}`;
      }

      // 4. Execute with AI provider
      const response = await this.execute(request, systemPrompt, conversationHistory);

      // 5. Update memory - Store user and assistant messages separately
      // Store user message (skip if input is empty - indicates content already in history)
      if (request.input && request.input.trim().length > 0) {
        await this.memory.store({
          id: `${interactionId}-user`,
          content: request.input,
          timestamp: new Date(),
          type: 'conversation',
          role: 'user',
          channel: request.channel,
          sessionMetadata: {
            conversationId: request.context.conversationId
          },
          importance: 5
        });
      }

      // Store assistant response
      await this.memory.store({
        id: `${interactionId}-assistant`,
        content: response.content,
        timestamp: new Date(),
        type: 'conversation',
        role: 'assistant',
        channel: request.channel,
        sessionMetadata: {
          conversationId: request.context.conversationId
        },
        importance: 5
      });


      this.state = AgentStatus.READY;
      return response;

    } catch (error) {
      logger.error('Error processing request', error as Error, { agentId: this.id, request });
      this.state = AgentStatus.ERROR;
      return this.handleError(error as Error, request);
    } finally {
      this.state = AgentStatus.READY;
    }
  }

  /**
   * Execute request with AI provider
   */
  private async execute(
    request: AgentRequest,
    systemPrompt: string,
    conversationHistory: ConversationHistory
  ): Promise<AgentResponse> {
    const availableTools = this.toolRegistry
      ? this.toolRegistry.listAvailable(request.channel)
      : [];

    let messages = conversationHistory.messages;

    if (messages.length > 20) {
      try {
        messages = await this.promptOptimizer.compressChatHistory(messages, 4000);
        logger.info('[Agent] Compressed conversation history', {
          agentId: this.id,
          originalCount: conversationHistory.messages.length,
          compressedCount: messages.length
        });
      } catch (error) {
        logger.warn('[Agent] Failed to compress conversation history, using original', { agentId: this.id, error });
      }
    }

    const fullHistory = [
      ...(conversationHistory.contextMessages || []),
      ...messages
    ];

    // Log conversation history being passed to AI
    logger.info('[Agent] Conversation history passed to AI', {
      agentId: this.id,
      conversationId: request.context.conversationId,
      messageCount: fullHistory.length,
      contextMessageCount: conversationHistory.contextMessages?.length || 0,
      messages: fullHistory.map(m => ({
        role: m.role,
        contentPreview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        contentLength: m.content.length
      }))
    });

    const aiResponse = await this.aiProvider.chat({
      conversationId: request.context.conversationId,
      userMessage: request.input,
      conversationHistory: fullHistory,
      availableTools: availableTools,
      systemPrompt: systemPrompt
    });

    // If tool calls needed, execute them directly with registry
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0 && this.toolRegistry) {
      // Build execution context with channel from request
      const executionContext = {
        ...request.context,
        channel: request.channel
      };
      const toolResults = await this.executeTools(aiResponse.toolCalls, executionContext);

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
   * Execute tools directly with registry (no unnecessary service wrapper)
   */
  private async executeTools(
    toolCalls: Array<{ id: string; name: string; parameters: any }>,
    context: any
  ): Promise<Array<{ toolName: string; result: any }>> {
    const results: Array<{ toolName: string; result: any }> = [];

    for (const toolCall of toolCalls) {
      logger.info(`[Agent] Executing tool '${toolCall.name}'`, { agentId: this.id });
      try {
        // Merge provided toolParams with AI-generated parameters
        // toolParams take precedence over AI's parameters
        const mergedParameters = context.toolParams ? {
          ...toolCall.parameters,
          ...context.toolParams
        } : toolCall.parameters;

        const result = await this.toolRegistry.execute(toolCall.name, mergedParameters, context);
        logger.info(`[Agent] Tool '${toolCall.name}' executed`, { agentId: this.id, success: result.success, error: result.error });
        results.push({ toolName: toolCall.name, result });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[Agent] Tool '${toolCall.name}' threw error: ${errorMsg}`, error as Error, { agentId: this.id });
        throw error; // Re-throw to be caught by parent handler
      }
    }

    return results;
  }

  /**
   * Synthesize final response after tool execution
   */
  private async synthesizeResponse(
    aiResponse: any,
    toolResults: any[],
    channel: string
  ): Promise<AgentResponse> {
    // Ask AI again with tool results to generate final user-facing response
    const toolSummary = toolResults.map(tr => 
      `Tool: ${tr.toolName}\nResult: ${JSON.stringify(tr.result.data || tr.result.response)}`
    ).join('\n\n');

    const finalAIResponse = await this.aiProvider.chat({
      conversationId: `synthesis-${Date.now()}`,
      userMessage: `Based on these tool results, provide a natural response to the user:\n\n${toolSummary}`,
      systemPrompt: 'You are synthesizing tool results into a conversational response. Be natural and helpful.'
    });

    return {
      content: finalAIResponse.content || aiResponse.content || 'Task completed.',
      channel: channel as any,
      metadata: {
        toolsUsed: toolResults.map(t => t.toolName),
        toolResults: toolResults.map(t => t.result)
      }
    };
  }

  /**
   * Rebuild system prompt (can be called to refresh)
   */
  public async rebuildSystemPrompt(): Promise<void> {
    // If custom system prompt is provided, use it directly (no building)
    if (this.customSystemPrompt) {
      this.cachedSystemPrompt = this.customSystemPrompt;

      logger.info('[Agent] Using custom system prompt', {
        agentId: this.id,
        length: this.cachedSystemPrompt.length,
        source: 'user-provided',
        preview: this.cachedSystemPrompt.substring(0, 500) + (this.cachedSystemPrompt.length > 500 ? '...' : '')
      });

      // Log full custom system prompt at debug level
      logger.debug('[Agent] Full custom system prompt', {
        agentId: this.id,
        systemPrompt: this.cachedSystemPrompt
      });

      return;
    }

    // Otherwise, build system prompt using SystemPromptBuilder
    this.cachedSystemPrompt = await this.promptBuilder.build({
      identity: this.identity,
      personality: this.personality,
      knowledge: this.knowledge,
      goalSystem: this.goals
    });

    logger.info('[Agent] System prompt built', {
      agentId: this.id,
      length: this.cachedSystemPrompt.length,
      source: 'SystemPromptBuilder',
      sections: this.promptBuilder.getSections(),
      preview: this.cachedSystemPrompt.substring(0, 500) + (this.cachedSystemPrompt.length > 500 ? '...' : '')
    });

    // Log full system prompt at debug level for detailed inspection
    logger.debug('[Agent] Full system prompt', {
      agentId: this.id,
      systemPrompt: this.cachedSystemPrompt
    });
  }

  /**
   * Get current agent status
   */
  public getStatus(): AgentStatus {
    return this.state;
  }

  /**
   * Get the current system prompt (returns cached version)
   */
  public getSystemPrompt(): string {
    if (!this.cachedSystemPrompt) {
      throw new Error('System prompt not yet built. Call initialize() first.');
    }
    return this.cachedSystemPrompt;
  }

  /**
   * Error handling with graceful degradation
   */
  private async handleError(error: Error, request: AgentRequest): Promise<AgentResponse> {
    logger.error('Agent error', error, { agentId: this.id, request });

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
   * Set tool registry (optional) - Source of truth for available tools
   */
  public setToolRegistry(registry: any): void {
    this.toolRegistry = registry;
  }

  // ==================== PILLAR UPDATE METHODS ====================
  // Direct access to pillar components for PillarManager

  public getIdentity() { return this.identity; }
  public getPersonality() { return this.personality; }
  public getKnowledge() { return this.knowledge; }
  public getGoals() { return this.goals; }
  public getMemory() { return this.memory; }

  /**
   * Dispose of agent resources
   *
   * Clears all internal state and references to enable proper garbage collection.
   * After calling dispose(), the agent should not be used.
   */
  public async dispose(): Promise<void> {
    // Mark as disposed first
    this.state = AgentStatus.DISPOSED;

    // Clean up memory and knowledge
    await this.memory.dispose();
    await this.knowledge.dispose();

    // Clear cached data
    this.cachedSystemPrompt = null;

    // Clear references to shared resources
    // This helps garbage collection even though these are shared objects
    this.aiProvider = null as any;
    this.toolRegistry = null;

    logger.info('Agent disposed - all references cleared', { agentId: this.id });
  }
}
