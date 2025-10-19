/**
 * AI Receptionist SDK - Main Client
 * Agent-centric architecture with six-pillar agent system
 */

import type { AIReceptionistConfig } from './types';
import { ConversationService } from './services/conversation.service';
import { ToolExecutionService } from './services/tool-execution.service';
import { ToolRegistry } from './tools/registry';
import { InMemoryConversationStore } from './storage/in-memory-conversation.store';
import { setupStandardTools } from './tools/standard';
import { logger } from './utils/logger';
import { Agent } from './agent/core/Agent';
import { AgentBuilder } from './agent/core/AgentBuilder';
import { MCPAdapter } from './adapters/mcp/mcp-adapter';
import { PillarManager } from './agent/core/PillarManager';

// Type-only imports for tree-shaking
import type { TwilioProvider } from './providers/communication/twilio.provider';
import type { OpenAIProvider } from './providers/ai/openai.provider';
import type { OpenRouterProvider } from './providers/ai/openrouter.provider';
import type { GoogleCalendarProvider } from './providers/calendar/google-calendar.provider';
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
  private pillarManager!: PillarManager; // Manages runtime pillar updates
  private twilioProvider?: TwilioProvider;
  private aiProvider!: OpenAIProvider | OpenRouterProvider;
  private calendarProvider?: GoogleCalendarProvider;
  private conversationService!: ConversationService;
  private toolExecutor!: ToolExecutionService;
  private toolRegistry!: ToolRegistry;
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

    // 1. Initialize conversation store
    this.conversationService = new ConversationService(
      this.config.conversationStore || new InMemoryConversationStore()
    );

    // 2. Initialize tool registry
    this.toolRegistry = new ToolRegistry();

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

    // 6. Initialize AI provider based on configured provider (lazy loaded)
    switch (this.config.model.provider) {
      case 'openai': {
        const { OpenAIProvider } = await import('./providers/ai/openai.provider');
        this.aiProvider = new OpenAIProvider(this.config.model);
        break;
      }
      case 'openrouter': {
        const { OpenRouterProvider } = await import('./providers/ai/openrouter.provider');
        this.aiProvider = new OpenRouterProvider(this.config.model);
        break;
      }
      case 'anthropic':
      case 'google':
        throw new Error(`${this.config.model.provider} provider not yet implemented`);
      default:
        throw new Error(`Unknown AI provider: ${this.config.model.provider}`);
    }
    await this.aiProvider.initialize();

    // 7. Create and initialize the Agent instance (Six-Pillar Architecture)
    this.agent = AgentBuilder.create()
      .withIdentity(this.config.agent.identity)
      .withPersonality(this.config.agent.personality || {})
      .withKnowledge(this.config.agent.knowledge || { domain: 'general' })
      .withGoals(this.config.agent.goals || { primary: 'Assist users effectively' })
      .withMemory(this.config.agent.memory || { type: 'simple', contextWindow: 20 })
      .withAIProvider(this.aiProvider)
      .withToolExecutor(this.toolExecutor)
      .withConversationService(this.conversationService)
      .build();

    await this.agent.initialize();

    // 7. Initialize pillar manager for runtime updates
    this.pillarManager = new PillarManager(this.agent);

    // 8. Initialize communication providers if configured (lazy loaded)
    if (this.config.providers.communication?.twilio) {
      const { TwilioProvider } = await import('./providers/communication/twilio.provider');
      this.twilioProvider = new TwilioProvider(this.config.providers.communication.twilio);
      await this.twilioProvider.initialize();

      // Initialize call service (lazy loaded)
      const { CallService } = await import('./services/call.service');
      const agentId = `agent-${this.config.agent.identity.name.toLowerCase().replace(/\s+/g, '-')}`;
      this.callService = new CallService(
        this.twilioProvider,
        this.aiProvider,
        this.conversationService,
        this.toolExecutor,
        agentId
      );

      // Initialize resources (lazy loaded)
      const { CallsResource } = await import('./resources/calls.resource');
      const { SMSResource } = await import('./resources/sms.resource');
      (this as any).calls = new CallsResource(this.callService);
      (this as any).sms = new SMSResource(this.twilioProvider);
    }

    // 8. Initialize calendar provider if configured (lazy loaded)
    if (this.config.providers.calendar?.google) {
      const { GoogleCalendarProvider } = await import('./providers/calendar/google-calendar.provider');
      this.calendarProvider = new GoogleCalendarProvider(this.config.providers.calendar.google);
      await this.calendarProvider.initialize();
    }

    // 9. Initialize email resource (basic for now) (lazy loaded)
    const { EmailResource } = await import('./resources/email.resource');
    (this as any).email = new EmailResource();

    // 10. Initialize text resource (always available - for testing agent independently)
    const { TextResource } = await import('./resources/text.resource');
    (this as any).text = new TextResource(this.agent);

    this.initialized = true;

    logger.info(`[AIReceptionist] Initialized successfully`);
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
      conversationStore: overrides.conversationStore || this.config.conversationStore,
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
   * Get pillar manager for runtime agent configuration updates
   *
   * Use this to update the agent's six pillars at runtime:
   * - Identity: Who the agent is
   * - Personality: How the agent behaves
   * - Knowledge: What the agent knows
   * - Capabilities: What the agent can do
   * - Memory: What the agent remembers
   * - Goals: What the agent aims to achieve
   *
   * All updates automatically propagate to all channels (text, email, calls, etc.)
   *
   * @example
   * ```typescript
   * // Update personality
   * await client.pillars.addPersonalityTrait('enthusiastic');
   * await client.pillars.setFormalityLevel(7);
   *
   * // Update multiple settings at once
   * await client.pillars.updatePersonality({
   *   traits: ['professional', 'helpful'],
   *   communicationStyle: { primary: 'consultative', formalityLevel: 7 }
   * });
   * ```
   */
  get pillars(): PillarManager {
    this.ensureInitialized();
    return this.pillarManager;
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    logger.info('[AIReceptionist] Disposing');

    if (this.agent) {
      await this.agent.dispose();
    }

    if (this.twilioProvider) {
      await this.twilioProvider.dispose();
    }

    if (this.aiProvider) {
      await this.aiProvider.dispose();
    }

    if (this.calendarProvider) {
      await this.calendarProvider.dispose();
    }

    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AIReceptionist not initialized. Call initialize() first.');
    }
  }
}
