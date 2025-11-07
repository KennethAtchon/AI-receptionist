# @atchonk/ai-receptionist

**Autonomous AI agent that handles voice calls, SMS, and emails independently**

[![npm version](https://img.shields.io/npm/v/@atchonk/ai-receptionist.svg)](https://www.npmjs.com/package/@atchonk/ai-receptionist)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Set up an AI agent once, and it autonomously handles all incoming communications across voice, SMS, and email—booking appointments, sending confirmations, and managing conversations without any additional code.

## Philosophy

**The AI should just work.** Configure your agent's personality and goals, connect your communication channels, and the AI handles everything else autonomously. No manual orchestration, no per-request coding—just pure autonomy.

## How It Works

1. **You configure** an AI agent with identity, personality, knowledge, and goals
2. **You set up** webhook endpoints for voice, SMS, and email
3. **The AI handles** all incoming communications autonomously using built-in tools

When a customer calls, texts, or emails:
- The AI understands the request
- The AI autonomously books appointments (tool: `calendar`)
- The AI sends confirmation emails (tool: `send_email`)
- The AI schedules SMS reminders (tool: `send_sms`)
- The AI maintains conversation context across channels

**You write zero additional code.** The AI decides what to do and does it.

## Installation

```bash
npm install @atchonk/ai-receptionist
```

## Quick Start

### Step 1: Configure Your AI Agent

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

### Step 2: Set Up Webhook Endpoints

```typescript
import express from 'express';
const app = express();

// Incoming voice calls - AI handles automatically
app.post('/webhooks/voice',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const twiml = await agent.handleVoiceWebhook(req.body);
    res.type('text/xml').send(twiml);
  }
);

// Incoming SMS - AI handles automatically
app.post('/webhooks/sms',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const twiml = await agent.handleSMSWebhook(req.body);
    res.type('text/xml').send(twiml);
  }
);

// Incoming emails - AI handles automatically
app.post('/webhooks/email',
  express.json(),
  async (req, res) => {
    await agent.handleEmailWebhook(req.body);
    res.json({ success: true });
  }
);

app.listen(3000);
```

### Step 3: Configure Your Providers

**Twilio (Voice & SMS):**
- Go to Twilio Console → Phone Numbers
- Set voice webhook: `https://your-app.com/webhooks/voice`
- Set SMS webhook: `https://your-app.com/webhooks/sms`

**Postmark (Email):**
- Go to Postmark → Inbound
- Set inbound webhook: `https://your-app.com/webhooks/email`

### That's It!

Your AI agent now **autonomously handles all incoming communications**. No additional code needed.

## What Happens Automatically

### Example: Incoming Phone Call

**Customer calls your Twilio number:**

```
1. Twilio → POST /webhooks/voice
2. AI agent receives call
3. AI: "Hi! This is Sarah from Acme Corp. How can I help?"
4. Customer: "I'd like to schedule a demo"
5. AI checks calendar (tool: calendar_check_availability)
6. AI: "I have Tuesday at 2pm or Thursday at 10am available"
7. Customer: "Tuesday works"
8. AI books appointment (tool: calendar_book)
9. AI sends confirmation email (tool: send_email)
10. AI schedules SMS reminder (tool: send_sms)
11. AI: "Perfect! I've booked your demo for Tuesday at 2pm.
    You'll receive a confirmation email shortly."
```

**You wrote zero code for steps 5-10.** The AI decided to use those tools autonomously.

### Example: Incoming SMS

**Customer texts your Twilio number:**

```
Customer: "Can I reschedule my appointment?"
AI: "Of course! What time works better for you?"
Customer: "Friday morning?"
AI checks calendar (tool: calendar_check_availability)
AI: "I have Friday at 9am or 11am available"
Customer: "9am please"
AI cancels old appointment (tool: calendar_cancel)
AI books new appointment (tool: calendar_book)
AI sends confirmation email (tool: send_email)
AI: "Done! Your demo is now Friday at 9am. Confirmation sent to your email."
```

### Example: Incoming Email

**Customer emails your Postmark address:**

```
Subject: Urgent: Need to talk about pricing
Body: Can someone call me ASAP? My number is +1234567890

AI reads email
AI analyzes urgency
AI initiates phone call (tool: initiate_call)
AI sends email confirmation: "Hi [Name], I just tried calling you..."
```

**All of this happens automatically.** The AI decides what actions to take based on your agent configuration.

## Built-in Tools (Used Autonomously)

The AI has access to these tools and uses them **automatically** when needed:

### Communication Tools
- **`initiate_call`** - Make phone calls
- **`send_sms`** - Send text messages
- **`send_email`** - Send emails with HTML/attachments

### Calendar Tools
- **`calendar_check_availability`** - Check available time slots
- **`calendar_book`** - Book appointments
- **`calendar_cancel`** - Cancel appointments
- **`calendar_reschedule`** - Reschedule appointments

### Database Tools (When database storage is configured)
- **`save_customer_info`** - Save customer/lead data
- **`find_customer`** - Find existing customers
- **`log_call_outcome`** - Log call results
- **`remember_preference`** - Save customer preferences
- **`recall_preference`** - Retrieve preferences

**You never call these tools manually.** The AI decides when and how to use them.

## Agent Configuration (Five Pillars)

Configure your AI agent's behavior through six core pillars:

### 1. Identity - Who the agent is

```typescript
identity: {
  name: 'Sarah',
  role: 'Sales Representative',
  organization: 'Acme Corp',
  title: 'Senior Sales Specialist',
  backstory: 'Experienced sales professional with 5 years in B2B SaaS',
  authorityLevel: 'medium', // What decisions can they make?
  specializations: ['lead qualification', 'product demos']
}
```

### 2. Personality - How the agent behaves

```typescript
personality: {
  traits: [
    { name: 'friendly', description: 'Warm and welcoming' },
    { name: 'professional', description: 'Maintains professionalism' },
    { name: 'patient', description: 'Takes time to explain' }
  ],
  communicationStyle: {
    primary: 'consultative',        // consultative | transactional | educational
    tone: 'friendly',                // formal | friendly | casual
    formalityLevel: 7                // 1-10 scale
  },
  emotionalIntelligence: 'high',     // low | medium | high
  adaptability: 'high'                // low | medium | high
}
```

### 3. Knowledge - What the agent knows

```typescript
knowledge: {
  domain: 'B2B SaaS sales and customer success',
  expertise: ['lead qualification', 'pricing discussions', 'product demos'],
  industries: ['SaaS', 'Technology', 'Professional Services'],
  contextDocs: [
    'Product Features: Our platform offers...',
    'Pricing Tiers: Starter ($99/mo), Professional ($299/mo)...',
    'Common Objections: When customers mention price...'
  ],
  languages: {
    fluent: ['English'],
    conversational: ['Spanish']
  }
}
```

### 4. Goals - What the agent aims to achieve

```typescript
goals: {
  primary: 'Qualify leads and book product demos',
  secondary: [
    'Gather information about lead needs and budget',
    'Handle objections professionally',
    'Maintain high customer satisfaction'
  ],
  constraints: [
    'Never discuss pricing over email',
    'Always confirm appointments via email',
    'Escalate technical questions to engineering'
  ]
}
```

### 5. Memory - What the agent remembers

```typescript
memory: {
  contextWindow: 20,           // Number of recent messages to remember
  longTermEnabled: true,       // Enable persistent memory
  longTermStorage: databaseStorage,  // Database for persistence
  autoPersist: {
    minImportance: 7,          // Auto-save memories with importance >= 7
    types: ['decision', 'tool_execution', 'customer_info']
  }
}
```

## Database Integration (Optional)

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
        autoMigrate: true // Creates tables automatically
      }),
      autoPersist: {
        minImportance: 7,
        types: ['decision', 'tool_execution', 'customer_info']
      }
    }
  },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' }
});

await agent.initialize();
```

**What this enables:**
- **Persistent memory** across sessions (customers remembered between calls)
- **5 auto-registered database tools** the AI can use autonomously:
  - `save_customer_info` - Save customer data
  - `find_customer` - Find existing customers
  - `log_call_outcome` - Log call results
  - `remember_preference` - Save preferences
  - `recall_preference` - Retrieve preferences

**Example autonomous behavior:**
```
Call 1:
Customer: "My name is John Doe, email john@example.com"
AI saves: save_customer_info({ name: "John Doe", email: "john@example.com" })

Call 2 (days later):
AI finds: find_customer({ phone: "+1234567890" })
AI: "Hi John! Great to hear from you again. How can I help today?"
AI recalls: recall_preference({ key: "preferred_time" })
AI: "I see you prefer morning appointments. I have Tuesday at 9am available."
```

## Custom Tools (Advanced)

Add custom tools for the AI to use autonomously:

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
      phone: { type: 'string' },
      company: { type: 'string' }
    },
    required: ['name', 'email']
  })

  // Different responses for different channels
  .onCall(async (params, ctx) => ({
    success: true,
    data: { leadId: '123' },
    response: {
      speak: `Perfect! I've created a lead for ${params.name} in our CRM.`
    }
  }))

  .onSMS(async (params, ctx) => ({
    success: true,
    response: { message: `✓ Lead created: ${params.name}` }
  }))

  .onEmail(async (params, ctx) => ({
    success: true,
    response: {
      html: `<h2>Lead Created</h2><p>${params.name} has been added to our CRM.</p>`
    }
  }))

  .build();

// Register tool - AI will use it autonomously when appropriate
agent.getToolRegistry().register(crmTool);
```

Now when a customer provides their information, the AI **automatically** creates a CRM lead without you writing any additional logic.

## AI Provider Options

### OpenAI (Recommended)

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

Access models from OpenAI, Anthropic, Google, Meta, Mistral, and more:

```typescript
import { OPENROUTER_MODELS } from '@atchonk/ai-receptionist';

model: {
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  model: OPENROUTER_MODELS.anthropic.claude35Sonnet
}

// Available models:
// OPENROUTER_MODELS.openai.gpt4Turbo
// OPENROUTER_MODELS.anthropic.claude35Sonnet
// OPENROUTER_MODELS.google.geminiPro15
// OPENROUTER_MODELS.meta.llama3_70b
```

## Architecture

```
Incoming Message (Voice/SMS/Email)
         │
         ↓
    Webhook Handler
         │
         ↓
    AI Agent (Six Pillars)
    - Identity
    - Personality
    - Knowledge
    - Goals
    - Memory
         │
         ↓
    Autonomous Decision
    "What should I do?"
         │
         ↓
    Tool Selection & Execution
    - send_email
    - calendar_book
    - send_sms
    - initiate_call
    - custom_tools
         │
         ↓
    Providers
    - Twilio
    - Postmark
    - Google Calendar
         │
         ↓
    Action Executed
    Response Sent
```

## Manual API (Advanced Use Cases)

For programmatic control (testing, integrations, etc.):

```typescript
// Generate text response (for chat/testing)
const response = await agent.text.generate({
  prompt: 'Book a demo for tomorrow at 2pm',
  conversationId: 'user-123'
});

// Make outbound call (rare - usually AI does this)
await agent.voice.make({
  to: '+1234567890',
  greeting: 'Hi! This is Sarah from Acme Corp.'
});

// Send SMS (rare - usually AI does this)
await agent.sms.send({
  to: '+1234567890',
  body: 'Your appointment is confirmed for tomorrow at 2pm'
});

// Send email (rare - usually AI does this)
await agent.email.send({
  to: 'customer@example.com',
  subject: 'Demo Confirmation',
  body: 'Your demo is scheduled for...'
});
```

**Note:** These are mostly for testing. In production, the AI handles everything via webhooks.

## Requirements

- **Node.js**: 18+ (native fetch support)
- **TypeScript**: 5.0+ (recommended)
- **Providers**: At least one communication provider (Twilio, Postmark, etc.)
- **Database** (optional): PostgreSQL, MySQL, or SQLite for persistent memory

## Supported Providers

- **AI**: OpenAI, OpenRouter (100+ models)
- **Voice/SMS**: Twilio
- **Email**: Postmark
- **Calendar**: Google Calendar

## License

MIT © Loctelli

## Support

- **Documentation**: See [docs/SDK_VISION.md](docs/SDK_VISION.md) for architectural philosophy
- **Issues**: [GitHub Issues](https://github.com/KennethAtchon/AI-receptionist/issues)
