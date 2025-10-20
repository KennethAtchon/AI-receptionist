# AI Receptionist SDK - New Architecture 🚀

**Agent-centric AI communication SDK with extensible tool system and multi-channel support**

## Overview

This is a barebones implementation showcasing the new architecture vision:

- **Agent-Centric**: AI agent is the primary entity, channels are communication methods
- **Provider Pattern**: Clean abstraction for external APIs (Twilio, OpenAI, Google Calendar, etc.)
- **Service Layer**: Business logic separated from resources and providers
- **Tool Registry**: Flexible, extensible tool system with channel-specific handlers
- **Clone Pattern**: Easy multi-agent setup with shared infrastructure

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AIReceptionist (Agent)                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Calls      │  │     SMS      │  │    Email     │          │
│  │  Resource    │  │  Resource    │  │  Resource    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Services Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ CallService  │  │ Conversation │  │ ToolExecution│          │
│  │              │  │   Service    │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Providers Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Twilio     │  │    OpenAI    │  │    Google    │          │
│  │   Provider   │  │   Provider   │  │   Calendar   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
      Twilio API         OpenAI API       Google Calendar API
```

## Quick Start

```typescript
import { AIReceptionist, Tools } from '@loctelli/ai-receptionist';

// Create an AI agent
const sarah = new AIReceptionist({
  agent: {
    name: 'Sarah',
    role: 'Sales Representative',
    personality: 'friendly and enthusiastic'
  },

  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  },

  tools: {
    defaults: ['calendar', 'booking'],
    custom: [
      Tools.custom({
        name: 'check_inventory',
        description: 'Check product inventory',
        parameters: { /* ... */ },
        handler: async (params, ctx) => {
          // Your custom logic
          return {
            success: true,
            response: {
              speak: 'We have 42 units in stock.',
              message: 'Stock: 42 units'
            }
          };
        }
      })
    ]
  },

  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      }
    }
  }
});

// Initialize
await sarah.initialize();

// Use across different channels
await sarah.calls.make({ to: '+1234567890' });
await sarah.sms.send({ to: '+1234567890', body: 'Hello!' });
```

## Key Features

### 1. Tree-Shakable & Optimized 🌲

The SDK is built with tree-shaking in mind for minimal bundle sizes:

```typescript
// Only OpenAI + Twilio + SMS are bundled (~25 KB)
const client = new AIReceptionist({
  model: { provider: 'openai', ... },  // ✅ Only OpenAI bundled
  providers: {
    communication: { twilio: { ... } }  // ✅ Only Twilio bundled
    // No calendar = Calendar NOT bundled ✅
  }
});
```

**Bundle sizes:**
- **Core**: 24.75 KB
- **+ OpenAI**: +0.12 KB
- **+ OpenRouter**: +4.70 KB
- **+ Twilio**: +0.12 KB
- **+ Calendar**: +0.13 KB

📖 See [TREE_SHAKING.md](TREE_SHAKING.md) for optimization guide

### 1.5. OpenRouter - Dynamic Model Switching

OpenRouter provider gives you access to **100+ AI models** from multiple providers (OpenAI, Anthropic, Google, Meta, Mistral, etc.) and the ability to **switch models at runtime**.

```typescript
import { AIReceptionist, OPENROUTER_MODELS } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({
  ai: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: OPENROUTER_MODELS.anthropic.claude35Sonnet,
  },
  agent: { name: 'Alex', role: 'Assistant' }
});

await client.initialize();

// Get the provider to switch models
const provider = client['aiProvider'];

// Switch to GPT-4 Turbo
provider.setModel(OPENROUTER_MODELS.openai.gpt4Turbo);
await client.chat('user-1', { message: 'Hello from GPT-4!' });

// Switch to Google Gemini
provider.setModel(OPENROUTER_MODELS.google.geminiPro15);
await client.chat('user-1', { message: 'Hello from Gemini!' });

// Switch to Meta Llama
provider.setModel(OPENROUTER_MODELS.meta.llama3_70b);
await client.chat('user-1', { message: 'Hello from Llama!' });

// List all available models
const models = await provider.listAvailableModels();
console.log(`${models.length} models available`);

// Validate before switching
const isValid = await provider.validateModel('anthropic/claude-3-opus');
if (isValid) {
  provider.setModel('anthropic/claude-3-opus');
}
```

**Available model constants:**
- `OPENROUTER_MODELS.openai.*` - GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- `OPENROUTER_MODELS.anthropic.*` - Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- `OPENROUTER_MODELS.google.*` - Gemini Pro, Gemini Pro 1.5
- `OPENROUTER_MODELS.meta.*` - Llama 3 70B, Llama 3 8B
- `OPENROUTER_MODELS.mistral.*` - Mistral Large, Medium, Mixtral

📖 See [examples/openrouter-model-switching.ts](examples/openrouter-model-switching.ts) for complete example

### 2. Agent-Centric Design

Each `AIReceptionist` instance represents one AI agent with unified personality across all channels.

📖 **See [docs/AGENT_SYSTEM.md](docs/AGENT_SYSTEM.md) for complete guide on:**
- Defining agent personality and identity
- Building custom system prompts
- Adding tools to agents
- Complete agent examples

```typescript
// Sarah is the same agent across all channels
await sarah.calls.make({ to: '+123' });  // Sarah speaks on phone
await sarah.sms.send({ to: '+123', body: '...' });  // Sarah texts
await sarah.email.send({ to: 'user@example.com', subject: '...' });  // Sarah emails
```

### 2. Clone Pattern for Multi-Agent

Create multiple agents easily by cloning and overriding configuration:

```typescript
const sarah = new AIReceptionist({
  agent: { name: 'Sarah', role: 'Sales' },
  tools: { defaults: ['calendar', 'crm'] },
  providers: { /* shared infrastructure */ }
});

await sarah.initialize();

// Clone for Bob - shares providers but different personality/tools
const bob = sarah.clone({
  agent: { name: 'Bob', role: 'Support' },
  tools: { custom: [ticketingTool, knowledgeBaseTool] }
});

await bob.initialize();

// Each works independently
await sarah.calls.make({ to: '+111' });  // Sales call
await bob.calls.make({ to: '+222' });    // Support call
```

### 3. Channel-Specific Tool Handlers

Tools can behave differently based on communication channel:

```typescript
import { ToolBuilder } from '@loctelli/ai-receptionist';

const calendarTool = new ToolBuilder()
  .withName('book_appointment')
  .withDescription('Book customer appointment')
  .withParameters({ /* ... */ })

  // Voice call: conversational
  .onCall(async (params, ctx) => {
    return {
      success: true,
      response: {
        speak: `Perfect! I've booked your appointment for ${params.date} at ${params.time}. You'll receive a confirmation text shortly.`
      }
    };
  })

  // SMS: brief
  .onSMS(async (params, ctx) => {
    return {
      success: true,
      response: {
        message: `✓ Booked!\n${params.date} at ${params.time}\nConf: ${bookingId}`
      }
    };
  })

  // Email: formal with calendar invite
  .onEmail(async (params, ctx) => {
    return {
      success: true,
      response: {
        html: `<h2>Appointment Confirmed</h2>...`,
        attachments: [calendarInvite]
      }
    };
  })

  // Fallback for any channel
  .default(async (params, ctx) => {
    return {
      success: true,
      response: {
        text: `Appointment booked for ${params.date}`
      }
    };
  })
  .build();
```

### 4. Flexible Tool System

**Standard Tools:**
```typescript
{
  tools: {
    defaults: ['calendar', 'booking', 'crm'],
    calendar: {
      provider: 'google',
      apiKey: '...'
    }
  }
}
```

**Custom Tools:**
```typescript
{
  tools: {
    custom: [
      Tools.custom({
        name: 'check_inventory',
        description: 'Check product inventory',
        parameters: { /* JSON Schema */ },
        handler: async (params, ctx) => {
          // Your logic
        }
      })
    ]
  }
}
```

**Runtime Tool Management:**
```typescript
const registry = client.getToolRegistry();

registry.register(newTool);
registry.unregister('old-tool');

const callTools = registry.listAvailable('call');
```

### 5. Database Integration & Memory Persistence 🗄️

The SDK uses a **Memory-Centric Architecture** where the agent's memory system is the single source of truth. Database integration provides automatic persistence with **5 powerful database tools** that are auto-registered when you configure storage.

**Quick Setup with PostgreSQL:**
```typescript
import { AIReceptionist, DatabaseStorage } from '@loctelli/ai-receptionist';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

const receptionist = new AIReceptionist({
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Sales Representative'
    },
    // Configure memory with database persistence
    memory: {
      contextWindow: 20,
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({
        db,
        autoMigrate: true // Automatically creates tables
      }),
      autoPersist: {
        minImportance: 7, // Auto-save important memories
        types: ['decision', 'tool_execution', 'system']
      }
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  }
});

await receptionist.initialize();

// 5 database tools are automatically registered! 🎉
// - save_customer_info
// - find_customer
// - log_call_outcome
// - remember_preference
// - recall_preference
```

**What Gets Auto-Created:**
- `ai_receptionist_memory` - All agent memories (conversations, decisions, tool executions)
- `ai_receptionist_leads` - Customer/lead information
- `ai_receptionist_call_logs` - Call outcomes and summaries

**AI Can Now Automatically:**
```typescript
// During conversations, AI can:
// 1. Save customer info
"Can I get your email?"
→ AI calls save_customer_info({ email: 'john@example.com' })

// 2. Remember preferences
"I prefer morning appointments"
→ AI calls remember_preference({ key: 'preferred_time', value: 'morning' })

// 3. Log outcomes
After booking → AI calls log_call_outcome({
  outcome: 'appointment_booked',
  summary: 'Booked demo for Tuesday 2pm'
})

// 4. Find returning customers
→ AI calls find_customer({ email: 'john@example.com' })

// 5. Recall preferences
→ AI calls recall_preference({ key: 'preferred_time' })
```

**Supported Databases:**
- **PostgreSQL** (recommended for production)
- **MySQL** (via `drizzle-orm/mysql2`)
- **SQLite** (via `drizzle-orm/better-sqlite3`)
- **In-Memory** (for testing)

**Query Memories:**
```typescript
// Get conversation history
const history = await receptionist.agent.memory.getConversationHistory('conv_123');

// Get recent call memories
const calls = await receptionist.agent.memory.getChannelHistory('call', {
  limit: 20
});

// Advanced search
const important = await receptionist.agent.memory.search({
  type: ['decision', 'tool_execution'],
  channel: 'call',
  minImportance: 8,
  keywords: ['appointment', 'booked'],
  orderBy: 'timestamp',
  orderDirection: 'desc'
});
```

📖 **Complete Guide:** [docs/database-integration.md](docs/database-integration.md)
📖 **Example:** [examples/database-integration-example.ts](examples/database-integration-example.ts)

### 6. Event Monitoring

```typescript
const client = new AIReceptionist({
  // ... config

  onToolExecute: (event) => {
    console.log(`Tool ${event.toolName} executed in ${event.duration}ms`);
  },

  onToolError: (event) => {
    console.error(`Tool ${event.toolName} failed:`, event.error);
  },

  onConversationStart: (event) => {
    console.log(`Conversation started on ${event.channel}`);
  },

  onConversationEnd: (event) => {
    console.log(`Conversation ended: ${event.conversationId}`);
  }
});
```

## Folder Structure

```
src/
  types/
    index.ts                    # All TypeScript type definitions

  providers/                    # External API adapters
    base.provider.ts
    communication/
      twilio.provider.ts        # Twilio API adapter
    ai/
      openai.provider.ts        # OpenAI API adapter
    calendar/
      google-calendar.provider.ts
    index.ts

  services/                     # Business logic layer
    conversation.service.ts     # Conversation management
    tool-execution.service.ts   # Tool execution with monitoring
    call.service.ts             # Call-specific business logic
    index.ts

  tools/                        # Tool system
    registry.ts                 # Tool registry
    builder.ts                  # Tool builder (fluent API)
    standard/
      index.ts                  # Standard tools (calendar, booking, CRM)
    index.ts

  resources/                    # User-facing APIs
    calls.resource.ts           # Call operations
    sms.resource.ts             # SMS operations
    email.resource.ts           # Email operations
    index.ts

  storage/                      # Conversation storage
    in-memory-conversation.store.ts

  client.ts                     # Main AIReceptionist class
  index.ts                      # Public API exports

examples/
  basic-usage.ts                # Comprehensive example
```

## How It Works

### Flow: User Makes a Call

```
1. User code:
   await client.calls.make({ to: '+123' })

2. CallsResource:
   → Delegates to CallService

3. CallService:
   → Creates conversation via ConversationService
   → Gets available tools from ToolExecutionService
   → Initiates call via TwilioProvider

4. TwilioProvider:
   → Calls Twilio API
   → Returns call SID

5. When user speaks:
   → CallService.handleUserSpeech()
   → OpenAIProvider.chat() with available tools
   → If AI wants to use tool:
     → ToolExecutionService.execute()
     → ToolRegistry finds and runs handler
     → Returns result to AI
   → Final AI response sent back to user
```

### Flow: Tool Execution

```
1. AI decides to use "check_calendar" tool

2. ToolExecutionService.execute():
   → Gets tool from ToolRegistry
   → Determines channel (call/sms/email)
   → Selects appropriate handler

3. ToolRegistry.execute():
   → Runs channel-specific handler (e.g., onCall)
   → Or falls back to default handler

4. Handler returns ToolResult:
   {
     success: true,
     data: { slots: [...] },
     response: {
       speak: "I have 3 times available...",  // For calls
       message: "Available: 9am, 2pm, 4pm",   // For SMS
       html: "<ul><li>9:00 AM</li>...</ul>"   // For email
     }
   }

5. Result fed back to AI for final response
```

## Design Patterns Used

1. **Provider Pattern (Adapter)** - Clean abstraction for external APIs
2. **Service Layer Pattern** - Business logic separated from resources
3. **Registry Pattern** - Centralized tool management
4. **Builder Pattern** - Fluent API for creating tools
5. **Strategy Pattern** - Channel-specific tool handlers
6. **Clone Pattern** - Easy multi-agent setup

## What's Implemented

✅ Complete type system
✅ Provider layer (Twilio, OpenAI, OpenRouter, Google Calendar)
✅ Service layer (Conversation, ToolExecution, Call)
✅ Tool registry and builder
✅ Resource layer (Calls, SMS, Email)
✅ Main AIReceptionist client with clone pattern
✅ **Six-Pillar Agent Architecture** (Identity, Personality, Knowledge, Capabilities, Memory, Goals)
✅ **Memory-Centric Architecture** with database persistence
✅ **Database Storage** (PostgreSQL, MySQL, SQLite support)
✅ **5 Auto-Registered Database Tools** (save_customer_info, find_customer, log_call_outcome, remember_preference, recall_preference)
✅ **In-memory storage** for testing
✅ Standard tools (calendar, booking, CRM) - placeholder implementations
✅ Event callbacks for monitoring
✅ **Runtime pillar updates** via PillarManager
✅ **MCP (Model Context Protocol) adapter**
✅ Comprehensive examples and documentation

## What's TODO (Actual Implementation)

- [ ] Actual Twilio API integration
- [ ] Actual OpenAI API integration
- [ ] Actual Google Calendar API integration
- [ ] Complete CallService webhook handlers
- [ ] SMS conversation management
- [ ] Email conversation management
- [ ] Standard tool real implementations
- [ ] Error handling and retry logic
- [ ] Rate limiting
- [ ] Logging system
- [ ] Testing suite
- [ ] Documentation
- [ ] Migration guide from old architecture

## Comparison: Old vs New

### Old Architecture (Orchestrator-based)

```
AIReceptionist
  ├─ CallsResource → TwilioOrchestrator → Twilio
  ├─ SMSResource → TwilioOrchestrator → Twilio
  └─ EmailResource → EmailOrchestrator → Email API

Issues:
- Tight coupling
- No service layer
- No tool system
- Channel-centric (not agent-centric)
```

### New Architecture (Agent-centric)

```
AIReceptionist (Agent)
  ├─ CallsResource → CallService → TwilioProvider → Twilio
  ├─ SMSResource → SMSService → TwilioProvider → Twilio
  └─ EmailResource → EmailService → EmailProvider → Email API

Services Layer:
- ConversationService (manages state)
- ToolExecutionService (manages tools)
- CallService, SMSService, etc. (business logic)

Benefits:
- Clean separation of concerns
- Flexible tool system
- Agent is primary entity
- Easy to test and extend
```

## Migration Path

See [Design_Improvements.md](Design_Improvements.md) for detailed migration strategy.

**Phase 1**: Rename orchestrators → providers
**Phase 2**: Introduce service layer and tool system
**Phase 3**: Refactor to agent-centric
**Phase 4**: Advanced features

## Next Steps

1. **Review this barebones implementation** - Does the architecture match your vision?
2. **Decide on priorities** - What to implement first?
3. **Start implementation** - I can help with:
   - Actual API integrations (Twilio, OpenAI, etc.)
   - Complete service implementations
   - Testing infrastructure
   - Documentation

## Notes

- All current implementations are **placeholders** showing **how things should work**
- No actual API calls are made (just console.log statements)
- This is a **structural blueprint** for the real implementation
- Old code is backed up in `_old_backup/` folder

---

**Questions? Feedback? Let's discuss and refine! 🎯**
