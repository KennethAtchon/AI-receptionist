/**
 * AI Receptionist SDK - Main Client
 * Agent-centric architecture with six-pillar agent system
 */

import type { AIReceptionistConfig } from './types';
import { ToolRegistry } from './tools/registry';
import { ToolStore } from './tools/tool-store';
import { logger, configureLogger, LogLevel } from './utils/logger';

import { Agent } from './agent/core/Agent';
import { AgentBuilder } from './agent/core/AgentBuilder';
import { AgentStatus } from './agent/types';
import { ProviderRegistry } from './providers/core/provider-registry';

// Initialization modules
import { initializeProviders, getAIProvider } from './providers/initialization';
import { createToolInfrastructure, registerAllTools } from './tools/initialization';
import { initializeResources } from './resources/initialization';
import { WebhookRouter } from './webhooks/webhook-router';
import { SDK_VERSION } from './version';

// Type-only imports for tree-shaking
import type { VoiceResource } from './resources/voice';
import type { SMSResource } from './resources/sms';
import type { EmailResource } from './resources/email';
import type { TextResource } from './resources/text';

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
  // ==================== PUBLIC RESOURCES (User-facing APIs) ====================
  public readonly voice?: VoiceResource;
  public readonly sms?: SMSResource;
  public readonly email?: EmailResource;
  public readonly text?: TextResource;

  // ==================== INTERNAL COMPONENTS ====================
  private config: AIReceptionistConfig;
  private agent!: Agent; // The six-pillar agent instance
  private providerRegistry!: ProviderRegistry; // Centralized provider management
  private toolRegistry!: ToolRegistry;
  private toolStore!: ToolStore;
  private webhookRouter!: WebhookRouter; // Webhook routing

  private initialized = false;

  // ==================== CONSTRUCTION ====================

  constructor(config: AIReceptionistConfig) {
    // Ensure providers is an empty object if not provided
    this.config = {
      ...config,
      providers: config.providers || {}
    };

    // Initialize logger from config if provided
    if (config.logger) {
      const loggerConfig: import('./utils/logger').LoggerConfig = {
        level: config.logger.level ? this.mapLogLevel(config.logger.level) : undefined,
        prefix: config.logger.prefix,
        enableTimestamps: config.logger.enableTimestamps,
        enableColors: true, // Keep colors enabled by default
      };
      configureLogger(loggerConfig);
    }

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

  // ==================== CORE LIFECYCLE METHODS ====================

  /**
   * Initialize the SDK
   * Call this before using any resources
   *
   * This method orchestrates the initialization of all SDK components:
   * - Providers (AI, communication, calendar)
   * - Agent (six-pillar architecture)
   * - Tools (standard, custom, provider-specific)
   * - Resources (user-facing APIs)
   *
   * @throws Error if initialization fails at any step
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('[AIReceptionist] Already initialized');
      return;
    }

    logger.info(`[AIReceptionist] Initializing agent: ${this.config.agent.identity?.name || 'Custom Agent'}`);

    try {
      // 1. Initialize provider registry and register all providers
      try {
        this.providerRegistry = await initializeProviders(this.config);
      } catch (error) {
        throw new Error(`Failed to initialize providers: ${(error as Error).message}`);
      }

      // 2. Create tool infrastructure (registry + store)
      const { toolRegistry, toolStore } = createToolInfrastructure();
      this.toolRegistry = toolRegistry;
      this.toolStore = toolStore;

      // 3. Create and initialize the Agent (Six-Pillar Architecture)
      let aiProvider;
      try {
        aiProvider = await getAIProvider(this.providerRegistry);
      } catch (error) {
        throw new Error(`Failed to get AI provider: ${(error as Error).message}`);
      }

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
      try {
        this.agent = builder
          .withPersonality(this.config.agent.personality || {})
          .withKnowledge(this.config.agent.knowledge || { domain: 'general' })
          .withGoals(this.config.agent.goals || { primary: 'Assist users effectively' })
          .withMemory(this.config.agent.memory || { contextWindow: 20 })
          .withAIProvider(aiProvider)
          .withToolRegistry(this.toolRegistry)
          .withProviderRegistry(this.providerRegistry) // Needed for resources like VoiceResource
          .build();

        this.toolStore.setAgent(this.agent);
        await this.agent.initialize();
      } catch (error) {
        throw new Error(`Failed to initialize agent: ${(error as Error).message}`);
      }

      // 4. Register all tools (tools call providers directly - NO processors)
      try {
        await registerAllTools(
          {
            config: this.config,
            agent: this.agent,
            providerRegistry: this.providerRegistry // Pass registry, not processors
          },
          this.toolRegistry
        );
      } catch (error) {
        throw new Error(`Failed to register tools: ${(error as Error).message}`);
      }

      // 5. Initialize webhook router
      this.webhookRouter = new WebhookRouter(this);

      // 6. Initialize resources (session managers)
      const resources = initializeResources({
        agent: this.agent
      });

      // Assign resources (using Object.assign to avoid type casting)
      Object.assign(this, {
        voice: resources.voice,
        sms: resources.sms,
        email: resources.email,
        text: resources.text
      });

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
    } catch (error) {
      // Ensure we don't leave partial state if initialization fails
      this.initialized = false;
      logger.error('[AIReceptionist] Initialization failed:', error as Error);
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

  /**
   * Re-initialize the SDK with updated configuration
   * Useful when model or provider configs change
   * 
   * @example
   * ```typescript
   * // Update model config
   * client.updateConfig({ model: { ...client.getConfig().model, model: 'gpt-4-turbo' } });
   * 
   * // Re-initialize to apply changes
   * await client.reinitialize();
   * ```
   */
  async reinitialize(): Promise<void> {
    logger.info('[AIReceptionist] Re-initializing...');
    
    // Dispose current state
    await this.dispose();
    
    // Reset initialized flag
    this.initialized = false;
    
    // Re-initialize
    await this.initialize();
  }

  // ==================== CONFIGURATION METHODS ====================

  /**
   * Get current configuration (read-only copy)
   * 
   * @example
   * ```typescript
   * const config = client.getConfig();
   * console.log(config.model.model); // 'gpt-4'
   * ```
   */
  getConfig(): Readonly<AIReceptionistConfig> {
    // Return a deep copy to prevent external mutations
    return JSON.parse(JSON.stringify(this.config)) as AIReceptionistConfig;
  }

  /**
   * Update configuration at runtime
   * Supports updating logger, model, and some provider configs
   * 
   * @example
   * ```typescript
   * // Update logger level
   * client.updateConfig({ logger: { level: 'DEBUG' } });
   * 
   * // Update model (requires re-initialization of AI provider)
   * client.updateConfig({ model: { ...client.getConfig().model, model: 'gpt-4-turbo' } });
   * ```
   */
  updateConfig(updates: Partial<AIReceptionistConfig>): void {
    // Update logger if provided
    if (updates.logger) {
      const loggerConfig: import('./utils/logger').LoggerConfig = {
        level: updates.logger.level ? this.mapLogLevel(updates.logger.level) : undefined,
        prefix: updates.logger.prefix,
        enableTimestamps: updates.logger.enableTimestamps,
        enableColors: true,
      };
      configureLogger(loggerConfig);
      // Update internal config
      this.config.logger = { ...this.config.logger, ...updates.logger };
    }

    // Update debug flag
    if (updates.debug !== undefined) {
      this.config.debug = updates.debug;
    }

    // Update model config (note: changing model requires re-initialization of AI provider)
    if (updates.model) {
      this.config.model = { ...this.config.model, ...updates.model };
      logger.warn('[AIReceptionist] Model config updated. AI provider may need re-initialization for changes to take effect.');
    }

    // Update provider configs (merge, don't replace)
    if (updates.providers) {
      this.config.providers = {
        ...this.config.providers,
        ...updates.providers,
        // Deep merge communication providers
        communication: {
          ...this.config.providers?.communication,
          ...updates.providers.communication,
        },
        // Deep merge calendar providers
        calendar: {
          ...this.config.providers?.calendar,
          ...updates.providers.calendar,
        },
        // Deep merge email providers
        email: updates.providers.email 
          ? (this.config.providers?.email 
              ? { ...this.config.providers.email, ...updates.providers.email }
              : updates.providers.email)
          : this.config.providers?.email,
      };
      logger.info('[AIReceptionist] Provider config updated. Some providers may need re-initialization.');
    }

    logger.info('[AIReceptionist] Configuration updated');
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
   *   },
   *   logger: {
   *     level: 'DEBUG'
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
        identity: overrides.agent?.identity 
          ? (this.config.agent.identity 
              ? { ...this.config.agent.identity, ...overrides.agent.identity }
              : overrides.agent.identity)
          : this.config.agent.identity,
        personality: overrides.agent?.personality 
          ? (this.config.agent.personality 
              ? { ...this.config.agent.personality, ...overrides.agent.personality }
              : overrides.agent.personality)
          : this.config.agent.personality,
        knowledge: overrides.agent?.knowledge 
          ? (this.config.agent.knowledge 
              ? { ...this.config.agent.knowledge, ...overrides.agent.knowledge }
              : overrides.agent.knowledge)
          : this.config.agent.knowledge,
        goals: overrides.agent?.goals 
          ? (this.config.agent.goals 
              ? { ...this.config.agent.goals, ...overrides.agent.goals }
              : overrides.agent.goals)
          : this.config.agent.goals,
        memory: overrides.agent?.memory 
          ? (this.config.agent.memory 
              ? { ...this.config.agent.memory, ...overrides.agent.memory }
              : overrides.agent.memory)
          : this.config.agent.memory,
        customSystemPrompt: overrides.agent?.customSystemPrompt !== undefined
          ? overrides.agent.customSystemPrompt
          : this.config.agent.customSystemPrompt
      },

      // Merge model config (not just replace)
      model: overrides.model 
        ? { ...this.config.model, ...overrides.model }
        : this.config.model,

      // Merge tool config (deep merge)
      tools: overrides.tools 
        ? (this.config.tools 
            ? { ...this.config.tools, ...overrides.tools }
            : overrides.tools)
        : this.config.tools,

      // Merge provider configs (deep merge, but can be overridden)
      providers: overrides.providers 
        ? {
            ...this.config.providers,
            ...overrides.providers,
            // Deep merge communication providers
            communication: {
              ...this.config.providers?.communication,
              ...overrides.providers.communication,
            },
            // Deep merge calendar providers
            calendar: {
              ...this.config.providers?.calendar,
              ...overrides.providers.calendar,
            },
            // Deep merge email providers
            email: overrides.providers.email 
              ? (this.config.providers?.email 
                  ? { ...this.config.providers.email, ...overrides.providers.email }
                  : overrides.providers.email)
              : this.config.providers?.email,
          }
        : this.config.providers,

      // Merge logger config
      logger: overrides.logger 
        ? (this.config.logger 
            ? { ...this.config.logger, ...overrides.logger }
            : overrides.logger)
        : this.config.logger,

      // Other config
      debug: overrides.debug !== undefined ? overrides.debug : this.config.debug,
    };

    return new AIReceptionist(clonedConfig);
  }

  // ==================== PUBLIC ACCESSORS ====================

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
   * Get webhook router for handling inbound messages
   */
  public getWebhookRouter(): WebhookRouter {
    this.ensureInitialized();
    return this.webhookRouter;
  }

  // ==================== WEBHOOK HANDLERS ====================

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

  // ==================== UTILITY & MONITORING METHODS ====================

  /**
   * Perform health check on all components
   * Checks agent, providers, and resources
   * 
   * @example
   * ```typescript
   * const health = await client.healthCheck();
   * if (!health.healthy) {
   *   console.error('Health check failed:', health.errors);
   * }
   * ```
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    agent: boolean;
    providers: Record<string, boolean>;
    errors: string[];
  }> {
    this.ensureInitialized();

    const result = {
      healthy: true,
      agent: false,
      providers: {} as Record<string, boolean>,
      errors: [] as string[]
    };

    // Check agent health (check if agent is ready and initialized)
    try {
      const status = this.agent.getStatus();
      result.agent = status === AgentStatus.READY || status === AgentStatus.PROCESSING;
      if (!result.agent) {
        result.errors.push(`Agent is not ready (status: ${status})`);
        result.healthy = false;
      }
    } catch (error) {
      result.agent = false;
      result.errors.push(`Agent health check error: ${(error as Error).message}`);
      result.healthy = false;
    }

    // Check all providers
    const providerNames = this.providerRegistry.list();
    for (const name of providerNames) {
      try {
        const provider = await this.providerRegistry.get(name);
        if (provider && typeof provider.healthCheck === 'function') {
          const isHealthy = await provider.healthCheck();
          result.providers[name] = isHealthy;
          if (!isHealthy) {
            result.errors.push(`Provider '${name}' health check failed`);
            result.healthy = false;
          }
        } else {
          result.providers[name] = true; // Assume healthy if no health check method
        }
      } catch (error) {
        result.providers[name] = false;
        result.errors.push(`Provider '${name}' health check error: ${(error as Error).message}`);
        result.healthy = false;
      }
    }

    return result;
  }

  /**
   * Get SDK information and version
   * 
   * @example
   * ```typescript
   * const info = client.getInfo();
   * console.log(`SDK Version: ${info.version}`);
   * console.log(`Agent: ${info.agentName}`);
   * ```
   */
  getInfo(): {
    version: string;
    agentName: string;
    initialized: boolean;
    channels: string[];
    providers: string[];
    tools: number;
  } {
    return {
      version: SDK_VERSION,
      agentName: this.config.agent.identity?.name || 'Custom Agent',
      initialized: this.initialized,
      channels: [
        this.voice ? 'voice' : null,
        this.sms ? 'sms' : null,
        this.email ? 'email' : null,
        this.text ? 'text' : null
      ].filter(Boolean) as string[],
      providers: this.initialized ? this.providerRegistry.list() : [],
      tools: this.initialized ? this.toolRegistry.count() : 0
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private mapLogLevel(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE'): LogLevel {
    switch (level) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'NONE':
        return LogLevel.NONE;
      default:
        return LogLevel.INFO;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AIReceptionist not initialized. Call initialize() first.');
    }
  }
}
