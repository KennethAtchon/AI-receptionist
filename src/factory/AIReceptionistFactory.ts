/**
 * AIReceptionistFactory - Factory pattern for efficient concurrent agent creation
 *
 * Initialize expensive resources once (providers, storage, tools)
 * and create lightweight agent instances per-request.
 *
 * Usage:
 * ```typescript
 * // ONE-TIME: Initialize factory at application startup
 * const factory = await AIReceptionistFactory.create({
 *   model: { provider: 'openai', apiKey: '...', model: 'gpt-4' },
 *   providers: { twilio: {...}, postmark: {...} },
 *   storage: { type: 'database', database: { db: prisma } }
 * });
 *
 * // PER-REQUEST: Create lightweight agents
 * const agent = await factory.createAgent({
 *   customSystemPrompt: '...'
 * });
 *
 * // Use agent
 * const response = await agent.text.generate({ message: '...' });
 *
 * // Cleanup
 * await agent.dispose();
 * ```
 */

import { ProviderRegistry } from '../providers/core/provider-registry';
import { ToolRegistry } from '../tools/registry';
import { ToolStore } from '../tools/tool-store';
import { DatabaseStorage } from '../agent/storage/DatabaseStorage';
import { InMemoryStorage } from '../agent/storage/InMemoryStorage';
import { LongTermMemory } from '../agent/memory/LongTermMemory';
import { AgentBuilder } from '../agent/core/AgentBuilder';
import { initializeProviders, getAIProvider } from '../providers/initialization';
import { registerAllTools } from '../tools/initialization';
import { initializeResources } from '../resources/initialization';
import { logger } from '../utils/logger';
import type {
  FactoryConfig,
  AgentInstanceConfig,
  AgentInstance
} from './types';

export class AIReceptionistFactory {
  // =============== SHARED RESOURCES ===============
  private providerRegistry!: ProviderRegistry;
  private sharedStorage?: DatabaseStorage | InMemoryStorage;
  private sharedLongTermMemory?: LongTermMemory;
  private baseToolRegistry!: ToolRegistry;

  // =============== CONFIG ===============
  private config: FactoryConfig;
  private initialized = false;

  private constructor(config: FactoryConfig) {
    this.config = config;
  }

  /**
   * Create and initialize factory with shared resources
   * Call this ONCE at application startup
   */
  static async create(config: FactoryConfig): Promise<AIReceptionistFactory> {
    logger.info('[Factory] Creating AI Receptionist Factory...');
    const factory = new AIReceptionistFactory(config);
    await factory.initialize();
    logger.info('[Factory] ✅ Factory initialized successfully');
    return factory;
  }

  /**
   * Initialize all shared resources (expensive, done once)
   */
  private async initialize(): Promise<void> {
    logger.info('[Factory] Initializing shared resources...');

    // 1. Initialize providers (Twilio, OpenAI, Postmark, etc.)
    logger.info('[Factory] Initializing provider registry...');

    // Create a minimal config for provider initialization
    const providerConfig: any = {
      model: this.config.model,
      providers: this.config.providers,
      debug: this.config.debug,
      agent: {
        // Minimal agent config for provider initialization
        identity: { name: 'Factory', role: 'System' },
        memory: { contextWindow: 20 }
      }
    };

    this.providerRegistry = await initializeProviders(providerConfig);
    logger.info('[Factory] ✅ Providers initialized');

    // 2. Initialize shared storage
    if (this.config.storage) {
      logger.info('[Factory] Initializing shared storage...');

      if (this.config.storage.type === 'database' && this.config.storage.database) {
        const dbConfig = this.config.storage.database;
        // Build config object - must have connectionString, connection details, or db
        const storageConfig: any = {
          autoMigrate: dbConfig.autoMigrate
        };
        
        if (dbConfig.connectionString) {
          storageConfig.connectionString = dbConfig.connectionString;
        } else if (dbConfig.host && dbConfig.database && dbConfig.user && dbConfig.password) {
          storageConfig.host = dbConfig.host;
          storageConfig.port = dbConfig.port;
          storageConfig.database = dbConfig.database;
          storageConfig.user = dbConfig.user;
          storageConfig.password = dbConfig.password;
          storageConfig.ssl = dbConfig.ssl;
        } else if (dbConfig.db) {
          storageConfig.db = dbConfig.db;
        } else {
          throw new Error('Database configuration must include connectionString, connection details (host/database/user/password), or db instance');
        }
        
        this.sharedStorage = new DatabaseStorage(storageConfig);
        // Initialize storage (creates connection if needed and tables if autoMigrate is enabled)
        await this.sharedStorage.initialize();
      } else {
        this.sharedStorage = new InMemoryStorage();
      }

      // 3. Initialize shared LongTermMemory wrapper
      this.sharedLongTermMemory = new LongTermMemory(this.sharedStorage);
      logger.info('[Factory] ✅ Shared storage initialized');
    }

    // 4. Initialize base tool registry
    logger.info('[Factory] Initializing base tool registry...');
    this.baseToolRegistry = new ToolRegistry();

    // Register tools once (they're stateless)
    // Create a minimal config for tool registration
    const toolConfig: any = {
      model: this.config.model,
      providers: this.config.providers,
      agent: {
        // Tools don't need full agent config during registration
        identity: { name: 'Factory', role: 'System' },
        memory: { contextWindow: 20 }
      }
    };

    await registerAllTools({
      config: toolConfig,
      agent: null as any, // Tools are registered without agent in factory pattern
      providerRegistry: this.providerRegistry
    }, this.baseToolRegistry);

    logger.info('[Factory] ✅ Tool registry initialized');

    this.initialized = true;
    logger.info('[Factory] All shared resources initialized');
  }

  /**
   * Create lightweight agent instance for a single request
   * Fast operation (~50ms), low memory (~5KB)
   */
  async createAgent(config: AgentInstanceConfig): Promise<AgentInstance> {
    this.ensureInitialized();

    logger.debug('[Factory] Creating agent instance...', {
      identity: config.identity?.name
    });

    // Get shared AI provider
    const aiProvider = await getAIProvider(this.providerRegistry);

    // Build agent with shared resources
    const builder = AgentBuilder.create()
      .withAIProvider(aiProvider); // Shared

    // Add per-agent configuration
    if (config.identity) {
      builder.withIdentity(config.identity);
    }
    if (config.personality) {
      builder.withPersonality(config.personality);
    }
    if (config.knowledge) {
      builder.withKnowledge(config.knowledge);
    }
    if (config.goals) {
      builder.withGoals(config.goals);
    }

    // Configure memory
    if (config.memory?.longTermStorage) {
      // User explicitly provided per-agent storage - use it (hybrid pattern)
      builder.withMemory({
        contextWindow: config.memory.contextWindow || 20,
        longTermEnabled: true,
        longTermStorage: config.memory.longTermStorage
      });
    } else if (this.sharedLongTermMemory) {
      // Use factory's shared memory (default for factory pattern)
      builder.withMemory({
        contextWindow: config.memory?.contextWindow || 20,
        longTermEnabled: true,
        sharedLongTermMemory: this.sharedLongTermMemory // Shared
      });
    } else {
      // No storage configured
      builder.withMemory({
        contextWindow: config.memory?.contextWindow || 20,
        longTermEnabled: false
      });
    }

    // Custom system prompt (if provided)
    if (config.customSystemPrompt) {
      builder.withCustomSystemPrompt(config.customSystemPrompt);
    }

    // Build agent
    const agent = builder
      .withToolRegistry(this.baseToolRegistry) // Shared
      .build();

    // Initialize agent
    await agent.initialize();

    // Create per-agent tool store (binds to agent's memory)
    const toolStore = new ToolStore();
    toolStore.setAgent(agent);

    // Initialize resources (voice, sms, email, text)
    const resources = initializeResources({ agent });

    logger.debug('[Factory] ✅ Agent instance created');

    return {
      agent,
      voice: resources.voice!,
      sms: resources.sms!,
      email: resources.email!,
      text: resources.text!,
      dispose: async () => {
        logger.debug('[Factory] Disposing agent instance...');
        await agent.dispose();
        // NOTE: Don't dispose shared resources!
      }
    };
  }

  /**
   * Get provider registry (for direct access)
   */
  getProviderRegistry(): ProviderRegistry {
    this.ensureInitialized();
    return this.providerRegistry;
  }

  /**
   * Get shared storage (for direct access)
   */
  getStorage(): DatabaseStorage | InMemoryStorage | undefined {
    this.ensureInitialized();
    return this.sharedStorage;
  }

  /**
   * Dispose factory and all shared resources
   * Call this on application shutdown
   */
  async dispose(): Promise<void> {
    logger.info('[Factory] Disposing factory...');

    if (this.providerRegistry) {
      await this.providerRegistry.disposeAll();
    }

    // Dispose storage if it owns the connection
    if (this.sharedStorage && 'dispose' in this.sharedStorage) {
      await (this.sharedStorage as any).dispose();
    }

    this.initialized = false;
    logger.info('[Factory] ✅ Factory disposed');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Factory not initialized. Call AIReceptionistFactory.create() first.');
    }
  }
}
