# @atchonk/ai-receptionist

**Autonomous AI agent for handling voice calls, SMS, and email communications**

[![npm version](https://img.shields.io/npm/v/@atchonk/ai-receptionist.svg)](https://www.npmjs.com/package/@atchonk/ai-receptionist)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An AI-powered receptionist SDK that autonomously handles customer communications across multiple channels. Configure your agent once, and it manages conversations, books appointments, sends confirmations, and maintains context without additional code.

## Features

- **Multi-channel communication**: Voice calls, SMS, and email
- **Autonomous decision-making**: AI selects and executes tools based on context
- **Persistent memory**: Remembers customers and preferences across sessions
- **Extensible tool system**: Built-in calendar, CRM, and communication tools
- **Factory pattern**: Efficient concurrent agent creation for server environments
- **Provider-agnostic**: Supports OpenAI, OpenRouter (100+ models), Twilio, Postmark, Google Calendar

## Installation

```bash
npm install @atchonk/ai-receptionist
```

## Quick Start

### Basic Usage

```typescript
import { AIReceptionist } from '@atchonk/ai-receptionist';

const agent = new AIReceptionist({
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Sales Representative',
      organization: 'Acme Corp'
    },
    personality: {
      traits: [
        { name: 'friendly', description: 'Warm and welcoming' },
        { name: 'professional', description: 'Maintains professionalism' }
      ],
      communicationStyle: {
        primary: 'consultative',
        tone: 'friendly',
        formalityLevel: 7
      }
    },
    knowledge: {
      domain: 'B2B SaaS sales',
      expertise: ['lead qualification', 'appointment booking', 'product demos']
    },
    goals: {
      primary: 'Qualify leads and book product demos',
      secondary: ['Gather lead information', 'Handle objections professionally']
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
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
        fromEmail: 'sarah@acme.com'
      }
    },
    calendar: {
      google: {
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY,
        calendarId: process.env.GOOGLE_CALENDAR_ID
      }
    }
  }
});

await agent.initialize();
```

### Webhook Setup

```typescript
import express from 'express';
const app = express();

// Voice calls
app.post('/webhooks/voice',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const twiml = await agent.handleVoiceWebhook(req.body);
    res.type('text/xml').send(twiml);
  }
);

// SMS
app.post('/webhooks/sms',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const twiml = await agent.handleSMSWebhook(req.body);
    res.type('text/xml').send(twiml);
  }
);

// Email
app.post('/webhooks/email',
  express.json(),
  async (req, res) => {
    await agent.handleEmailWebhook(req.body);
    res.json({ success: true });
  }
);

app.listen(3000);
```

### Factory Pattern (Server Environments)

For high-concurrency server environments, use the factory pattern to initialize shared resources once and create lightweight agent instances per request:

```typescript
import { AIReceptionistFactory } from '@atchonk/ai-receptionist';

// Initialize factory once at application startup
const factory = await AIReceptionistFactory.create({
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  },
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      }
    }
  },
  storage: {
    type: 'database',
    database: {
      connectionString: process.env.DATABASE_URL,
      autoMigrate: true
    }
  }
});

// Create lightweight agent instances per request
app.post('/webhooks/voice', async (req, res) => {
  const agentInstance = await factory.createAgent({
    identity: { name: 'Sarah', role: 'Sales' }
  });
  
  const twiml = await agentInstance.voice.handleWebhook(req.body);
  res.type('text/xml').send(twiml);
  
  await agentInstance.dispose();
});
```

## Agent Configuration

Agents are configured through five core pillars:

### 1. Identity

Defines who the agent is:

```typescript
identity: {
  name: 'Sarah',
  role: 'Sales Representative',
  organization: 'Acme Corp',
  title: 'Senior Sales Specialist',
  authorityLevel: 'medium',
  specializations: ['lead qualification', 'product demos']
}
```

### 2. Personality

Defines how the agent behaves:

```typescript
personality: {
  traits: [
    { name: 'friendly', description: 'Warm and welcoming' },
    { name: 'professional', description: 'Maintains professionalism' }
  ],
  communicationStyle: {
    primary: 'consultative',  // consultative | transactional | educational
    tone: 'friendly',          // formal | friendly | casual
    formalityLevel: 7          // 1-10 scale
  },
  emotionalIntelligence: 'high',
  adaptability: 'high'
}
```

### 3. Knowledge

Defines what the agent knows:

```typescript
knowledge: {
  domain: 'B2B SaaS sales and customer success',
  expertise: ['lead qualification', 'pricing discussions', 'product demos'],
  industries: ['SaaS', 'Technology', 'Professional Services'],
  contextDocs: [
    'Product Features: Our platform offers...',
    'Pricing Tiers: Starter ($99/mo), Professional ($299/mo)...'
  ],
  languages: {
    fluent: ['English'],
    conversational: ['Spanish']
  }
}
```

### 4. Goals

Defines what the agent aims to achieve:

```typescript
goals: {
  primary: 'Qualify leads and book product demos',
  secondary: [
    'Gather information about lead needs and budget',
    'Handle objections professionally'
  ],
  constraints: [
    'Never discuss pricing over email',
    'Always confirm appointments via email'
  ]
}
```

### 5. Memory

Defines what the agent remembers:

```typescript
memory: {
  contextWindow: 20,           // Number of recent messages to remember
  longTermEnabled: true,       // Enable persistent memory
  longTermStorage: databaseStorage,
  autoPersist: {
    minImportance: 7,          // Auto-save memories with importance >= 7
    types: ['decision', 'tool_execution', 'customer_info']
  }
}
```

## Built-in Tools

The AI autonomously uses these tools when appropriate:

### Communication
- `initiate_call` - Make phone calls
- `send_sms` - Send text messages
- `send_email` - Send emails with HTML/attachments

### Calendar
- `calendar_check_availability` - Check available time slots
- `calendar_book` - Book appointments
- `calendar_cancel` - Cancel appointments
- `calendar_reschedule` - Reschedule appointments

### Database (when storage is configured)
- `save_customer_info` - Save customer/lead data
- `find_customer` - Find existing customers
- `log_call_outcome` - Log call results
- `remember_preference` - Save customer preferences
- `recall_preference` - Retrieve preferences

## Database Integration

Enable persistent memory and auto-registered database tools:

```typescript
import { DatabaseStorage } from '@atchonk/ai-receptionist';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

const agent = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales' },
    memory: {
      contextWindow: 20,
      longTermEnabled: true,
      longTermStorage: new DatabaseStorage({
        db,
        autoMigrate: true
      })
    }
  },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' }
});

await agent.initialize();
```

## Custom Tools

Add custom tools for domain-specific functionality:

```typescript
import { ToolBuilder } from '@atchonk/ai-receptionist';

const crmTool = new ToolBuilder()
  .withName('create_lead')
  .withDescription('Create a new lead in the CRM system')
  .withParameters({
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' }
    },
    required: ['name', 'email']
  })
  .onCall(async (params, ctx) => ({
    success: true,
    data: { leadId: '123' },
    response: {
      speak: `Perfect! I've created a lead for ${params.name} in our CRM.`
    }
  }))
  .build();

agent.getToolRegistry().register(crmTool);
```

## AI Providers

### OpenAI

```typescript
model: {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 500
}
```

### OpenRouter (100+ Models)

```typescript
import { OPENROUTER_MODELS } from '@atchonk/ai-receptionist';

model: {
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  model: OPENROUTER_MODELS.anthropic.claude35Sonnet
}
```

## Requirements

- **Node.js**: 18+ (native fetch support)
- **TypeScript**: 5.0+ (recommended)
- **Providers**: At least one communication provider (Twilio, Postmark, etc.)
- **Database** (optional): PostgreSQL for persistent memory

## Supported Providers

- **AI**: OpenAI, OpenRouter (100+ models)
- **Voice/SMS**: Twilio
- **Email**: Postmark
- **Calendar**: Google Calendar

## License

MIT © Loctelli

## Support

- **Issues**: [GitHub Issues](https://github.com/KennethAtchon/AI-receptionist/issues)
