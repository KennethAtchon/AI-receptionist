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

### 2. Agent-Centric Design

Each `AIReceptionist` instance represents one AI agent with unified personality across all channels.

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

### 5. Configurable Storage

**Development (in-memory):**
```typescript
const client = new AIReceptionist({
  // ... config
  // Defaults to InMemoryConversationStore
});
```

**Production (persistent):**
```typescript
import { IConversationStore } from '@loctelli/ai-receptionist';

class DatabaseConversationStore implements IConversationStore {
  constructor(private db: Database) {}

  async save(conversation: Conversation): Promise<void> {
    await this.db.conversations.create(conversation);
  }

  // ... implement other methods
}

const client = new AIReceptionist({
  // ... config
  conversationStore: new DatabaseConversationStore(db)
});
```

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

## What's Implemented (Barebones)

✅ Complete type system
✅ Provider layer (Twilio, OpenAI, Google Calendar)
✅ Service layer (Conversation, ToolExecution, Call)
✅ Tool registry and builder
✅ Resource layer (Calls, SMS, Email)
✅ Main AIReceptionist client with clone pattern
✅ In-memory conversation store
✅ Standard tools (calendar, booking, CRM) - placeholder implementations
✅ Event callbacks for monitoring
✅ Comprehensive example

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
