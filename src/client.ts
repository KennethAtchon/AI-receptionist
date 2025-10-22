/**
 * AI Receptionist SDK - Main Client
 * Agent-centric architecture with six-pillar agent system
 */

import type { AIReceptionistConfig } from './types';
import { ConversationService } from './services/conversation.service';
import { ToolExecutionService } from './services/tool-execution.service';
import { ToolRegistry } from './tools/registry';
import { ToolStore } from './tools/tool-store';
import { setupStandardTools } from './tools/standard';
import { logger } from './utils/logger';
import { Agent } from './agent/core/Agent';
import { AgentBuilder } from './agent/core/AgentBuilder';
import { MCPAdapter } from './adapters/mcp/mcp-adapter';
import { ProviderRegistry } from './core/provider-registry';
import { TwilioValidator } from './validation/twilio-validator';
import { OpenAIValidator } from './validation/openai-validator';
import { GoogleCalendarValidator } from './validation/google-calendar-validator';

// Type-only imports for tree-shaking
import type { TwilioProvider } from './providers/core/twilio.provider';
import type { OpenAIProvider } from './providers/ai/openai.provider';
import type { OpenRouterProvider } from './providers/ai/openrouter.provider';
import type { GoogleCalendarProvider } from './providers/core/google-calendar.provider';
import type { CallService } from './services/call.service';
import type { CallsResource } from './resources/calls.resource';
import type { SMSResource } from './resources/sms.resource';
import type { EmailResource } from './resources/email.resource';
import type { TextResource } from './resources/text.resource';

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
  private conversationService!: ConversationService;
  private toolExecutor!: ToolExecutionService;
  private toolRegistry!: ToolRegistry;
  private toolStore!: ToolStore;
  private callService?: CallService;
  private mcpAdapter?: MCPAdapter;
  private initialized = false;

  constructor(config: AIReceptionistConfig) {
    this.config = config;

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
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('[AIReceptionist] Already initialized');
      return;
    }

    logger.info(`[AIReceptionist] Initializing agent: ${this.config.agent.identity.name}`);

    // 1. Initialize conversation management (backed by agent memory)
    this.conversationService = new ConversationService();

    // 2. Initialize tool registry + tool store (for automatic logging)
    this.toolRegistry = new ToolRegistry();
    this.toolStore = new ToolStore();
    this.toolRegistry.setToolStore(this.toolStore);

    // 3. Setup standard tools if requested
    if (this.config.tools?.defaults) {
      await setupStandardTools(
        this.toolRegistry,
        this.config.tools,
        this.config.providers
      );
    }

    // 4. Register custom tools
    if (this.config.tools?.custom) {
      for (const tool of this.config.tools.custom) {
        this.toolRegistry.register(tool);
      }
    }

    // 5. Initialize tool executor
    this.toolExecutor = new ToolExecutionService(
      this.toolRegistry,
      this.config.onToolExecute,
      this.config.onToolError
    );

    // 6. Initialize Provider Registry (Service Locator Pattern)
    this.providerRegistry = new ProviderRegistry();

    // 7. Register AI provider (always required, lazy loaded)
    this.providerRegistry.registerIfConfigured(
      'ai',
      async () => {
        switch (this.config.model.provider) {
          case 'openai': {
            const { OpenAIProvider } = await import('./providers/ai/openai.provider');
            return new OpenAIProvider(this.config.model);
          }
          case 'openrouter': {
            const { OpenRouterProvider } = await import('./providers/ai/openrouter.provider');
            return new OpenRouterProvider(this.config.model);
          }
          case 'anthropic':
          case 'google':
            throw new Error(`${this.config.model.provider} provider not yet implemented`);
          default:
            throw new Error(`Unknown AI provider: ${this.config.model.provider}`);
        }
      },
      new OpenAIValidator(),
      this.config.model
    );

    // 8. Register Twilio provider ONLY if credentials configured (lazy loaded)
    if (this.config.providers.communication?.twilio) {
      this.providerRegistry.registerIfConfigured(
        'twilio',
        async () => {
          const { TwilioProvider } = await import('./providers/core/twilio.provider');
          return new TwilioProvider(this.config.providers.communication!.twilio!);
        },
        new TwilioValidator(),
        this.config.providers.communication.twilio
      );
    }

    // 9. Register Google Calendar provider ONLY if credentials configured (lazy loaded)
    if (this.config.providers.calendar?.google) {
      this.providerRegistry.registerIfConfigured(
        'google-calendar',
        async () => {
          const { GoogleCalendarProvider } = await import('./providers/core/google-calendar.provider');
          return new GoogleCalendarProvider(this.config.providers.calendar!.google!);
        },
        new GoogleCalendarValidator(),
        this.config.providers.calendar.google
      );
    }

    // 10. Validate ALL registered providers early (fail fast on bad credentials)
    logger.info('[AIReceptionist] Validating provider credentials...');
    await this.providerRegistry.validateAll();
    logger.info('[AIReceptionist] All credentials validated successfully');

    // 11. Create and initialize the Agent instance (Six-Pillar Architecture)
    // Get AI provider from registry (lazy loads on first access)
    const aiProvider = await this.providerRegistry.get<OpenAIProvider | OpenRouterProvider>('ai');

    this.agent = AgentBuilder.create()
      .withIdentity(this.config.agent.identity)
      .withPersonality(this.config.agent.personality || {})
      .withKnowledge(this.config.agent.knowledge || { domain: 'general' })
      .withGoals(this.config.agent.goals || { primary: 'Assist users effectively' })
      .withMemory(this.config.agent.memory || { contextWindow: 20 })
      .withAIProvider(aiProvider)
      .withToolExecutor(this.toolExecutor)
      .withToolRegistry(this.toolRegistry)  // ToolRegistry is source of truth for tools
      .withConversationService(this.conversationService)
      .build();

    // Link conversation service to agent (uses memory-centric architecture)
    this.conversationService.setAgent(this.agent);

    // Link tool store to agent (enables memory-backed tool logging)
    this.toolStore.setAgent(this.agent);

    await this.agent.initialize();

    // 12. Auto-register database tools if long-term memory storage is enabled
    if (this.config.agent.memory?.longTermEnabled && this.config.agent.memory?.longTermStorage) {
      logger.info('[AIReceptionist] Auto-registering database tools (memory storage enabled)');
      const { setupDatabaseTools } = await import('./tools/standard/database-tools');
      setupDatabaseTools(this.toolRegistry, {
        agent: this.agent,
        storage: this.config.agent.memory.longTermStorage,
      });
    }


    // 14. Initialize communication resources if Twilio is configured
    // Resources use lazy provider access - providers load on first use
    if (this.providerRegistry.has('twilio')) {
      const { CallService } = await import('./services/call.service');
      const { CallsResource } = await import('./resources/calls.resource');
      const { SMSResource } = await import('./resources/sms.resource');

      const agentId = `agent-${this.config.agent.identity.name.toLowerCase().replace(/\s+/g, '-')}`;

      // CallService also uses lazy provider access
      this.callService = new CallService(
        await this.providerRegistry.get<TwilioProvider>('twilio'),
        aiProvider,
        this.conversationService,
        this.toolExecutor,
        agentId
      );

      // Pass lazy getter functions to resources
      (this as any).calls = new CallsResource(this.callService);
      (this as any).sms = new SMSResource(() => this.providerRegistry.get<TwilioProvider>('twilio'));
    }

    // 15. Initialize email resource (basic for now, lazy loaded)
    const { EmailResource } = await import('./resources/email.resource');
    (this as any).email = new EmailResource();

    // 16. Initialize text resource (always available - for testing agent independently)
    const { TextResource } = await import('./resources/text.resource');
    (this as any).text = new TextResource(this.agent);

    this.initialized = true;

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

      // Event handlers
      onToolExecute: overrides.onToolExecute || this.config.onToolExecute,
      onToolError: overrides.onToolError || this.config.onToolError,
      onConversationStart: overrides.onConversationStart || this.config.onConversationStart,
      onConversationEnd: overrides.onConversationEnd || this.config.onConversationEnd
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
  get mcp(): MCPAdapter {
    this.ensureInitialized();

    if (!this.mcpAdapter) {
      this.mcpAdapter = new MCPAdapter(this.toolRegistry, {
        defaultChannel: 'call',
        metadata: {
          sdk: 'ai-receptionist',
          agentName: this.config.agent.identity.name,
          agentRole: this.config.agent.identity.role
        }
      });
    }

    return this.mcpAdapter;
  }

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
