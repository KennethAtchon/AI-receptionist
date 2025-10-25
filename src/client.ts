/**
 * AI Receptionist SDK - Main Client
 * Agent-centric architecture with six-pillar agent system
 */

import type { AIReceptionistConfig } from './types';
import { ToolRegistry } from './tools/registry';
import { ToolStore } from './tools/tool-store';
import { logger } from './utils/logger';
import { Agent } from './agent/core/Agent';
import { AgentBuilder } from './agent/core/AgentBuilder';
import { ProviderRegistry } from './providers/core/provider-registry';

// Initialization modules
import { initializeProviders, getAIProvider } from './providers/initialization';
import { createToolInfrastructure, registerAllTools } from './tools/initialization';
import { initializeProcessors } from './processors/initialization';
import { initializeResources } from './resources/initialization';

// Type-only imports for tree-shaking
import type { OpenAIProvider, OpenRouterProvider } from './providers';
import type { CallsResource } from './resources/calls.resource';
import type { SMSResource } from './resources/sms.resource';
import type { EmailResource } from './resources/email.resource';
import type { TextResource } from './resources/text.resource';
import type { CallProcessor } from './processors/call.processor';
import type { CalendarProcessor } from './processors/calendar.processor';
import type { MessagingProcessor } from './processors/messaging.processor';

/**
 * AIReceptionist - Agent-centric AI SDK
 *
 * Each instance represents one AI agent that can communicate through multiple channels.
 *
 * @example
 * ```typescript
 * const sarah = new AIReceptionist({
 *   agent: {
 *     identity: {
 *       name: 'Sarah',
 *       role: 'Sales Representative',
 *       title: 'Senior Sales Specialist'
 *     },
 *     personality: {
 *       traits: [
 *         { name: 'friendly', description: 'Warm and welcoming' },
 *         { name: 'enthusiastic', description: 'Energetic and positive' }
 *       ],
 *       communicationStyle: { primary: 'consultative' }
 *     },
 *     knowledge: {
 *       domain: 'B2B Sales',
 *       expertise: ['product knowledge', 'sales techniques']
 *     },
 *     goals: {
 *       primary: 'Convert leads into customers'
 *     }
 *   },
 *   model: {
 *     provider: 'openai',
 *     apiKey: process.env.OPENAI_API_KEY!,
 *     model: 'gpt-4'
 *   },
 *   providers: {
 *     communication: {
 *       twilio: {
 *         accountSid: process.env.TWILIO_ACCOUNT_SID!,
 *         authToken: process.env.TWILIO_AUTH_TOKEN!,
 *         phoneNumber: process.env.TWILIO_PHONE_NUMBER!
 *       }
 *     }
 *   },
 *   tools: {
 *     defaults: ['calendar', 'booking']
 *   }
 * });
 *
 * // Initialize
 * await sarah.initialize();
 *
 * // Use across different channels
 * await sarah.calls.make({ to: '+1234567890' });
 * await sarah.sms.send({ to: '+1234567890', body: 'Hello!' });
 * ```
 */
export class AIReceptionist {
  // Resources (user-facing APIs)
  public readonly calls?: CallsResource;
  public readonly sms?: SMSResource;
  public readonly email?: EmailResource;
  public readonly text?: TextResource;

  // Internal components
  private config: AIReceptionistConfig;
  private agent!: Agent; // The six-pillar agent instance
  private providerRegistry!: ProviderRegistry; // Centralized provider management
  private toolRegistry!: ToolRegistry;
  private toolStore!: ToolStore;
  
  // Processors (AI-driven orchestration)
  private callProcessor?: CallProcessor;
  private calendarProcessor?: CalendarProcessor;
  private messagingProcessor?: MessagingProcessor;

  private initialized = false;

  constructor(config: AIReceptionistConfig) {
    // Ensure providers is an empty object if not provided
    this.config = {
      ...config,
      providers: config.providers || {}
    };

    // Validate required config
    if (!config.agent?.identity) {
      throw new Error('Agent identity configuration is required');
    }
    if (!config.model) {
      throw new Error('Model configuration is required');
    }

    if (config.debug) {
      logger.info('[AIReceptionist] Created instance for agent', { name: config.agent.identity.name });
    }
  }

  /**
   * Initialize the SDK
   * Call this before using any resources
   *
   * This method orchestrates the initialization of all SDK components:
   * - Providers (AI, communication, calendar)
   * - Agent (six-pillar architecture)
   * - Tools (standard, custom, provider-specific)
   * - Processors (business logic)
   * - Resources (user-facing APIs)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('[AIReceptionist] Already initialized');
      return;
    }

    logger.info(`[AIReceptionist] Initializing agent: ${this.config.agent.identity.name}`);

    // 1. Initialize provider registry and register all providers
    this.providerRegistry = await initializeProviders(this.config);

    // 2. Create tool infrastructure (registry + store)
    const { toolRegistry, toolStore } = createToolInfrastructure();
    this.toolRegistry = toolRegistry;
    this.toolStore = toolStore;

    // 3. Create and initialize the Agent (Six-Pillar Architecture)
    const aiProvider = await getAIProvider(this.providerRegistry);

    this.agent = AgentBuilder.create()
      .withIdentity(this.config.agent.identity)
      .withPersonality(this.config.agent.personality || {})
      .withKnowledge(this.config.agent.knowledge || { domain: 'general' })
      .withGoals(this.config.agent.goals || { primary: 'Assist users effectively' })
      .withMemory(this.config.agent.memory || { contextWindow: 20 })
      .withAIProvider(aiProvider)
      .withToolRegistry(this.toolRegistry)
      .build();

    // Link tool store to agent
    this.toolStore.setAgent(this.agent);

    await this.agent.initialize();

    // 5. Initialize processors (business logic layer)
    const processors = await initializeProcessors(this.providerRegistry);
    this.callProcessor = processors.callProcessor;
    this.messagingProcessor = processors.messagingProcessor;
    this.calendarProcessor = processors.calendarProcessor;

    // 6. Register all tools (standard, custom, provider-specific)
    await registerAllTools(
      {
        config: this.config,
        agent: this.agent,
        callProcessor: this.callProcessor,
        messagingProcessor: this.messagingProcessor,
        calendarProcessor: this.calendarProcessor
      },
      this.toolRegistry
    );

    // 7. Initialize resources (user-facing APIs)
    const resources = await initializeResources({
      agent: this.agent,
      callProcessor: this.callProcessor,
      messagingProcessor: this.messagingProcessor,
      calendarProcessor: this.calendarProcessor
    });

    // Assign resources
    (this as any).calls = resources.calls;
    (this as any).sms = resources.sms;
    (this as any).email = resources.email;
    (this as any).text = resources.text;

    this.initialized = true;

    // Log initialization summary
    logger.info(`[AIReceptionist] Initialized successfully`);
    logger.info(`[AIReceptionist] - Registered providers: ${this.providerRegistry.list().join(', ')}`);
    logger.info(`[AIReceptionist] - Registered tools: ${this.toolRegistry.count()}`);
    logger.info(`[AIReceptionist] - Available channels: ${[
      this.calls ? 'calls' : null,
      this.sms ? 'sms' : null,
      this.email ? 'email' : null,
      this.text ? 'text' : null
    ].filter(Boolean).join(', ')}`);
  }

  /**
   * Clone this instance with different agent/tool configuration
   * Providers are shared for efficiency
   *
   * @example
   * ```typescript
   * const sarah = new AIReceptionist({ ... });
   * await sarah.initialize();
   *
   * // Create Bob with same infrastructure but different identity/personality
   * const bob = sarah.clone({
   *   agent: {
   *     identity: {
   *       name: 'Bob',
   *       role: 'Support Specialist'
   *     },
   *     personality: {
   *       traits: [{ name: 'patient', description: 'Patient and helpful' }]
   *     }
   *   },
   *   tools: {
   *     defaults: ['ticketing', 'knowledgeBase']
   *   }
   * });
   * await bob.initialize();
   * ```
   */
  clone(overrides: Partial<AIReceptionistConfig>): AIReceptionist {
    logger.info(`[AIReceptionist] Cloning instance with overrides`);

    const clonedConfig: AIReceptionistConfig = {
      // Merge agent config (deep merge for six pillars)
      agent: {
        identity: {
          ...this.config.agent.identity,
          ...overrides.agent?.identity
        },
        personality: overrides.agent?.personality || this.config.agent.personality,
        knowledge: overrides.agent?.knowledge || this.config.agent.knowledge,
        goals: overrides.agent?.goals || this.config.agent.goals,
        memory: overrides.agent?.memory || this.config.agent.memory,
        voice: overrides.agent?.voice || this.config.agent.voice
      },

      // Use model from override or original
      model: overrides.model || this.config.model,

      // Merge tool config
      tools: overrides.tools || this.config.tools,

      // Reuse providers (shared resources)
      providers: this.config.providers,

      // Other config
      notifications: overrides.notifications || this.config.notifications,
      analytics: overrides.analytics || this.config.analytics,
      debug: overrides.debug !== undefined ? overrides.debug : this.config.debug,

    };

    return new AIReceptionist(clonedConfig);
  }

  /**
   * Get the tool registry for runtime tool management
   *
   * @example
   * ```typescript
   * const registry = client.getToolRegistry();
   * registry.register(myCustomTool);
   * registry.unregister('old-tool');
   * ```
   */
  getToolRegistry(): ToolRegistry {
    this.ensureInitialized();
    return this.toolRegistry;
  }

  /**
   * Get the tool store (for querying previous tool executions)
   */
  getToolStore(): ToolStore {
    this.ensureInitialized();
    return this.toolStore;
  }

  /**
   * Get the agent instance
   */
  public getAgent(): Agent {
    this.ensureInitialized();
    return this.agent;
  }

  /**
   * Get the provider registry for runtime provider management
   *
   * @example
   * ```typescript
   * const registry = client.getProviderRegistry();
   * const openrouter = await registry.get<OpenRouterProvider>('ai');
   * openrouter.setModel('anthropic/claude-3-opus');
   * ```
   */
  public getProviderRegistry(): ProviderRegistry {
    this.ensureInitialized();
    return this.providerRegistry;
  }

  /**
   * Get MCP adapter
   *
   * Enables Model Context Protocol access to tools.
   * The MCP adapter provides a thin translation layer that exposes
   * tools through the MCP protocol without modifying the existing tool system.
   *
   * @example
   * ```typescript
   * // Access MCP adapter
   * const mcpAdapter = client.mcp;
   *
   * // List available tools via MCP
   * const toolsList = await mcpAdapter.handleToolsList();
   * console.log('Available MCP tools:', toolsList.tools);
   *
   * // Call a tool via MCP
   * const result = await mcpAdapter.handleToolCall({
   *   name: 'calendar_check_availability',
   *   arguments: { date: '2025-10-19', duration: 60 }
   * });
   * ```
   */

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    logger.info('[AIReceptionist] Disposing');

    if (this.agent) {
      await this.agent.dispose();
    }

    // Dispose all providers via registry
    if (this.providerRegistry) {
      await this.providerRegistry.disposeAll();
    }

    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AIReceptionist not initialized. Call initialize() first.');
    }
  }
}
