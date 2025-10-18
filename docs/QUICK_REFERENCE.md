# Quick Reference Card

One-page reference for common SDK operations.

---

## Agent Definition

```typescript
const agent = new AIReceptionist({
  // REQUIRED: Agent personality
  agent: {
    name: 'Sarah',                          // Agent name (required)
    role: 'Sales Representative',           // Agent role (required)
    personality: 'friendly, enthusiastic',  // Personality traits
    instructions: 'Always qualify leads',   // Guidelines
    tone: 'professional',                   // Tone style
    systemPrompt: '...',                    // Custom (overrides auto)
  },

  // REQUIRED: AI model
  model: {
    provider: 'openrouter',                          // 'openai' | 'openrouter'
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: OPENROUTER_MODELS.anthropic.claude35Sonnet,
    temperature: 0.7,
    maxTokens: 1000,
  },

  // OPTIONAL: Tools
  tools: {
    defaults: ['calendar', 'booking'],     // Standard tools
    custom: [customTool1, customTool2],    // Your tools
  },

  // OPTIONAL: Providers
  providers: {
    communication: {
      twilio: { accountSid: '...', authToken: '...', phoneNumber: '...' }
    },
    calendar: {
      google: { apiKey: '...', calendarId: '...' }
    }
  }
});

await agent.initialize();
```

---

## Custom Tools

### Simple Tool
```typescript
import { Tools } from '@loctelli/ai-receptionist';

const tool = Tools.custom({
  name: 'check_stock',
  description: 'Check product inventory',
  parameters: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'Product SKU' }
    },
    required: ['productId']
  },
  handler: async (params, context) => {
    const stock = await getStock(params.productId);
    return {
      success: true,
      data: { stock },
      response: {
        speak: `We have ${stock} units in stock.`,
        message: `Stock: ${stock} units`
      }
    };
  }
});
```

### Advanced Tool (Channel-Specific)
```typescript
import { ToolBuilder } from '@loctelli/ai-receptionist';

const tool = new ToolBuilder()
  .withName('book_appointment')
  .withDescription('Book customer appointment')
  .withParameters({ /* schema */ })
  .onCall(async (params, ctx) => {
    return {
      success: true,
      response: { speak: 'Appointment booked! Confirmation sent.' }
    };
  })
  .onSMS(async (params, ctx) => {
    return {
      success: true,
      response: { message: 'Booked! Conf: ABC123' }
    };
  })
  .default(async (params, ctx) => {
    return {
      success: true,
      response: { text: 'Appointment booked' }
    };
  })
  .build();
```

---

## OpenRouter Model Switching

```typescript
import { OPENROUTER_MODELS } from '@loctelli/ai-receptionist';

const agent = new AIReceptionist({
  model: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: OPENROUTER_MODELS.anthropic.claude35Sonnet,
  },
  /* ... */
});

await agent.initialize();
const provider = agent['aiProvider'];

// Switch models
provider.setModel(OPENROUTER_MODELS.openai.gpt4Turbo);
provider.setModel(OPENROUTER_MODELS.google.geminiPro15);
provider.setModel(OPENROUTER_MODELS.meta.llama3_70b);

// Current model
console.log(provider.getCurrentModel());

// List available
const models = await provider.listAvailableModels();

// Validate
const isValid = await provider.validateModel('anthropic/claude-3-opus');
```

**Available Models:**
- `OPENROUTER_MODELS.openai.*` - gpt4Turbo, gpt4, gpt35Turbo
- `OPENROUTER_MODELS.anthropic.*` - claude35Sonnet, claude3Opus, claude3Sonnet, claude3Haiku
- `OPENROUTER_MODELS.google.*` - geminiPro, geminiPro15
- `OPENROUTER_MODELS.meta.*` - llama3_70b, llama3_8b
- `OPENROUTER_MODELS.mistral.*` - mistralLarge, mistralMedium, mixtral

---

## Clone Pattern (Multi-Agent)

```typescript
// Base agent
const baseAgent = new AIReceptionist({
  agent: { name: 'Base', role: 'Agent' },
  model: { provider: 'openrouter', apiKey: '...', model: '...' },
  providers: { communication: { twilio: { /* shared */ } } }
});

await baseAgent.initialize();

// Clone for sales
const salesAgent = baseAgent.clone({
  agent: { name: 'Sarah', role: 'Sales', personality: 'enthusiastic' },
  tools: { custom: [salesTools] }
});

// Clone for support
const supportAgent = baseAgent.clone({
  agent: { name: 'Bob', role: 'Support', personality: 'patient' },
  tools: { custom: [supportTools] }
});

await salesAgent.initialize();
await supportAgent.initialize();
```

---

## Runtime Tool Management

```typescript
const registry = agent.getToolRegistry();

// Add tool
registry.register(myTool);

// Remove tool
registry.unregister('tool-name');

// List all tools
const allTools = registry.getAll();

// List tools for specific channel
const callTools = registry.listAvailable('call');
const smsTools = registry.listAvailable('sms');

// Count
console.log(`Total tools: ${registry.count()}`);
```

---

## Communication Channels

### Voice Calls
```typescript
await agent.calls.make({
  to: '+1234567890',
  metadata: { campaign: 'summer-sale' }
});
```

### SMS
```typescript
await agent.sms.send({
  to: '+1234567890',
  body: 'Your appointment is confirmed!',
  metadata: { type: 'confirmation' }
});
```

### Email
```typescript
await agent.email.send({
  to: 'user@example.com',
  subject: 'Appointment Confirmation',
  body: 'Your appointment is confirmed...',
  html: '<h2>Confirmed</h2>...',
  metadata: { type: 'confirmation' }
});
```

---

## Event Callbacks

```typescript
const agent = new AIReceptionist({
  /* ... */

  onToolExecute: (event) => {
    console.log(`Tool: ${event.toolName} (${event.duration}ms)`);
  },

  onToolError: (event) => {
    console.error(`Tool error: ${event.toolName}`, event.error);
  },

  onConversationStart: (event) => {
    console.log(`Conversation started: ${event.channel}`);
  },

  onConversationEnd: (event) => {
    console.log(`Conversation ended: ${event.conversationId}`);
  }
});
```

---

## Custom Storage

```typescript
import { IConversationStore, Conversation } from '@loctelli/ai-receptionist';

class MyDatabaseStore implements IConversationStore {
  constructor(private db: Database) {}

  async save(conversation: Conversation): Promise<void> {
    await this.db.conversations.insert(conversation);
  }

  async get(id: string): Promise<Conversation | null> {
    return await this.db.conversations.findById(id);
  }

  async update(id: string, updates: Partial<Conversation>): Promise<void> {
    await this.db.conversations.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.db.conversations.delete(id);
  }

  async list(filters?: ConversationFilters): Promise<Conversation[]> {
    return await this.db.conversations.find(filters);
  }

  async getByCallId(callSid: string): Promise<Conversation | null> {
    return await this.db.conversations.findOne({ callSid });
  }

  async getByMessageId(messageSid: string): Promise<Conversation | null> {
    return await this.db.conversations.findOne({ messageSid });
  }
}

const agent = new AIReceptionist({
  /* ... */
  conversationStore: new MyDatabaseStore(myDB)
});
```

---

## System Prompt Examples

### Auto-Generated (Recommended)
```typescript
agent: {
  name: 'Sarah',
  role: 'Sales Rep',
  personality: 'friendly, enthusiastic',
  instructions: 'Always qualify leads before booking demos'
}

// Generates:
// "You are Sarah, a Sales Rep. friendly, enthusiastic
//
// Always qualify leads before booking demos"
```

### Custom System Prompt
```typescript
agent: {
  name: 'Sarah',
  role: 'Sales Rep',
  systemPrompt: `You are Sarah, a B2B SaaS sales expert.

IDENTITY:
- 10 years experience in enterprise sales
- Consultative, not pushy approach

WORKFLOW:
1. Build rapport
2. Qualify with BANT
3. Present solution
4. Handle objections
5. Schedule next steps

RULES:
- Never discount without approval
- Focus on value over price
- Follow up within 24h

TONE: Professional, warm, solution-focused`
}
```

---

## Environment Variables

```bash
# OpenRouter
OPENROUTER_API_KEY=your-key-here

# OpenAI (if using)
OPENAI_API_KEY=your-key-here

# Twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Google Calendar (if using)
GOOGLE_API_KEY=your-key
GOOGLE_CALENDAR_ID=your-calendar-id

# Optional
APP_URL=https://yourapp.com
```

---

## Type Imports

```typescript
import type {
  // Main
  AIReceptionistConfig,
  AgentConfig,
  AIModelConfig,

  // Tools
  ITool,
  ToolHandler,
  ToolResult,
  ExecutionContext,

  // Conversations
  Conversation,
  ConversationMessage,
  IConversationStore,

  // Providers
  TwilioConfig,
  GoogleCalendarConfig,

  // Events
  ToolExecutionEvent,
  ToolErrorEvent,
  ConversationEvent,
} from '@loctelli/ai-receptionist';
```

---

## Common Patterns

### Error Handling in Tools
```typescript
handler: async (params, context) => {
  try {
    const result = await myAPI.call(params);
    return {
      success: true,
      data: result,
      response: { speak: 'Done!' }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      response: {
        speak: 'Sorry, something went wrong. Let me try again.'
      }
    };
  }
}
```

### Conditional Tool Logic
```typescript
handler: async (params, context) => {
  // Check which channel
  if (context.channel === 'call') {
    // Voice-specific logic
  } else if (context.channel === 'sms') {
    // SMS-specific logic
  }

  // Access agent info
  console.log('Agent:', context.agent.name);

  // Access conversation
  console.log('Conversation:', context.conversationId);
}
```

### A/B Testing Models
```typescript
const models = [
  OPENROUTER_MODELS.openai.gpt4Turbo,
  OPENROUTER_MODELS.anthropic.claude35Sonnet,
  OPENROUTER_MODELS.google.geminiPro15,
];

for (const model of models) {
  provider.setModel(model);
  const response = await agent.chat('test-user', { message: 'Hello' });
  console.log(`${model}: ${response.content}`);
}
```

---

## Documentation Links

- [README.md](../README.md) - Main documentation
- [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) - Complete agent guide
- [OPENROUTER.md](./OPENROUTER.md) - Model switching guide
- [examples/](../examples/) - Usage examples
