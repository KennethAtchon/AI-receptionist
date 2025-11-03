# Factory Pattern Guide

## Overview

The AI Receptionist SDK now supports a **Factory Pattern** for efficient concurrent request handling in server environments. This pattern allows you to initialize expensive resources once (providers, storage, tools) and create lightweight agent instances per-request.

## When to Use

### ✅ Use Factory Pattern When:
- Building server applications (NestJS, Express, etc.)
- Handling multiple concurrent requests (webhooks, APIs)
- Need different agent configurations per request/lead/strategy
- Want to minimize memory usage and improve performance
- Deploying to production with 10-100+ concurrent users

### ✅ Use Legacy Pattern When:
- Building simple scripts or CLI tools
- Running a single long-lived agent
- Prototyping or testing
- Don't need per-request customization

## Patterns Comparison

| Feature | Legacy Per-Agent | Factory Pattern |
|---------|-----------------|-----------------|
| **Setup Complexity** | Simple | Medium |
| **Memory (100 agents)** | 1.7GB | 11.5MB |
| **Agent Creation** | ~500ms | ~50ms |
| **Concurrent Requests** | Not efficient | Optimized |
| **Use Case** | Dev, single-agent | Production, multi-tenant |

## Quick Start

### 1. Initialize Factory (Once at Startup)

```typescript
import { AIReceptionistFactory } from '@atchonk/ai-receptionist';

// Initialize factory ONCE at application startup
const factory = await AIReceptionistFactory.create({
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500
  },
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      }
    },
    email: {
      postmark: {
        apiKey: process.env.POSTMARK_API_KEY,
        fromEmail: 'noreply@example.com',
        fromName: 'AI Receptionist'
      }
    }
  },
  storage: {
    type: 'database',
    database: {
      db: prisma, // Your Drizzle/Prisma instance
      autoMigrate: true
    }
  },
  tools: {
    defaults: ['calendar', 'booking']
  },
  debug: false
});
```

### 2. Create Agents Per-Request

```typescript
// PER-REQUEST: Create lightweight agent (~50ms, ~5KB)
const agent = await factory.createAgent({
  customSystemPrompt: `You are Sarah, a sales assistant for Acme Corp.
Your goal is to qualify leads and book appointments.
Be friendly, consultative, and focus on customer needs.`
});

// Use the agent
const response = await agent.text.generate({
  message: userMessage,
  sessionId: leadId // Used for memory isolation
});

// IMPORTANT: Always cleanup
await agent.dispose();
```

### 3. Cleanup on Shutdown

```typescript
// On application shutdown
await factory.dispose();
```

## NestJS Integration Example

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIReceptionistFactory, AgentInstance } from '@atchonk/ai-receptionist';

@Injectable()
export class AIReceptionistService implements OnModuleInit, OnModuleDestroy {
  private factory!: AIReceptionistFactory;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  async onModuleInit() {
    this.factory = await AIReceptionistFactory.create({
      model: {
        provider: 'openai',
        apiKey: this.configService.get('OPENAI_API_KEY'),
        model: 'gpt-4o-mini'
      },
      providers: {
        communication: {
          twilio: {
            accountSid: this.configService.get('TWILIO_ACCOUNT_SID'),
            authToken: this.configService.get('TWILIO_AUTH_TOKEN'),
            phoneNumber: this.configService.get('TWILIO_PHONE_NUMBER')
          }
        }
      },
      storage: {
        type: 'database',
        database: {
          db: this.prisma,
          autoMigrate: true
        }
      }
    });
  }

  async onModuleDestroy() {
    await this.factory.dispose();
  }

  async handleMessage(leadId: string, message: string) {
    // Fetch lead and strategy from database
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { strategy: true }
    });

    // Build custom prompt from strategy
    const systemPrompt = this.buildSystemPrompt(lead.strategy);

    // Create agent for this request
    const agent = await this.factory.createAgent({
      customSystemPrompt: systemPrompt
    });

    try {
      const response = await agent.text.generate({
        message,
        sessionId: leadId
      });

      return response.content;
    } finally {
      await agent.dispose();
    }
  }

  private buildSystemPrompt(strategy: Strategy): string {
    return `You are ${strategy.agentName}, a ${strategy.agentRole}.
${strategy.customInstructions}`;
  }
}
```

## Memory Architecture

### Shared Resources (One-Time Initialization)
- **ProviderRegistry**: Twilio, OpenAI, Postmark clients (~10MB)
- **DatabaseStorage**: One database connection pool (~10KB)
- **LongTermMemory**: Shared cache Map for all agents (~10KB + cache)
- **ToolRegistry**: Stateless tools registered once (~10KB)

**Total**: ~11MB one-time cost

### Per-Agent Resources (Created Per-Request)
- **Agent instance**: Identity, personality, goals (~1KB)
- **ShortTermMemory**: Conversation context (20 messages) (~2KB)
- **SystemPromptBuilder**: Stateless utilities (~500 bytes)
- **ToolStore**: Binds to agent's memory (~100 bytes)

**Total**: ~5KB per agent

### Result
- **Before (Legacy)**: 17MB × 100 agents = 1.7GB
- **After (Factory)**: 11MB + (5KB × 100) = 11.5MB
- **Savings**: 32% memory reduction + 90% faster agent creation

## Shared Memory Benefits

### Conversation History Sharing
All agents share the same LongTermMemory instance, which means:

```typescript
// Agent 1 stores a message
const agent1 = await factory.createAgent({ /* ... */ });
await agent1.text.generate({
  message: 'My name is John',
  sessionId: 'lead-123'
});
await agent1.dispose();

// Agent 2 (different instance) can access the same conversation
const agent2 = await factory.createAgent({ /* ... */ });
await agent2.text.generate({
  message: 'What is my name?',
  sessionId: 'lead-123' // Same session = shared history
});
// Response: "Your name is John"
```

### Memory Isolation by Session
- Each conversation is isolated by `sessionId` (typically the leadId)
- Agents can't access memories from other sessions
- Concurrent requests with different sessionIds are fully isolated

## Hybrid Pattern (Per-Agent Storage)

If you need shared providers but isolated storage per tenant:

```typescript
const factory = await AIReceptionistFactory.create({
  model: { /* ... */ },
  providers: { /* ... */ },
  // NO shared storage
});

// Create agent with per-tenant storage
const agent = await factory.createAgent({
  customSystemPrompt: '...',
  memory: {
    longTermStorage: new DatabaseStorage({ db: tenant1Db }) // Override
  }
});
```

## Performance Characteristics

### Factory Initialization (Once)
- **Time**: ~500ms
- **Memory**: ~11MB
- **When**: Application startup

### Agent Creation (Per-Request)
- **Time**: ~50ms
- **Memory**: ~5KB
- **When**: Every request/webhook

### Agent Disposal (Per-Request)
- **Time**: <10ms
- **When**: After request completes

### AI Response Generation
- **Time**: 1-2 seconds (depends on OpenAI)
- **Bottleneck**: AI provider, not agent system

## Best Practices

### ✅ DO:
- Initialize factory once at application startup
- Create agents per-request with custom prompts
- Always dispose agents after use (use try/finally)
- Use sessionId for memory isolation (e.g., leadId)
- Handle errors gracefully

### ❌ DON'T:
- Create multiple factory instances
- Reuse agent instances across requests
- Forget to dispose agents
- Share agents between concurrent requests
- Store agent instances in memory

## Monitoring

Add metrics to track factory performance:

```typescript
const metrics = {
  agentCreations: 0,
  agentDisposals: 0,
  activeAgents: 0,
  avgResponseTime: 0
};

const agent = await factory.createAgent({ /* ... */ });
metrics.agentCreations++;
metrics.activeAgents++;

try {
  // Use agent
} finally {
  await agent.dispose();
  metrics.agentDisposals++;
  metrics.activeAgents--;
}
```

## Troubleshooting

### "Factory not initialized"
- Ensure you called `AIReceptionistFactory.create()` before using `createAgent()`
- Check that factory initialization completed successfully

### Memory leaks
- Ensure you're calling `agent.dispose()` after every request
- Use try/finally blocks to guarantee cleanup
- Monitor `activeAgents` metric

### Slow agent creation
- Factory initialization is one-time (~500ms), not per-agent
- Per-agent creation should be <100ms
- If slower, check network latency to providers

### Shared memory not working
- Ensure you're using the same `sessionId` for related messages
- Verify storage configuration in factory
- Check that you're not overriding with per-agent storage

## Migration from Legacy Pattern

### Before (Legacy)
```typescript
const receptionist = new AIReceptionist({
  agent: { /* ... */ },
  model: { /* ... */ },
  providers: { /* ... */ }
});

await receptionist.initialize();
const response = await receptionist.text.generate({ /* ... */ });
```

### After (Factory)
```typescript
// Once at startup
const factory = await AIReceptionistFactory.create({
  model: { /* ... */ },
  providers: { /* ... */ }
});

// Per-request
const agent = await factory.createAgent({
  customSystemPrompt: '...'
});

try {
  const response = await agent.text.generate({ /* ... */ });
} finally {
  await agent.dispose();
}
```

## Further Reading

- [Master Plan](./improvement/MASTER-PLAN-factory-refactor.md) - Full architectural documentation
- [Example Code](../examples/factory-pattern-usage.ts) - Complete working examples
- [API Reference](./API.md) - Detailed API documentation
