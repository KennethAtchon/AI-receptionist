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
import { initializeResources } from './resources/initialization';
import { WebhookRouter } from './webhooks/webhook-router';
import { SessionManager } from './sessions';

// Type-only imports for tree-shaking
import type { OpenAIProvider, OpenRouterProvider } from './providers';
import type { VoiceResource } from './resources/core/voice.resource';
import type { SMSResource } from './resources/core/sms.resource';
import type { EmailResource } from './resources/core/email.resource';
import type { TextResource } from './resources/core/text.resource';

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
 * await sarah.voice.make({ to: '+1234567890' });
 * await sarah.sms.send({ to: '+1234567890', body: 'Hello!' });
 * ```
 */
export class AIReceptionist {
  // Resources (user-facing APIs)
  public readonly voice?: VoiceResource;
  public readonly sms?: SMSResource;
  public readonly email?: EmailResource;
  public readonly text?: TextResource;

  // Internal components
  private config: AIReceptionistConfig;
  private agent!: Agent; // The six-pillar agent instance
  private providerRegistry!: ProviderRegistry; // Centralized provider management
  private toolRegistry!: ToolRegistry;
  private toolStore!: ToolStore;
  private sessionManager!: SessionManager; // Session management for webhook-driven mode
  private webhookRouter!: WebhookRouter; // Webhook routing

  private initialized = false;

  constructor(config: AIReceptionistConfig) {
    // Ensure providers is an empty object if not provided
    this.config = {
      ...config,
      providers: config.providers || {}
    };

    // Validate required config
    if (!config.agent?.identity && !config.agent?.customSystemPrompt) {
      throw new Error('Agent identity configuration is required unless using customSystemPrompt');
    }
    if (!config.model) {
      throw new Error('Model configuration is required');
    }

    if (config.debug) {
      const agentName = config.agent.identity?.name || 'Custom Agent';
      logger.info('[AIReceptionist] Created instance for agent', { name: agentName });
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
   * - Resources (user-facing APIs)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('[AIReceptionist] Already initialized');
      return;
    }

    const agentName = this.config.agent.identity?.name || 'Custom Agent';
    logger.info(`[AIReceptionist] Initializing agent: ${agentName}`);

    // 1. Initialize provider registry and register all providers
    this.providerRegistry = await initializeProviders(this.config);

    // 2. Create tool infrastructure (registry + store)
    const { toolRegistry, toolStore } = createToolInfrastructure();
    this.toolRegistry = toolRegistry;
    this.toolStore = toolStore;

    // 3. Create and initialize the Agent (Six-Pillar Architecture)
    const aiProvider = await getAIProvider(this.providerRegistry);

    const builder = AgentBuilder.create();

    // If custom system prompt is provided, use it
    if (this.config.agent.customSystemPrompt) {
      builder.withCustomSystemPrompt(this.config.agent.customSystemPrompt);
    }

    // Add identity if provided (required unless customSystemPrompt is set)
    if (this.config.agent.identity) {
      builder.withIdentity(this.config.agent.identity);
    }

    // Add optional configuration
    this.agent = builder
      .withPersonality(this.config.agent.personality || {})
      .withKnowledge(this.config.agent.knowledge || { domain: 'general' })
      .withGoals(this.config.agent.goals || { primary: 'Assist users effectively' })
      .withMemory(this.config.agent.memory || { contextWindow: 20 })
      .withAIProvider(aiProvider)
      .withToolRegistry(this.toolRegistry)
      .build();

    this.toolStore.setAgent(this.agent);
    await this.agent.initialize();

    // 4. Register all tools (tools call providers directly - NO processors)
    await registerAllTools(
      {
        config: this.config,
        agent: this.agent,
        providerRegistry: this.providerRegistry // Pass registry, not processors
      },
      this.toolRegistry
    );

    // 5. Initialize session management
    this.sessionManager = new SessionManager();
    this.webhookRouter = new WebhookRouter(this);

    // 6. Initialize resources (session managers)
    const resources = initializeResources({
      agent: this.agent,
      webhookConfig: this.config.webhooks,
      voiceConfig: this.config.voice
    });

    // Assign resources
    (this as any).voice = resources.voice;
    (this as any).sms = resources.sms;
    (this as any).email = resources.email;
    (this as any).text = resources.text;

    this.initialized = true;

    logger.info(`[AIReceptionist] Initialized successfully`);
    logger.info(`[AIReceptionist] - Registered providers: ${this.providerRegistry.list().join(', ')}`);
    logger.info(`[AIReceptionist] - Registered tools: ${this.toolRegistry.count()}`);
    logger.info(`[AIReceptionist] - Available channels: ${[
      this.voice ? 'voice' : null,
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
        identity: this.config.agent.identity && overrides.agent?.identity
          ? { ...this.config.agent.identity, ...overrides.agent.identity }
          : overrides.agent?.identity || this.config.agent.identity,
        personality: overrides.agent?.personality || this.config.agent.personality,
        knowledge: overrides.agent?.knowledge || this.config.agent.knowledge,
        goals: overrides.agent?.goals || this.config.agent.goals,
        memory: overrides.agent?.memory || this.config.agent.memory,
        customSystemPrompt: overrides.agent?.customSystemPrompt || this.config.agent.customSystemPrompt
      },

      // Use model from override or original
      model: overrides.model || this.config.model,

      // Merge tool config
      tools: overrides.tools || this.config.tools,

      // Reuse providers (shared resources)
      providers: this.config.providers,

      // Voice config
      voice: overrides.voice || this.config.voice,

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
   * Get session manager for session lifecycle management
   */
  public getSessionManager(): SessionManager {
    this.ensureInitialized();
    return this.sessionManager;
  }

  /**
   * Get webhook router for handling inbound messages
   */
  public getWebhookRouter(): WebhookRouter {
    this.ensureInitialized();
    return this.webhookRouter;
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
   * Set up a session for a specific channel (webhook-driven mode)
   *
   * This method creates a session and automatically configures webhooks with the provider.
   *
   * @example
   * ```typescript
   * // Set up voice session
   * await client.setSession('voice', '+1234567890');
   *
   * // Set up SMS session
   * await client.setSession('sms', '+1234567890');
   *
   * // Set up email session
   * await client.setSession('email', 'assistant@company.com');
   * ```
   */
  async setSession(
    type: 'voice' | 'sms' | 'email',
    identifier: string,
    metadata?: Record<string, any>
  ): Promise<import('./sessions/types').Session> {
    this.ensureInitialized();

    if (!this.config.webhooks) {
      throw new Error('Webhook configuration is required to use setSession(). Add webhooks config to AIReceptionistConfig.');
    }

    logger.info(`[AIReceptionist] Setting up ${type} session`, { identifier });

    // 1. Create session
    const session = await this.sessionManager.createSession(type, {
      identifier,
      metadata
    });

    // 2. Configure provider webhooks automatically
    await this.configureProviderWebhook(type, identifier, session.id);

    logger.info(`[AIReceptionist] Session created and webhooks configured`, {
      sessionId: session.id,
      type,
      identifier
    });

    return session;
  }

  /**
   * Handle incoming voice webhook (Twilio)
   *
   * @example
   * ```typescript
   * app.post('/webhook/voice', async (req, res) => {
   *   const response = await client.handleVoiceWebhook(req.body);
   *   res.type('text/xml').send(response);
   * });
   * ```
   */
  async handleVoiceWebhook(payload: any): Promise<any> {
    this.ensureInitialized();
    return await this.webhookRouter.handleVoiceWebhook(payload);
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   *
   * @example
   * ```typescript
   * app.post('/webhook/sms', async (req, res) => {
   *   const response = await client.handleSMSWebhook(req.body);
   *   res.type('text/xml').send(response);
   * });
   * ```
   */
  async handleSMSWebhook(payload: any): Promise<any> {
    this.ensureInitialized();
    return await this.webhookRouter.handleSMSWebhook(payload);
  }

  /**
   * Handle incoming email webhook (Postmark)
   *
   * Note: Postmark does NOT provide webhook signatures for inbound emails.
   * For security, use Basic HTTP Authentication in your webhook URL or IP whitelisting.
   *
   * @example
   * ```typescript
   * app.post('/webhook/email', async (req, res) => {
   *   const response = await client.handleEmailWebhook(req.body);
   *   res.json(response);
   * });
   * ```
   */
  async handleEmailWebhook(payload: any): Promise<any> {
    this.ensureInitialized();
    return await this.webhookRouter.handleEmailWebhook(payload);
  }

  /**
   * Configure provider webhook for a session
   * @private
   */
  private async configureProviderWebhook(
    type: 'voice' | 'sms' | 'email',
    identifier: string,
    sessionId: string
  ): Promise<void> {
    if (!this.config.webhooks) {
      return;
    }

    const { baseUrl, endpoints } = this.config.webhooks;

    try {
      switch (type) {
        case 'voice': {
          if (!endpoints.voice) {
            throw new Error('Voice webhook endpoint not configured');
          }
          const webhookUrl = `${baseUrl}${endpoints.voice}`;
          // TODO: Configure Twilio webhook for voice
          // await this.configureTwilioVoiceWebhook(identifier, webhookUrl);
          logger.info(`[AIReceptionist] Voice webhook configured`, { webhookUrl });
          break;
        }

        case 'sms': {
          if (!endpoints.sms) {
            throw new Error('SMS webhook endpoint not configured');
          }
          const webhookUrl = `${baseUrl}${endpoints.sms}`;
          // TODO: Configure Twilio webhook for SMS
          // await this.configureTwilioSMSWebhook(identifier, webhookUrl);
          logger.info(`[AIReceptionist] SMS webhook configured`, { webhookUrl });
          break;
        }

        case 'email': {
          if (!endpoints.email) {
            throw new Error('Email webhook endpoint not configured');
          }
          const webhookUrl = `${baseUrl}${endpoints.email}`;
          // TODO: Configure Postmark inbound webhook
          // await this.configurePostmarkWebhook(identifier, webhookUrl);
          logger.info(`[AIReceptionist] Email webhook configured`, { webhookUrl });
          break;
        }
      }
    } catch (error) {
      logger.error(`[AIReceptionist] Failed to configure webhook for ${type}`, error as Error);
      throw error;
    }
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
