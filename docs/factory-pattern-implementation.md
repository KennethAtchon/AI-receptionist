# Factory Pattern Implementation Plan

## Overview
Implement a factory pattern for the AI Receptionist SDK to enable efficient concurrent request handling in server environments. This allows creating lightweight, disposable agent instances that share expensive resources (providers, HTTP clients, connections).

**Problem Solved:**
- Each lead/strategy needs different agent configuration (identity, personality, system prompt)
- Strategies can change anytime (can't cache agents long-term)
- Need to handle 10-100 concurrent requests efficiently
- Current singleton pattern shares memory between all users (data leak risk)

**Solution:**
- Factory Pattern: Initialize providers once, create lightweight agents per-request
- Per-Message Pattern: Create agent → use → dispose (always fresh config)
- Shared Resources: All agents share Twilio, Postmark, OpenAI clients

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Application Startup (Once)                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ AIReceptionistFactory.create()                          │ │
│ │  - Initialize Twilio client (shared)                    │ │
│ │  - Initialize Postmark client (shared)                  │ │
│ │  - Initialize OpenAI client (shared)                    │ │
│ │  - Initialize ProviderRegistry (shared)                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Per Request (100x concurrent)                                │
│ ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐│
│ │ Request 1        │  │ Request 2        │  │ Request 100 ││
│ │                  │  │                  │  │             ││
│ │ 1. Fetch Lead    │  │ 1. Fetch Lead    │  │ 1. Fetch... ││
│ │    + Strategy    │  │    + Strategy    │  │             ││
│ │                  │  │                  │  │             ││
│ │ 2. Create Agent  │  │ 2. Create Agent  │  │ 2. Create...││
│ │    (~50ms, 5KB)  │  │    (~50ms, 5KB)  │  │             ││
│ │    ├─ Identity   │  │    ├─ Identity   │  │             ││
│ │    ├─ Prompt     │  │    ├─ Prompt     │  │             ││
│ │    └─ Uses shared│  │    └─ Uses shared│  │             ││
│ │       providers  │  │       providers  │  │             ││
│ │                  │  │                  │  │             ││
│ │ 3. Generate      │  │ 3. Generate      │  │ 3. Gen...   ││
│ │    Response      │  │    Response      │  │             ││
│ │    (~1-2s)       │  │    (~1-2s)       │  │             ││
│ │                  │  │                  │  │             ││
│ │ 4. Dispose       │  │ 4. Dispose       │  │ 4. Dispose  ││
│ │    (<5ms)        │  │    (<5ms)        │  │             ││
│ └──────────────────┘  └──────────────────┘  └─────────────┘│
└─────────────────────────────────────────────────────────────┘

Memory Usage:
- Factory: ~10MB (shared providers, one-time)
- 100 concurrent agents: ~500KB (5KB each, temporary)
- Total: ~10.5MB (very reasonable)
```

---

## Implementation Steps

### Step 1: Create Factory Class in SDK

**File:** `src/factory.ts`

**Core Features:**
- `AIReceptionistFactory.create(config)` - Initialize once with shared providers
- `factory.createAgent(config)` - Create lightweight agent instance
- `factory.getProviderRegistry()` - Access providers directly
- `factory.dispose()` - Cleanup on shutdown

**Key Implementation Details:**
```typescript
export class AIReceptionistFactory {
  private providerRegistry: ProviderRegistry; // Shared
  private config: FactoryConfig;

  static async create(config: FactoryConfig): Promise<AIReceptionistFactory> {
    const factory = new AIReceptionistFactory(config);
    await factory.initialize(); // Expensive, done once
    return factory;
  }

  private async initialize() {
    // Initialize all providers (Twilio, Postmark, OpenAI)
    this.providerRegistry = await initializeProviders(this.config);
  }

  async createAgent(agentConfig: AgentInstanceConfig): Promise<AgentInstance> {
    // 1. Create lightweight tool registry (per-agent)
    const toolRegistry = new ToolRegistry();

    // 2. Get shared AI provider
    const aiProvider = await getAIProvider(this.providerRegistry);

    // 3. Build agent (lightweight)
    const agent = AgentBuilder.create()
      .withIdentity(agentConfig.identity)
      .withPersonality(agentConfig.personality)
      .withCustomSystemPrompt(agentConfig.customSystemPrompt)
      .withAIProvider(aiProvider) // Shared reference
      .build();

    await agent.initialize();

    // 4. Register tools (uses shared providers)
    await registerAllTools({ agent, providerRegistry: this.providerRegistry }, toolRegistry);

    // 5. Initialize resources
    const resources = initializeResources(agent);

    return {
      agent,
      voice: resources.voice,
      sms: resources.sms,
      email: resources.email,
      text: resources.text,
      dispose: async () => {
        await agent.dispose();
        // Note: Don't dispose providers - they're shared
      }
    };
  }
}
```

---

### Step 2: Add Strategy Table to Prisma Schema

**File:** `project/prisma/schema.prisma`

```prisma
// ============================================================================
// AI Receptionist Strategies
// ============================================================================

/// AI agent configuration per strategy/campaign
model Strategy {
  id           String   @id @default(cuid())
  subAccountId String   @map("sub_account_id")
  subAccount   SubAccount @relation(fields: [subAccountId], references: [id], onDelete: Cascade)

  // Strategy Info
  name         String   // "Inbound Sales Strategy", "Lead Nurture Campaign"
  description  String?  @db.Text
  isActive     Boolean  @default(true) @map("is_active")

  // Agent Identity
  agentName        String   @map("agent_name")           // "Sarah"
  agentRole        String   @map("agent_role")           // "Sales Assistant"
  agentTitle       String?  @map("agent_title")          // "Senior Sales Rep"
  agentBackstory   String?  @map("agent_backstory") @db.Text

  // Personality Configuration
  personalityTraits  Json?   @map("personality_traits")  // [{name: "friendly", description: "..."}]
  communicationStyle String? @map("communication_style") // "consultative", "direct"
  toneOfVoice        String? @map("tone_of_voice")      // "friendly", "professional"
  formalityLevel     Int?    @default(7) @map("formality_level") // 1-10

  // Knowledge & Goals
  knowledgeDomain    String? @map("knowledge_domain")    // "B2B SaaS Sales"
  expertiseAreas     Json?   @map("expertise_areas")    // ["lead qualification", "booking"]
  primaryGoal        String  @map("primary_goal") @db.Text
  secondaryGoals     Json?   @map("secondary_goals")    // ["gather budget info", "handle objections"]

  // Custom Instructions
  customInstructions String? @map("custom_instructions") @db.Text
  systemPromptTemplate String? @map("system_prompt_template") @db.Text // Advanced: full template control

  // Tools/Features
  enabledTools       Json?   @map("enabled_tools")      // ["calendar", "booking", "crm"]

  // AI Model Configuration
  aiModel            String? @map("ai_model")           // "gpt-4o-mini", "gpt-4"
  temperature        Float?  @default(0.7)
  maxTokens          Int?    @map("max_tokens") @default(500)

  // Associations
  leads              Lead[]

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([subAccountId])
  @@index([isActive])
  @@map("strategies")
}

// Update Lead table to reference Strategy
model Lead {
  // ... existing fields ...

  strategyId String?  @map("strategy_id")
  strategy   Strategy? @relation(fields: [strategyId], references: [id], onDelete: SetNull)

  @@index([strategyId])
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_strategies_table
```

---

### Step 3: Create Strategy Service in Loctelli Backend

**File:** `project/src/main-app/modules/ai-receptionist/strategy.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/prisma/prisma.service';
import { Strategy, Lead } from '@prisma/client';

@Injectable()
export class StrategyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Build system prompt from strategy and lead data
   */
  buildSystemPrompt(strategy: Strategy, lead: Lead): string {
    // Use custom template if provided
    if (strategy.systemPromptTemplate) {
      return this.fillTemplate(strategy.systemPromptTemplate, strategy, lead);
    }

    // Default template
    return this.buildDefaultSystemPrompt(strategy, lead);
  }

  private buildDefaultSystemPrompt(strategy: Strategy, lead: Lead): string {
    const traits = strategy.personalityTraits as any[] || [];
    const secondaryGoals = strategy.secondaryGoals as string[] || [];
    const expertiseAreas = strategy.expertiseAreas as string[] || [];

    return `
You are ${strategy.agentName}, a ${strategy.agentRole}.
${strategy.agentTitle ? `Your title: ${strategy.agentTitle}` : ''}

${strategy.agentBackstory || ''}

## Personality

Your personality traits:
${traits.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Communication style: ${strategy.communicationStyle || 'consultative'}
Tone of voice: ${strategy.toneOfVoice || 'professional'}
Formality level: ${strategy.formalityLevel || 7}/10

## Knowledge & Expertise

Domain: ${strategy.knowledgeDomain || 'General'}
Expertise areas:
${expertiseAreas.map(area => `- ${area}`).join('\n')}

## Goals

Primary goal: ${strategy.primaryGoal}

Secondary goals:
${secondaryGoals.map(goal => `- ${goal}`).join('\n')}

## Custom Instructions

${strategy.customInstructions || 'Follow best practices for customer communication.'}

---

## Current Lead Context

Name: ${lead.name}
Email: ${lead.email}
${lead.phone ? `Phone: ${lead.phone}` : ''}
Status: ${lead.status}
Last contact: ${lead.lastContact ? lead.lastContact.toISOString() : 'Never'}
Total interactions: ${lead.interactionCount || 0}
${lead.notes ? `Notes: ${lead.notes}` : ''}

Remember to personalize your responses based on the lead's context and history.
`.trim();
  }

  private fillTemplate(template: string, strategy: Strategy, lead: Lead): string {
    // Simple template variable replacement
    return template
      .replace(/\{agent_name\}/g, strategy.agentName)
      .replace(/\{agent_role\}/g, strategy.agentRole)
      .replace(/\{lead_name\}/g, lead.name)
      .replace(/\{lead_email\}/g, lead.email)
      .replace(/\{lead_status\}/g, lead.status)
      // ... add more variables as needed
      ;
  }

  /**
   * Get strategy configuration with validation
   */
  async getStrategy(strategyId: string, subAccountId: string): Promise<Strategy> {
    const strategy = await this.prisma.strategy.findFirst({
      where: {
        id: strategyId,
        subAccountId,
        isActive: true
      }
    });

    if (!strategy) {
      throw new Error(`Strategy not found or inactive: ${strategyId}`);
    }

    return strategy;
  }

  /**
   * Get lead with strategy
   */
  async getLeadWithStrategy(leadId: string, subAccountId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        subAccountId
      },
      include: {
        strategy: true
      }
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    if (!lead.strategy) {
      throw new Error(`Lead has no strategy assigned: ${leadId}`);
    }

    return lead;
  }
}
```

---

### Step 4: Update AI Receptionist Service to Use Factory

**File:** `project/src/main-app/modules/ai-receptionist-test/ai-receptionist-test.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIReceptionistFactory, AgentInstance } from '@atchonk/ai-receptionist';
import { StrategyService } from './strategy.service';
import { PrismaService } from '@/shared/infrastructure/prisma/prisma.service';

@Injectable()
export class AIReceptionistTestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AIReceptionistTestService.name);
  private factory: AIReceptionistFactory;

  constructor(
    private configService: ConfigService,
    private strategyService: StrategyService,
    private prisma: PrismaService,
  ) {}

  /**
   * Initialize factory once at startup (expensive operation)
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
              fromName: this.configService.get<string>('POSTMARK_FROM_NAME')!,
            }
          }
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
   * Cleanup on shutdown
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
   */
  async handleMessage(
    leadId: string,
    message: string,
    subAccountId: string
  ): Promise<string> {
    // 1. Fetch lead with strategy from DB
    const lead = await this.strategyService.getLeadWithStrategy(leadId, subAccountId);

    // 2. Build system prompt
    const systemPrompt = this.strategyService.buildSystemPrompt(lead.strategy!, lead);

    // 3. Create lightweight agent instance
    const agentInstance = await this.factory.createAgent({
      customSystemPrompt: systemPrompt
    });

    try {
      // 4. Generate response
      const response = await agentInstance.text.generate({
        message,
        sessionId: leadId
      });

      // 5. Update interaction count
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          interactionCount: { increment: 1 },
          lastContact: new Date()
        }
      });

      return response.content;
    } finally {
      // 6. Always cleanup (even if error)
      await agentInstance.dispose();
    }
  }

  /**
   * Get factory for direct access (e.g., bulk operations)
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

### Step 5: Update Controller for Webhook Handling

**File:** `project/src/main-app/modules/ai-receptionist-test/ai-receptionist-test.controller.ts`

```typescript
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AIReceptionistTestService } from './ai-receptionist-test.service';

@Controller('ai-receptionist')
export class AIReceptionistTestController {
  constructor(private readonly service: AIReceptionistTestService) {}

  /**
   * Handle incoming SMS webhook from Twilio
   */
  @Post('webhook/sms')
  async handleSMS(
    @Body() body: any,
    @Headers('x-subaccount-id') subAccountId: string
  ) {
    const { From, Body: message, To } = body;

    // Find lead by phone number
    const lead = await this.findLeadByPhone(From, subAccountId);

    // Generate response
    const response = await this.service.handleMessage(
      lead.id,
      message,
      subAccountId
    );

    // Return TwiML response
    return `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${response}</Message>
      </Response>
    `;
  }

  /**
   * Handle incoming email webhook from Postmark
   */
  @Post('webhook/email')
  async handleEmail(
    @Body() body: any,
    @Headers('x-subaccount-id') subAccountId: string
  ) {
    const { From, Subject, TextBody } = body;

    // Find lead by email
    const lead = await this.findLeadByEmail(From, subAccountId);

    // Generate response
    const response = await this.service.handleMessage(
      lead.id,
      `Subject: ${Subject}\n\n${TextBody}`,
      subAccountId
    );

    // Send response via email (handled by agent's tools)
    return { status: 'processed' };
  }

  /**
   * Test endpoint for direct messaging
   */
  @Post('test/message')
  async testMessage(@Body() body: { leadId: string; message: string; subAccountId: string }) {
    const response = await this.service.handleMessage(
      body.leadId,
      body.message,
      body.subAccountId
    );

    return { response };
  }

  private async findLeadByPhone(phone: string, subAccountId: string) {
    // Implementation...
  }

  private async findLeadByEmail(email: string, subAccountId: string) {
    // Implementation...
  }
}
```

---

## Performance Analysis

### Memory Usage

```
Single Request:
- Factory (shared): ~10MB (one-time)
- Agent instance: ~5KB
- Total per request: ~5KB

100 Concurrent Requests:
- Factory (shared): ~10MB
- 100 agents: ~500KB
- Total: ~10.5MB
```

### Time Analysis

```
Startup (once):
- Factory initialization: ~500ms

Per Request:
- Fetch lead + strategy from DB: 10-20ms
- Create agent: 50ms
- Generate AI response: 1-2 seconds
- Dispose agent: <5ms
- Total: ~1-2 seconds

Bottleneck: OpenAI API, not agent creation
```

### Scalability

```
✅ 10 concurrent: ~10.05MB memory
✅ 100 concurrent: ~10.5MB memory
✅ 1000 concurrent: ~15MB memory (still fine!)

CPU usage scales linearly (mostly I/O bound)
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('AIReceptionistFactory', () => {
  it('should create factory', async () => {
    const factory = await AIReceptionistFactory.create({...});
    expect(factory).toBeDefined();
  });

  it('should create multiple agents concurrently', async () => {
    const factory = await AIReceptionistFactory.create({...});

    const agents = await Promise.all([
      factory.createAgent({ identity: { name: 'Agent1', role: 'Sales' } }),
      factory.createAgent({ identity: { name: 'Agent2', role: 'Support' } }),
      factory.createAgent({ identity: { name: 'Agent3', role: 'Sales' } })
    ]);

    expect(agents).toHaveLength(3);

    // Cleanup
    await Promise.all(agents.map(a => a.dispose()));
  });

  it('should share providers across agents', async () => {
    const factory = await AIReceptionistFactory.create({...});
    const registry = factory.getProviderRegistry();

    const agent1 = await factory.createAgent({...});
    const agent2 = await factory.createAgent({...});

    // Both agents use same provider registry
    expect(agent1.agent['providerRegistry']).toBe(registry);
    expect(agent2.agent['providerRegistry']).toBe(registry);
  });
});
```

### Integration Tests

```typescript
describe('AIReceptionistService', () => {
  it('should handle concurrent messages', async () => {
    const messages = Array.from({ length: 100 }, (_, i) => ({
      leadId: `lead-${i}`,
      message: `Test message ${i}`,
      subAccountId: 'test-account'
    }));

    const startTime = Date.now();

    const responses = await Promise.all(
      messages.map(m => service.handleMessage(m.leadId, m.message, m.subAccountId))
    );

    const duration = Date.now() - startTime;

    expect(responses).toHaveLength(100);
    expect(duration).toBeLessThan(5000); // Should complete in <5s
  });
});
```

### Load Tests

```bash
# Apache Bench
ab -n 1000 -c 100 -T 'application/json' \
  -p test-payload.json \
  http://localhost:8000/ai-receptionist/test/message

# Expected results:
# - 100 concurrent requests
# - Average response time: 1-2 seconds
# - Memory stable at ~10-15MB
# - No memory leaks
```

---

## Deployment Steps

### Phase 1: SDK Changes
1. ✅ Create `factory.ts` in SDK
2. ✅ Export factory from `index.ts`
3. ✅ Add types for factory config
4. ✅ Write SDK tests
5. ✅ Publish new SDK version

### Phase 2: Database Migration
1. ✅ Add Strategy table to Prisma schema
2. ✅ Run migration: `npx prisma migrate dev`
3. ✅ Seed test strategies
4. ✅ Update Lead table with strategyId

### Phase 3: Backend Integration
1. ✅ Update `package.json` to new SDK version
2. ✅ Create StrategyService
3. ✅ Update AIReceptionistTestService to use factory
4. ✅ Update controllers for webhooks
5. ✅ Add strategy management endpoints (CRUD)

### Phase 4: Testing
1. ✅ Unit tests for StrategyService
2. ✅ Integration tests for message handling
3. ✅ Load tests (100 concurrent requests)
4. ✅ Memory profiling

### Phase 5: Production Rollout
1. ✅ Deploy to staging
2. ✅ Monitor memory and performance
3. ✅ Gradual rollout to production
4. ✅ Setup monitoring/alerting

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Add metrics to service
private metrics = {
  agentCreations: 0,
  agentDisposals: 0,
  activeAgents: 0,
  avgResponseTime: 0,
  errors: 0
};

async handleMessage(...) {
  this.metrics.agentCreations++;
  this.metrics.activeAgents++;
  const start = Date.now();

  try {
    // ... handle message
  } finally {
    this.metrics.agentDisposals++;
    this.metrics.activeAgents--;
    this.metrics.avgResponseTime = (Date.now() - start + this.metrics.avgResponseTime) / 2;
  }
}

// Expose metrics endpoint
@Get('metrics')
getMetrics() {
  return this.metrics;
}
```

### Logging

```typescript
this.logger.log({
  event: 'agent_created',
  leadId,
  strategyId: lead.strategyId,
  duration: Date.now() - start,
  memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
});
```

---

## Future Optimizations

### 1. Agent Pooling (If Needed)
```typescript
class AgentPool {
  private pool: AgentInstance[] = [];

  async acquire() {
    return this.pool.pop() || await this.factory.createAgent({...});
  }

  release(agent: AgentInstance) {
    agent.reset(); // Clear memory/state
    this.pool.push(agent);
  }
}
```

### 2. Strategy Caching with TTL
```typescript
private strategyCache = new LRUCache<string, Strategy>({
  max: 100,
  ttl: 5 * 60000 // 5 minutes
});
```

### 3. Horizontal Scaling
- Run multiple backend instances
- Factory per instance
- Load balancer distributes requests

---

## Timeline Estimate

- **SDK Factory Implementation**: 4 hours
- **Prisma Schema + Migration**: 2 hours
- **StrategyService Implementation**: 3 hours
- **Service + Controller Updates**: 3 hours
- **Testing**: 4 hours
- **Documentation**: 2 hours
- **Deployment + Monitoring**: 2 hours
- **Total**: ~20 hours (~2.5 days)

---

## Success Criteria

- ✅ Handle 100 concurrent requests without memory leaks
- ✅ Average response time <2 seconds
- ✅ Memory usage stable at ~10-15MB
- ✅ Strategy changes apply immediately (no stale cache)
- ✅ Each lead gets isolated agent instance
- ✅ No data leakage between leads
- ✅ Clean disposal of agents after each request
- ✅ Proper error handling and logging
