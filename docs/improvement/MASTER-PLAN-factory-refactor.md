# MASTER PLAN: Factory Pattern & Shared Resource Architecture Refactor

**Status**: Planning

**Timeline**: ~3-4 days (24-32 hours)

**Impact**: Critical - Major architectural changes

**Risk Level**: High - Requires careful testing

---

## Executive Summary

This refactor **adds a factory pattern with shared resources** to the AI Receptionist SDK to enable efficient concurrent request handling in server environments, **while maintaining full backward compatibility** with the existing per-agent model.

### Current State (Problems)
- Each Agent creates its own MemoryManager, even when using shared DatabaseStorage
- Each Agent gets separate ShortTermMemory and LongTermMemory instances
- Each Agent creates its own AgentLogger and InteractionTracer (unnecessary overhead)
- No factory pattern - all initialization inline in `client.ts`
- Cannot efficiently handle 100+ concurrent requests (memory waste)

### Target State (Solutions)
- **NEW**: Factory pattern for high-concurrency server environments
- **MAINTAINED**: Legacy per-agent pattern still fully supported
- **FLEXIBLE**: Users can mix shared and per-agent resources as needed
- Factory pattern: Initialize expensive resources once, create lightweight agents per-request
- Shared DatabaseStorage with shared cache across all agents (optional)
- Shared ToolRegistry (tools are stateless)
- Remove observability overhead (delete AgentLogger, InteractionTracer)
- Per-agent identity, personality, knowledge, goals, system prompts
- Memory usage: 17MB → 11.5MB for 100 concurrent agents (32% reduction) when using factory

### Backward Compatibility Guarantee

**Existing code will continue to work without any changes:**
```typescript
// This pattern is NOT being removed - still fully supported
const receptionist = new AIReceptionist({
  agent: { /* ... */ },
  model: { /* ... */ },
  providers: { /* ... */ }
});
await receptionist.initialize();
```

**New factory pattern (optional, for server environments):**
```typescript
const factory = await AIReceptionistFactory.create({ /* ... */ });
const agent = await factory.createAgent({ /* ... */ });
```

---

## Part 1: Current Architecture Analysis

### Resource Allocation Audit

| Resource | Current Scope | Memory per Agent | Should Be | Reason |
|----------|--------------|------------------|-----------|---------|
| **DatabaseStorage** | Per-AIReceptionist | 100KB-1MB (cache) | **Shared** | One cache for all agents |
| **ToolRegistry** | Per-AIReceptionist | 7KB | **Shared** | Tools are stateless |
| **ProviderRegistry** | Per-AIReceptionist | 10MB | **Shared** | Already works ✅ |
| **MemoryManager** | Per-Agent | 1-10KB | **Mixed** | See below |
| **ShortTermMemory** | Per-Agent | 1-5KB | **Per-Agent** | Conversation context |
| **LongTermMemory** | Per-Agent | 10KB-1MB | **Shared Backend** | DatabaseStorage should be shared |
| **AgentLogger** | Per-Agent | 200 bytes | **DELETE** | Use centralized logger |
| **InteractionTracer** | Per-Agent | 10-50KB | **DELETE** | Use centralized observability |
| **SystemPromptBuilder** | Per-Agent | 500 bytes | Per-Agent ✅ | Stateless, negligible cost |
| **PromptOptimizer** | Per-Agent | 500 bytes | Per-Agent ✅ | Stateless, negligible cost |
| **InputValidator** | Per-Agent | 100 bytes | Per-Agent ✅ | Stateless, negligible cost |
| **ToolStore** | Per-AIReceptionist | 100 bytes | **Per-Agent** | Binds to agent's memory |

### Memory Strategy

**The Key Insight**: Memory has two layers that should be handled differently:

1. **ShortTermMemory (Context Window)**
   - **Per-Agent** - Each agent needs its own conversation context for the current request
   - Stores recent messages (default: 20 messages)
   - In-memory only, disposed after request
   - ~1-5KB per agent

2. **LongTermMemory (Persistent Storage)**
   - **Shared Storage Backend** - All agents use the same DatabaseStorage instance
   - **Shared Cache** - One cache Map across all agents (consistency!)
   - **Isolated by conversationId** - Memory queries filter by conversationId
   - One instance, ~10KB overhead + cache

**Current Problem**:
```typescript
// Each agent creates its own LongTermMemory wrapper
const longTermMemory = new LongTermMemory(databaseStorage);
// Result: Each has separate cache Map, even though they share DB!
```

**Solution**:
```typescript
// Factory creates ONE LongTermMemory instance, all agents share it
class AIReceptionistFactory {
  private sharedLongTermMemory: LongTermMemory;

  async initialize() {
    const storage = new DatabaseStorage({...});
    this.sharedLongTermMemory = new LongTermMemory(storage);
  }

  createAgent() {
    // Agent gets reference to shared LongTermMemory
    const memoryManager = new MemoryManager({
      shortTerm: { /* per-agent */ },
      longTerm: this.sharedLongTermMemory // SHARED
    });
  }
}
```

---

## Part 2: Deletions & Simplifications

### DELETE: Observability Folder

**Files to Delete**:
- `src/agent/observability/AgentLogger.ts`
- `src/agent/observability/InteractionTracer.ts`
- `src/agent/observability/FileLogger.ts`
- Entire `src/agent/observability/` directory

**Reason**:
- Per-agent logger adds unnecessary overhead (200 bytes × 100 agents = 20KB)
- Per-agent tracer stores history (10-50KB × 100 agents = 1-5MB waste)
- Use centralized logger instead: `src/utils/logger.ts` (already exists)
- For production observability, use OpenTelemetry/Datadog/etc (TODO for later)

**Impact**:
- Remove from Agent constructor: `this.logger = new AgentLogger(...)`
- Remove from Agent constructor: `this.tracer = new InteractionTracer()`
- Replace `this.logger.info(...)` with `logger.info(...)`
- Delete all tracer usage: `this.tracer.startInteraction(...)`, etc.

**Migration**:
```typescript
// Before
this.logger.info('Processing message', { context });
this.tracer.startInteraction(interactionId);

// After
import { logger } from '../utils/logger';
logger.info('Processing message', { context, agentId: this.id });
// Remove tracer entirely
```

---

## Part 3: Factory Pattern Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Application Startup (ONCE)                                  │
│                                                              │
│  AIReceptionistFactory.create(config)                       │
│   ├─ Initialize ProviderRegistry (Twilio, OpenAI, etc.)    │
│   ├─ Initialize DatabaseStorage (shared)                    │
│   ├─ Initialize LongTermMemory(sharedStorage) (shared)     │
│   └─ Initialize ToolRegistry + register tools (shared)      │
│                                                              │
│  Memory: ~11MB (one-time cost)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Per Request (100x Concurrent)                                │
│                                                              │
│  factory.createAgent(config)                                │
│   ├─ Create Agent with custom identity/personality          │
│   ├─ Create ShortTermMemory (per-agent)                     │
│   ├─ Reference shared LongTermMemory                        │
│   ├─ Reference shared ToolRegistry                          │
│   ├─ Reference shared ProviderRegistry                      │
│   └─ Create ToolStore (binds to agent)                      │
│                                                              │
│  Memory per agent: ~5KB                                      │
│  100 concurrent: ~500KB                                      │
│                                                              │
│  agent.dispose() → Cleanup per-agent resources              │
└─────────────────────────────────────────────────────────────┘
```

### Factory Config Interface

**File**: `src/factory/types.ts` (NEW)

```typescript
export interface FactoryConfig {
  // Model configuration (shared)
  model: {
    provider: 'openai' | 'openrouter';
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };

  // Provider configuration (shared)
  providers: {
    communication?: {
      twilio?: TwilioConfig;
    };
    email?: {
      postmark?: PostmarkConfig;
    };
    calendar?: {
      google?: GoogleConfig;
    };
  };

  // Storage configuration (shared)
  storage?: {
    type: 'database' | 'memory';
    database?: {
      db: any; // Drizzle/Prisma instance
      autoMigrate?: boolean;
    };
  };

  // Tool configuration
  tools?: {
    defaults?: ('calendar' | 'booking' | 'crm')[];
    custom?: ITool[];
  };

  // Debug mode
  debug?: boolean;
}

export interface AgentInstanceConfig {
  // Agent configuration (per-agent)
  identity?: IdentityConfig;
  personality?: PersonalityConfig;
  knowledge?: KnowledgeConfig;
  goals?: GoalsConfig;

  // Custom system prompt (overrides builder)
  customSystemPrompt?: string;

  // Memory configuration
  memory?: {
    contextWindow?: number; // ShortTermMemory size
    // longTerm is automatically configured by factory
  };
}

export interface AgentInstance {
  agent: Agent;
  voice: VoiceResource;
  sms: SMSResource;
  email: EmailResource;
  text: TextResource;
  dispose: () => Promise<void>;
}
```

### Factory Implementation

**File**: `src/factory/AIReceptionistFactory.ts` (NEW)

```typescript
import { ProviderRegistry } from '../providers/core/provider-registry';
import { ToolRegistry } from '../tools/registry';
import { ToolStore } from '../tools/tool-store';
import { DatabaseStorage } from '../agent/storage/DatabaseStorage';
import { InMemoryStorage } from '../agent/storage/InMemoryStorage';
import { LongTermMemory } from '../agent/memory/LongTermMemory';
import { AgentBuilder } from '../agent/core/AgentBuilder';
import { initializeProviders } from '../providers/initialization';
import { registerAllTools } from '../tools/initialization';
import { initializeResources } from '../resources/initialization';
import { getAIProvider } from '../providers/utils/get-ai-provider';
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
    this.providerRegistry = await initializeProviders({
      model: this.config.model,
      providers: this.config.providers,
      debug: this.config.debug
    });
    logger.info('[Factory] ✅ Providers initialized');

    // 2. Initialize shared storage
    if (this.config.storage) {
      logger.info('[Factory] Initializing shared storage...');

      if (this.config.storage.type === 'database' && this.config.storage.database) {
        this.sharedStorage = new DatabaseStorage({
          db: this.config.storage.database.db,
          autoMigrate: this.config.storage.database.autoMigrate ?? true
        });
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
    await registerAllTools({
      providerRegistry: this.providerRegistry,
      storage: this.sharedStorage,
      defaultTools: this.config.tools?.defaults,
      customTools: this.config.tools?.custom
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
    if (this.sharedLongTermMemory) {
      builder.withMemory({
        contextWindow: config.memory?.contextWindow || 20,
        longTermEnabled: true,
        // Pass shared LongTermMemory instance
        sharedLongTermMemory: this.sharedLongTermMemory
      });
    } else {
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
    const resources = initializeResources(agent);

    logger.debug('[Factory] ✅ Agent instance created');

    return {
      agent,
      voice: resources.voice,
      sms: resources.sms,
      email: resources.email,
      text: resources.text,
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

    // Storage doesn't need disposal (connection managed externally)

    this.initialized = false;
    logger.info('[Factory] ✅ Factory disposed');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Factory not initialized. Call AIReceptionistFactory.create() first.');
    }
  }
}
```

### MemoryManager Refactor

**File**: `src/agent/memory/MemoryManager.ts` (MODIFY)

**Current Issue**: MemoryManager creates its own LongTermMemory instance

**Solution**: Accept shared LongTermMemory via constructor

```typescript
// BEFORE
export class MemoryManager {
  private longTermMemory?: LongTermMemory;

  constructor(config: MemoryConfig) {
    if (config.longTermEnabled && config.longTermStorage) {
      // ❌ Creates new LongTermMemory with separate cache
      this.longTermMemory = new LongTermMemory(config.longTermStorage);
    }
  }
}

// AFTER
export class MemoryManager {
  private longTermMemory?: LongTermMemory;

  constructor(config: MemoryConfig) {
    if (config.longTermEnabled) {
      if (config.sharedLongTermMemory) {
        // ✅ Use shared instance (shared cache)
        this.longTermMemory = config.sharedLongTermMemory;
      } else if (config.longTermStorage) {
        // Fallback: create per-agent (backward compatibility)
        this.longTermMemory = new LongTermMemory(config.longTermStorage);
      }
    }
  }
}
```

**Type Update**:
```typescript
export interface MemoryConfig {
  contextWindow?: number;
  longTermEnabled?: boolean;

  // Old way (per-agent storage)
  longTermStorage?: IStorage;

  // New way (shared memory instance) - PREFERRED
  sharedLongTermMemory?: LongTermMemory;

  vectorEnabled?: boolean;
  vectorStore?: IVectorStore;
}
```

### Agent Class Cleanup

**File**: `src/agent/core/Agent.ts` (MODIFY)

**Remove**:
```typescript
// DELETE these lines
private logger: AgentLogger;
private tracer: InteractionTracer;

// In constructor, DELETE:
this.logger = new AgentLogger(agentId, this.identity.name);
this.tracer = new InteractionTracer();

// Replace all this.logger.* calls with:
import { logger } from '../../utils/logger';
logger.info('...', { agentId: this.id, agentName: this.identity.name });

// DELETE all this.tracer.* calls
```

---

## Part 4: Integration with Loctelli Backend

### NestJS Service Implementation

**File**: `project/src/main-app/modules/ai-receptionist-test/ai-receptionist-test.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIReceptionistFactory, AgentInstance } from '@atchonk/ai-receptionist';
import { StrategyService } from './strategy.service';
import { PrismaService } from '@/shared/infrastructure/prisma/prisma.service';

@Injectable()
export class AIReceptionistTestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AIReceptionistTestService.name);
  private factory!: AIReceptionistFactory;

  constructor(
    private configService: ConfigService,
    private strategyService: StrategyService,
    private prisma: PrismaService,
  ) {}

  /**
   * Initialize factory ONCE at application startup
   * This is expensive (~500ms) but only happens once
   */
  async onModuleInit() {
    this.logger.log('Initializing AI Receptionist Factory...');

    try {
      this.factory = await AIReceptionistFactory.create({
        model: {
          provider: 'openai',
          apiKey: this.configService.get<string>('OPENAI_API_KEY')!,
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 500
        },
        providers: {
          communication: {
            twilio: {
              accountSid: this.configService.get<string>('TWILIO_ACCOUNT_SID')!,
              authToken: this.configService.get<string>('TWILIO_AUTH_TOKEN')!,
              phoneNumber: this.configService.get<string>('TWILIO_PHONE_NUMBER')!
            }
          },
          email: {
            postmark: {
              apiKey: this.configService.get<string>('POSTMARK_API_KEY')!,
              fromEmail: this.configService.get<string>('POSTMARK_FROM_EMAIL')!,
              fromName: this.configService.get<string>('POSTMARK_FROM_NAME')!
            }
          }
        },
        storage: {
          type: 'database',
          database: {
            db: this.prisma, // Shared database connection
            autoMigrate: true
          }
        },
        tools: {
          defaults: ['calendar', 'booking']
        },
        debug: this.configService.get<string>('DEBUG') === 'true'
      });

      this.logger.log('✅ AI Receptionist Factory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AI Receptionist Factory:', error);
      throw error;
    }
  }

  /**
   * Cleanup on application shutdown
   */
  async onModuleDestroy() {
    if (this.factory) {
      await this.factory.dispose();
      this.logger.log('AI Receptionist Factory disposed');
    }
  }

  /**
   * Handle incoming message for a lead
   * Creates agent → generates response → disposes agent
   * Fast (~50ms agent creation) + AI response time (~1-2s)
   */
  async handleMessage(
    leadId: string,
    message: string,
    subAccountId: string
  ): Promise<string> {
    // 1. Fetch lead with strategy from database
    const lead = await this.strategyService.getLeadWithStrategy(leadId, subAccountId);

    // 2. Build custom system prompt from strategy
    const systemPrompt = this.strategyService.buildSystemPrompt(lead.strategy!, lead);

    // 3. Create lightweight agent instance (~50ms, ~5KB)
    const agentInstance = await this.factory.createAgent({
      customSystemPrompt: systemPrompt,
      memory: {
        contextWindow: 20
        // longTerm is automatically configured by factory
      }
    });

    try {
      // 4. Generate AI response (~1-2s, depends on OpenAI)
      const response = await agentInstance.text.generate({
        message,
        sessionId: leadId // Used as conversationId for memory isolation
      });

      // 5. Update lead interaction count
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          interactionCount: { increment: 1 },
          lastContact: new Date()
        }
      });

      return response.content;
    } finally {
      // 6. Always cleanup agent (even on error)
      await agentInstance.dispose();
    }
  }

  /**
   * Get factory for direct access (advanced usage)
   */
  getFactory(): AIReceptionistFactory {
    if (!this.factory) {
      throw new Error('Factory not initialized');
    }
    return this.factory;
  }
}
```

---

## Part 5: Migration Steps

### Phase 1: Code Deletions (Day 1, 2 hours)

**Step 1.1**: Delete Observability Folder
```bash
rm -rf src/agent/observability/
```

**Step 1.2**: Update Agent.ts
- Remove AgentLogger import and usage
- Remove InteractionTracer import and usage
- Add centralized logger import: `import { logger } from '../../utils/logger'`
- Replace all `this.logger.*` with `logger.*` (add context: `{ agentId: this.id }`)
- Remove all `this.tracer.*` calls

**Step 1.3**: Update Other Files Using AgentLogger
- Search codebase for `AgentLogger` imports
- Replace with centralized logger

**Test**: Run unit tests to ensure no compilation errors

---

### Phase 2: MemoryManager Refactor (Day 1, 3 hours)

**Step 2.1**: Update MemoryConfig Interface
- Add `sharedLongTermMemory?: LongTermMemory` to MemoryConfig
- Keep backward compatibility with `longTermStorage`

**Step 2.2**: Update MemoryManager Constructor
- Check for `sharedLongTermMemory` first
- Fall back to `longTermStorage` if not provided
- Update initialization logic

**Step 2.3**: Update AgentBuilder
- Add `.withSharedLongTermMemory(memory)` method (optional)
- Update `.withMemory()` to accept `sharedLongTermMemory`

**Test**: Unit tests for MemoryManager with both old and new patterns

---

### Phase 3: Factory Implementation (Day 1-2, 6 hours)

**Step 3.1**: Create Factory Types
- Create `src/factory/types.ts`
- Define FactoryConfig, AgentInstanceConfig, AgentInstance interfaces

**Step 3.2**: Implement AIReceptionistFactory
- Create `src/factory/AIReceptionistFactory.ts`
- Implement `create()`, `initialize()`, `createAgent()`, `dispose()`
- Add proper error handling and logging

**Step 3.3**: Export from Index
- Update `src/index.ts` to export factory classes and types

**Step 3.4**: Update Tool Initialization
- Modify `registerAllTools()` to accept context without agent
- Pass `providerRegistry` and `storage` instead

**Test**:
- Factory initialization tests
- Multiple agent creation tests
- Concurrent agent creation tests (100+)

---

### Phase 4: SDK Testing (Day 2, 4 hours)

**Step 4.1**: Unit Tests
```typescript
describe('AIReceptionistFactory', () => {
  it('should create factory', async () => { ... });
  it('should create multiple agents concurrently', async () => { ... });
  it('should share providers across agents', async () => { ... });
  it('should share long-term memory across agents', async () => { ... });
});
```

**Step 4.2**: Integration Tests
```typescript
describe('Memory Sharing', () => {
  it('should share conversation history across agents', async () => {
    // Agent 1 stores memory
    // Agent 2 retrieves same memory
  });
});
```

**Step 4.3**: Memory Leak Tests
```typescript
describe('Memory Management', () => {
  it('should not leak memory with 1000 agents', async () => {
    // Create and dispose 1000 agents
    // Measure memory before/after
  });
});
```

**Step 4.4**: Performance Tests
- Measure agent creation time (~50ms target)
- Measure memory per agent (~5KB target)
- Test 100 concurrent agent creations

---

### Phase 5: Backend Integration (Day 3, 6 hours)

**Step 5.1**: Update SDK Version
```bash
cd project
npm install @atchonk/ai-receptionist@latest
```

**Step 5.2**: Create/Update StrategyService
- Implement `buildSystemPrompt()` method
- Implement `getLeadWithStrategy()` method
- Add template variable replacement

**Step 5.3**: Update AIReceptionistTestService
- Implement `OnModuleInit` with factory initialization
- Implement `OnModuleDestroy` with factory disposal
- Update `handleMessage()` to use factory pattern

**Step 5.4**: Update Controllers
- Ensure webhook handlers call service properly
- Add error handling for factory not initialized

**Test**:
- Service initialization on module load
- Message handling flow
- Concurrent request handling (simulate 10 concurrent webhooks)

---

### Phase 6: Database & Strategy Setup (Day 3, 3 hours)

**Step 6.1**: Prisma Schema (if not already done)
- Add Strategy table
- Add strategyId to Lead table
- Run migration: `npx prisma migrate dev --name add_strategies`

**Step 6.2**: Seed Test Strategies
```typescript
// Create default strategies for testing
await prisma.strategy.create({
  data: {
    name: 'Default Sales Strategy',
    agentName: 'Sarah',
    agentRole: 'Sales Assistant',
    primaryGoal: 'Qualify leads and book appointments',
    // ... other fields
  }
});
```

**Step 6.3**: Update Lead Creation
- Ensure new leads are assigned a default strategy

---

### Phase 7: End-to-End Testing (Day 4, 4 hours)

**Step 7.1**: Local Testing
- Start backend with factory
- Send test messages to webhook endpoints
- Verify agent creation and disposal
- Check memory usage (should be stable)

**Step 7.2**: Load Testing
```bash
# Apache Bench or similar
ab -n 1000 -c 100 -T 'application/json' \
  -p test-payload.json \
  http://localhost:8000/ai-receptionist/test/message
```

**Expected Results**:
- 100 concurrent requests handled
- Average response time: 1-2 seconds
- Memory stable at ~11-15MB
- No memory leaks
- No errors

**Step 7.3**: Memory Profiling
```bash
# Run with --inspect
node --inspect dist/main.js

# Use Chrome DevTools to profile memory
# Create 100 agents, check heap snapshots
```

**Step 7.4**: Monitoring Setup
- Add metrics endpoint for factory stats
- Log agent creation/disposal counts
- Monitor memory usage over time

---

### Phase 8: Deployment (Day 4, 3 hours)

**Step 8.1**: Staging Deployment
- Deploy to staging environment
- Monitor for 24 hours
- Check logs for errors
- Verify memory usage

**Step 8.2**: Production Rollout
- Gradual rollout (10% → 50% → 100%)
- Monitor metrics closely
- Have rollback plan ready

**Step 8.3**: Post-Deployment Validation
- Verify response times
- Check memory usage patterns
- Ensure no data leakage between leads
- Validate strategy changes apply immediately

---

## Part 6: Testing Strategy

### Unit Tests (SDK)

**MemoryManager Tests**:
```typescript
describe('MemoryManager with Shared LongTermMemory', () => {
  it('should use shared LongTermMemory when provided', () => {
    const sharedMemory = new LongTermMemory(storage);
    const manager1 = new MemoryManager({ sharedLongTermMemory: sharedMemory });
    const manager2 = new MemoryManager({ sharedLongTermMemory: sharedMemory });

    expect(manager1['longTermMemory']).toBe(sharedMemory);
    expect(manager2['longTermMemory']).toBe(sharedMemory);
  });

  it('should fall back to per-agent storage for backward compatibility', () => {
    const manager = new MemoryManager({
      longTermEnabled: true,
      longTermStorage: storage
    });

    expect(manager['longTermMemory']).toBeDefined();
  });
});
```

**Factory Tests**:
```typescript
describe('AIReceptionistFactory', () => {
  let factory: AIReceptionistFactory;

  beforeAll(async () => {
    factory = await AIReceptionistFactory.create({
      model: { provider: 'openai', apiKey: 'test', model: 'gpt-4' },
      storage: { type: 'memory' }
    });
  });

  afterAll(async () => {
    await factory.dispose();
  });

  it('should create lightweight agents', async () => {
    const agent1 = await factory.createAgent({
      identity: { name: 'Agent1', role: 'Test' }
    });
    const agent2 = await factory.createAgent({
      identity: { name: 'Agent2', role: 'Test' }
    });

    expect(agent1.agent).toBeDefined();
    expect(agent2.agent).toBeDefined();
    expect(agent1.agent).not.toBe(agent2.agent);

    await agent1.dispose();
    await agent2.dispose();
  });

  it('should share providers', async () => {
    const registry = factory.getProviderRegistry();
    const agent = await factory.createAgent({});

    // Agent should reference same provider registry
    expect(agent.agent['aiProvider']).toBeDefined();

    await agent.dispose();
  });
});
```

### Integration Tests (Backend)

**Concurrent Request Handling**:
```typescript
describe('AIReceptionistTestService Concurrency', () => {
  it('should handle 100 concurrent messages', async () => {
    const messages = Array.from({ length: 100 }, (_, i) => ({
      leadId: `lead-${i}`,
      message: `Test message ${i}`,
      subAccountId: 'test-account'
    }));

    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;

    const responses = await Promise.all(
      messages.map(m =>
        service.handleMessage(m.leadId, m.message, m.subAccountId)
      )
    );

    const duration = Date.now() - startTime;
    const endMem = process.memoryUsage().heapUsed;
    const memGrowth = (endMem - startMem) / 1024 / 1024; // MB

    expect(responses).toHaveLength(100);
    expect(duration).toBeLessThan(10000); // 10s for 100 requests
    expect(memGrowth).toBeLessThan(5); // <5MB growth
  });
});
```

**Memory Consistency**:
```typescript
describe('Shared Memory Consistency', () => {
  it('should share conversation history across agents', async () => {
    const leadId = 'test-lead';

    // First message
    await service.handleMessage(leadId, 'Hello', 'test-account');

    // Second message (different agent instance, same conversation)
    const response = await service.handleMessage(
      leadId,
      'What did I just say?',
      'test-account'
    );

    // Agent should remember "Hello" from previous message
    expect(response.toLowerCase()).toContain('hello');
  });
});
```

### Load Tests

**Apache Bench**:
```bash
# Create test payload
cat > test-payload.json <<EOF
{
  "leadId": "test-lead-123",
  "message": "Hello, I need help",
  "subAccountId": "test-account"
}
EOF

# Run load test
ab -n 1000 -c 100 \
  -T 'application/json' \
  -p test-payload.json \
  http://localhost:8000/ai-receptionist/test/message

# Expected results:
# - Requests per second: >50
# - Mean response time: <2000ms
# - No failed requests
```

**k6 Script**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  let payload = JSON.stringify({
    leadId: `lead-${__VU}`,
    message: 'Test message',
    subAccountId: 'test-account'
  });

  let res = http.post('http://localhost:8000/ai-receptionist/test/message', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });
}
```

---

## Part 7: Monitoring & Observability

### Metrics to Track

**Factory Metrics** (add to factory):
```typescript
export class AIReceptionistFactory {
  private metrics = {
    agentCreations: 0,
    agentDisposals: 0,
    activeAgents: 0,
    totalResponseTime: 0,
    avgResponseTime: 0,
    errors: 0
  };

  async createAgent(config: AgentInstanceConfig): Promise<AgentInstance> {
    this.metrics.agentCreations++;
    this.metrics.activeAgents++;

    const startTime = Date.now();

    try {
      // ... create agent

      return {
        // ... agent instance
        dispose: async () => {
          const duration = Date.now() - startTime;
          this.metrics.totalResponseTime += duration;
          this.metrics.avgResponseTime =
            this.metrics.totalResponseTime / this.metrics.agentCreations;

          this.metrics.agentDisposals++;
          this.metrics.activeAgents--;

          await agent.dispose();
        }
      };
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  }
}
```

**Service Metrics Endpoint**:
```typescript
@Controller('ai-receptionist')
export class AIReceptionistTestController {
  @Get('metrics')
  getMetrics() {
    const factory = this.service.getFactory();
    return factory.getMetrics();
  }
}
```

**Response**:
```json
{
  "agentCreations": 1523,
  "agentDisposals": 1523,
  "activeAgents": 0,
  "avgResponseTime": 1834,
  "errors": 3,
  "memoryUsage": 12.5
}
```

### Logging Strategy

**Factory Initialization**:
```typescript
logger.info('[Factory] Initializing AI Receptionist Factory');
logger.info('[Factory] Provider registry initialized', {
  providers: ['openai', 'twilio', 'postmark']
});
logger.info('[Factory] Shared storage initialized', {
  type: 'database',
  autoMigrate: true
});
logger.info('[Factory] ✅ Factory ready', {
  initTime: '523ms',
  memoryUsage: '11.2MB'
});
```

**Agent Lifecycle**:
```typescript
logger.debug('[Factory] Creating agent', {
  identity: config.identity?.name,
  timestamp: Date.now()
});

logger.debug('[Factory] Agent disposed', {
  agentId: agent.id,
  duration: '1834ms',
  activeAgents: this.metrics.activeAgents
});
```

**Errors**:
```typescript
logger.error('[Factory] Agent creation failed', {
  error: error.message,
  stack: error.stack,
  config: config
});
```

---

## Part 8: Success Criteria

### Memory Requirements
- ✅ Factory initialization: <12MB
- ✅ 100 concurrent agents: <16MB total (~4MB additional)
- ✅ Per-agent overhead: <5KB
- ✅ No memory leaks after 1000+ agent cycles

### Performance Requirements
- ✅ Factory initialization: <1 second
- ✅ Agent creation: <100ms
- ✅ Agent disposal: <10ms
- ✅ 100 concurrent requests: Complete within 5 seconds (OpenAI permitting)

### Functional Requirements
- ✅ Shared conversation history across agents (same leadId)
- ✅ Memory isolation between leads (different leadIds)
- ✅ Strategy changes apply immediately (no stale cache)
- ✅ No data leakage between concurrent requests
- ✅ Proper error handling and recovery
- ✅ Clean resource disposal

### Code Quality Requirements
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Load tests successful (1000 requests, 100 concurrent)
- ✅ No TypeScript compilation errors
- ✅ No ESLint warnings
- ✅ Documentation updated

---

## Part 9: Rollback Plan

### If Critical Issues Found

**Step 1**: Stop new deployments immediately

**Step 2**: Assess severity
- Memory leak? → Rollback immediately
- Performance regression? → Investigate, rollback if >50% slower
- Functional bug? → Hotfix if possible, rollback if data corruption risk

**Step 3**: Rollback procedure
```bash
# Backend
cd project
npm install @atchonk/ai-receptionist@<previous-version>
docker-compose restart api

# Verify rollback
curl http://localhost:8000/health
```

**Step 4**: Incident review
- Document what went wrong
- Identify gaps in testing
- Update plan and retest

---

## Part 10: Future Optimizations

### Agent Pooling (Optional)
If agent creation becomes a bottleneck:
```typescript
class AgentPool {
  private pool: AgentInstance[] = [];
  private maxSize = 10;

  async acquire(): Promise<AgentInstance> {
    return this.pool.pop() || await this.factory.createAgent({});
  }

  release(agent: AgentInstance) {
    if (this.pool.length < this.maxSize) {
      // Reset agent state
      agent.agent.getMemory().clear();
      this.pool.push(agent);
    } else {
      agent.dispose();
    }
  }
}
```

### Strategy Caching
Cache frequently-used strategies:
```typescript
private strategyCache = new LRUCache<string, Strategy>({
  max: 100,
  ttl: 5 * 60000 // 5 minutes
});
```

### Horizontal Scaling
- Run multiple backend instances
- Each has its own factory
- Load balancer distributes requests
- Shared database ensures consistency

---

## Part 11: Timeline Summary

| Phase | Tasks | Duration | Day |
|-------|-------|----------|-----|
| **Phase 1** | Delete observability, update Agent.ts | 2 hours | Day 1 |
| **Phase 2** | MemoryManager refactor | 3 hours | Day 1 |
| **Phase 3** | Factory implementation | 6 hours | Day 1-2 |
| **Phase 4** | SDK testing | 4 hours | Day 2 |
| **Phase 5** | Backend integration | 6 hours | Day 3 |
| **Phase 6** | Database & strategy setup | 3 hours | Day 3 |
| **Phase 7** | E2E testing & load tests | 4 hours | Day 4 |
| **Phase 8** | Deployment & monitoring | 3 hours | Day 4 |
| **Total** | | **31 hours** | **~4 days** |

---

## Part 12: Risk Assessment

### High Risk Items
1. **Memory leak in shared resources** → Mitigate with extensive testing
2. **Breaking changes in SDK** → Mitigate with backward compatibility
3. **Production data corruption** → Mitigate with staging validation
4. **Performance regression** → Mitigate with load testing

### Medium Risk Items
1. **Strategy system not ready** → Can use simple config initially
2. **Database migration issues** → Test thoroughly in staging
3. **Third-party provider failures** → Existing error handling should work

### Low Risk Items
1. **TypeScript compilation errors** → Caught during development
2. **Test failures** → Fixed before deployment
3. **Documentation gaps** → Update as needed

---

## Part 13: Next Steps

### Immediate Actions
1. ✅ Review this master plan
2. ✅ Approve architectural changes
3. ✅ Begin Phase 1: Code deletions
4. ✅ Set up feature branch: `feat/factory-pattern-refactor`

### Week 1 Goals
- Complete SDK refactor (Phases 1-4)
- Publish new SDK version to npm
- Begin backend integration (Phase 5)

### Week 2 Goals
- Complete backend integration
- Complete testing (Phases 6-7)
- Deploy to staging

### Week 3 Goals
- Production deployment
- Monitor metrics
- Optimize based on real-world usage

---

## Conclusion

This refactor represents a **major architectural improvement** that will:
- Enable efficient handling of 100+ concurrent requests
- Reduce memory usage by 32% (17MB → 11.5MB)
- Provide proper resource sharing across agents
- Enable flexible strategy-based agent configuration
- Prepare the SDK for production scale

**Estimated Impact**:
- Development time: ~4 days (31 hours)
- Risk level: High (requires careful testing)
- Reward: Critical for production deployment
- Backward compatibility: Maintained where possible

**Ready to proceed?** Let's start with Phase 1! 🚀
