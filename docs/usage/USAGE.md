# AI Receptionist SDK - Usage Guide

Complete guide for building AI-powered communication agents with the AI Receptionist SDK.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Webhook-Driven Mode](#webhook-driven-mode)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Installation

```bash
npm install @atchonk/ai-receptionist
```

### Required Dependencies

The SDK automatically installs these providers:
- `@anthropic-ai/sdk` - Claude AI
- `openai` - OpenAI/GPT models
- `twilio` - Phone & SMS
- `postmark` - Email
- `googleapis` - Google Calendar

---

## Quick Start

### 1. Basic Setup (Outbound Mode)

Create an AI agent that can make calls, send SMS, and emails:

```typescript
import { AIReceptionist } from '@atchonk/ai-receptionist';

const sarah = new AIReceptionist({
  // Define your agent's identity
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Sales Representative',
      company: 'Acme Corp'
    },
    personality: {
      traits: [
        { name: 'friendly', description: 'Warm and welcoming' },
        { name: 'professional', description: 'Business-focused' }
      ],
      communicationStyle: { primary: 'consultative' }
    },
    knowledge: {
      domain: 'B2B SaaS Sales',
      expertise: ['product demos', 'pricing', 'objection handling']
    },
    goals: {
      primary: 'Book qualified demo calls',
      metrics: ['demos_booked', 'qualified_leads']
    }
  },

  // AI Model Configuration
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    temperature: 0.7
  },

  // Provider Credentials
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      }
    },
    email: {
      postmark: {
        apiKey: process.env.POSTMARK_API_KEY!,
        fromEmail: 'sarah@acmecorp.com',
        fromName: 'Sarah - Acme Corp'
      }
    }
  },

  // Optional: Enable tools
  tools: {
    defaults: ['calendar', 'booking']
  }
});

// Initialize
await sarah.initialize();

// Make a call
await sarah.voice.make({
  to: '+1234567890',
  metadata: { leadId: 'lead_123' }
});

// Send SMS
await sarah.sms.send({
  to: '+1234567890',
  body: 'Hi! This is Sarah from Acme Corp. I wanted to follow up on your demo request.'
});

// Send Email
await sarah.email.send({
  to: 'prospect@example.com',
  subject: 'Your Demo Request',
  body: 'Thanks for your interest! When would be a good time for a demo?'
});
```

---

## Core Concepts

### 1. Agent-Centric Architecture

Each `AIReceptionist` instance represents **one AI agent** with a unique identity, personality, and knowledge base.

```typescript
const agent = new AIReceptionist({
  agent: {
    identity: { name: 'Bob', role: 'Support Agent' },
    personality: { traits: [{ name: 'patient', description: 'Patient and helpful' }] },
    knowledge: { domain: 'Customer Support' },
    goals: { primary: 'Resolve customer issues quickly' }
  },
  model: { /* ... */ }
});
```

### 2. Six-Pillar Agent System

Every agent has six core pillars:

1. **Identity** - Who the agent is (name, role, company)
2. **Personality** - How they communicate (traits, tone, style)
3. **Knowledge** - What they know (domain expertise, context)
4. **Goals** - What they aim to achieve (objectives, metrics)
5. **Memory** - What they remember (conversations, context)
6. **Voice** - How they sound (TTS settings, optional)

### 3. Multi-Channel Resources

Access communication channels through resource APIs:

- `sarah.voice` - Voice calls (Twilio)
- `sarah.sms` - SMS messages (Twilio)
- `sarah.email` - Email (Postmark)
- `sarah.text` - Text generation (dev/testing)

---

## Webhook-Driven Mode

Handle **inbound** messages with webhook-driven architecture.

### Setup Overview

1. Configure webhook endpoints in SDK
2. Create webhook routes in your app (Express/Fastify/Next.js)
3. Set up sessions with `setSession()`
4. Handle incoming webhooks with `handleVoiceWebhook()`, `handleSMSWebhook()`, `handleEmailWebhook()`

### Complete Webhook Example (Express)

```typescript
import express from 'express';
import { AIReceptionist } from '@atchonk/ai-receptionist';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create AI agent with webhook configuration
const receptionist = new AIReceptionist({
  agent: {
    identity: {
      name: 'Emma',
      role: 'Receptionist',
      company: 'Acme Corp'
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  },
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      }
    },
    email: {
      postmark: {
        apiKey: process.env.POSTMARK_API_KEY!,
        fromEmail: 'emma@acmecorp.com',
        fromName: 'Emma - Acme Corp',
        // Optional: Webhook secret for signature verification
        // Note: Configure the webhook URL in Postmark's dashboard
        webhookSecret: process.env.POSTMARK_WEBHOOK_SECRET
      }
    }
  },
  // Webhook configuration
  webhooks: {
    baseUrl: 'https://your-app.com',
    endpoints: {
      voice: '/webhooks/voice',
      sms: '/webhooks/sms',
      email: '/webhooks/email'
    }
  }
});

await receptionist.initialize();

// Voice webhook endpoint (Twilio)
app.post('/webhooks/voice', async (req, res) => {
  try {
    const twimlResponse = await receptionist.handleVoiceWebhook(req.body);
    res.type('text/xml').send(twimlResponse);
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say></Response>');
  }
});

// SMS webhook endpoint (Twilio)
app.post('/webhooks/sms', async (req, res) => {
  try {
    const twimlResponse = await receptionist.handleSMSWebhook(req.body);
    res.type('text/xml').send(twimlResponse);
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, an error occurred.</Message></Response>');
  }
});

// Email webhook endpoint (Postmark)
app.post('/webhooks/email', async (req, res) => {
  try {
    const signature = req.headers['x-postmark-signature'] as string;
    const result = await receptionist.handleEmailWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Session Management

Create sessions for specific phone numbers or email addresses:

```typescript
// Set up a voice session for a specific number
const session = await receptionist.setSession('voice', '+1234567890', {
  leadId: 'lead_123',
  priority: 'high'
});

console.log('Session ID:', session.id);
console.log('Conversation ID:', session.conversationId);

// Set up SMS session
await receptionist.setSession('sms', '+1234567890');

// Set up email session
await receptionist.setSession('email', 'customer@example.com', {
  customerId: 'cust_456'
});
```

### Accessing Session Manager

```typescript
const sessionManager = receptionist.getSessionManager();

// Get all active sessions
const activeSessions = await sessionManager.listActiveSessions();
console.log(`${activeSessions.length} active sessions`);

// Get session by ID
const session = await sessionManager.getSession('voice_123456_abc');

// Get session by identifier (phone/email)
const phoneSession = await sessionManager.getSessionByIdentifier('voice', '+1234567890');

// Clean up old sessions (24 hours)
await sessionManager.cleanup(24 * 60 * 60 * 1000);
```

---

## API Reference

### AIReceptionist

Main SDK client class.

#### Constructor

```typescript
new AIReceptionist(config: AIReceptionistConfig)
```

#### Methods

##### `initialize(): Promise<void>`
Initialize the SDK (required before use).

##### `setSession(type, identifier, metadata?): Promise<Session>`
Create a session for webhook-driven mode.

**Parameters:**
- `type`: `'voice' | 'sms' | 'email'`
- `identifier`: Phone number or email address
- `metadata`: Optional metadata object

**Returns:** `Promise<Session>`

##### `handleVoiceWebhook(payload): Promise<string>`
Handle incoming voice webhook from Twilio.

**Returns:** TwiML XML string

##### `handleSMSWebhook(payload): Promise<string>`
Handle incoming SMS webhook from Twilio.

**Returns:** TwiML XML string

##### `handleEmailWebhook(payload, signature?): Promise<object>`
Handle incoming email webhook from Postmark.

**Returns:** JSON response object

##### `getSessionManager(): SessionManager`
Get the session manager instance.

##### `getWebhookRouter(): WebhookRouter`
Get the webhook router instance.

##### `getAgent(): Agent`
Get the underlying AI agent.

##### `getProviderRegistry(): ProviderRegistry`
Get provider registry for runtime management.

##### `dispose(): Promise<void>`
Clean up and dispose all resources.

---

### Voice Resource

#### `voice.make(options: MakeCallOptions): Promise<CallSession>`

Make an outbound call.

```typescript
await agent.voice.make({
  to: '+1234567890',
  metadata: { leadId: 'lead_123' }
});
```

---

### SMS Resource

#### `sms.send(options: SendSMSOptions): Promise<SMSSession>`

Send an SMS message.

```typescript
await agent.sms.send({
  to: '+1234567890',
  body: 'Hello! This is a message from our AI agent.',
  metadata: { campaignId: 'campaign_456' }
});
```

---

### Email Resource

#### `email.send(options: SendEmailOptions): Promise<EmailSession>`

Send an email.

```typescript
await agent.email.send({
  to: 'customer@example.com',
  subject: 'Your Request',
  body: 'Plain text body',
  html: '<h1>HTML body</h1>',
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf'
    }
  ]
});
```

#### `email.generateAndSend(options: GenerateEmailOptions): Promise<EmailSession>`

AI-generated email with automatic sending.

```typescript
await agent.email.generateAndSend({
  prompt: 'Send a follow-up email thanking the customer for their purchase',
  to: 'customer@example.com',
  tone: 'friendly',
  maxLength: 'medium'
});
```

#### `email.draft(options: DraftEmailOptions): Promise<EmailDraft>`

Generate email draft without sending.

```typescript
const draft = await agent.email.draft({
  prompt: 'Write a professional follow-up email',
  to: 'lead@example.com',
  tone: 'professional',
  includeHistory: true
});

console.log('Subject:', draft.subject);
console.log('Body:', draft.body);

// Optionally send it later
await agent.email.send(draft);
```

---

### Text Resource

#### `text.generate(options: GenerateTextOptions): Promise<TextResponse>`

Generate text for testing/development.

```typescript
const response = await agent.text.generate({
  prompt: 'Explain our pricing model',
  conversationId: 'test_123'
});

console.log(response.text);
```

---

## Examples

### Example 1: Sales Agent with Calendar Booking

```typescript
import { AIReceptionist } from '@atchonk/ai-receptionist';

const salesAgent = new AIReceptionist({
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Sales Representative',
      company: 'Acme SaaS'
    },
    goals: {
      primary: 'Book qualified demos',
      metrics: ['demos_booked', 'response_time']
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  },
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: '+1234567890'
      }
    },
    calendar: {
      google: {
        apiKey: process.env.GOOGLE_API_KEY!,
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        credentials: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        }
      }
    }
  },
  tools: {
    defaults: ['calendar', 'booking']
  }
});

await salesAgent.initialize();

// Make outbound call to lead
await salesAgent.voice.make({
  to: '+19876543210',
  metadata: {
    leadId: 'lead_789',
    source: 'website_form',
    priority: 'high'
  }
});
```

### Example 2: Support Agent with Multi-Channel

```typescript
const supportAgent = new AIReceptionist({
  agent: {
    identity: {
      name: 'Alex',
      role: 'Support Specialist',
      company: 'TechSupport Inc'
    },
    personality: {
      traits: [
        { name: 'patient', description: 'Patient and understanding' },
        { name: 'technical', description: 'Technical expertise' }
      ]
    },
    knowledge: {
      domain: 'Technical Support',
      expertise: ['troubleshooting', 'product_knowledge', 'escalation_procedures']
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  },
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: '+1234567890'
      }
    },
    email: {
      postmark: {
        apiKey: process.env.POSTMARK_API_KEY!,
        fromEmail: 'support@techsupport.com',
        fromName: 'Alex - TechSupport'
      }
    }
  },
  webhooks: {
    baseUrl: 'https://your-app.com',
    endpoints: {
      voice: '/webhooks/support/voice',
      sms: '/webhooks/support/sms',
      email: '/webhooks/support/email'
    }
  }
});

await supportAgent.initialize();
```

### Example 3: Multi-Agent System

Create multiple agents with different roles:

```typescript
// Sales agent
const sales = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    goals: { primary: 'Book demos' }
  },
  model: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' },
  providers: { /* ... */ }
});

// Support agent
const support = new AIReceptionist({
  agent: {
    identity: { name: 'Alex', role: 'Support Agent' },
    goals: { primary: 'Resolve issues' }
  },
  model: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' },
  providers: { /* ... */ }
});

// Billing agent
const billing = new AIReceptionist({
  agent: {
    identity: { name: 'Jamie', role: 'Billing Specialist' },
    goals: { primary: 'Handle billing inquiries' }
  },
  model: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' },
  providers: { /* ... */ }
});

await Promise.all([
  sales.initialize(),
  support.initialize(),
  billing.initialize()
]);

// Route calls based on context
if (inquiry.type === 'sales') {
  await sales.voice.make({ to: customer.phone });
} else if (inquiry.type === 'support') {
  await support.voice.make({ to: customer.phone });
} else if (inquiry.type === 'billing') {
  await billing.voice.make({ to: customer.phone });
}
```

---

## Best Practices

### 1. Environment Variables

Store sensitive credentials in environment variables:

```bash
# .env
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
POSTMARK_API_KEY=...
POSTMARK_WEBHOOK_SECRET=...
GOOGLE_API_KEY=...
GOOGLE_CALENDAR_ID=...
```

### 2. Error Handling

Always wrap SDK calls in try-catch:

```typescript
try {
  await agent.voice.make({ to: '+1234567890' });
} catch (error) {
  console.error('Call failed:', error);
  // Handle error appropriately
}
```

### 3. Session Cleanup

Regularly clean up old sessions:

```typescript
// Clean up sessions older than 24 hours
setInterval(async () => {
  const sessionManager = agent.getSessionManager();
  const cleaned = await sessionManager.cleanup(24 * 60 * 60 * 1000);
  console.log(`Cleaned up ${cleaned} old sessions`);
}, 60 * 60 * 1000); // Run every hour
```

### 4. Webhook Security

Always verify webhook signatures:

```typescript
app.post('/webhooks/email', async (req, res) => {
  const signature = req.headers['x-postmark-signature'] as string;

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  try {
    const result = await agent.handleEmailWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(401).json({ error: 'Invalid signature' });
  }
});
```

### 5. Graceful Shutdown

Clean up resources on shutdown:

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await agent.dispose();
  process.exit(0);
});
```

### 6. Logging

Enable debug logging for troubleshooting:

```typescript
const agent = new AIReceptionist({
  agent: { /* ... */ },
  model: { /* ... */ },
  providers: { /* ... */ },
  debug: true // Enable detailed logging
});
```

### 7. Provider Management

Access and configure providers at runtime:

```typescript
const registry = agent.getProviderRegistry();

// Check if provider is registered
if (registry.has('postmark')) {
  const postmark = await registry.get('postmark');
  console.log('Postmark provider ready');
}

// List all providers
const providers = registry.list();
console.log('Available providers:', providers);
```

---

## Troubleshooting

### Common Issues

**Issue: Webhook not receiving requests**
- Ensure your server is publicly accessible (use ngrok for local development)
- Verify webhook URLs are configured correctly in provider dashboards
- Check firewall/security group settings

**Issue: "Provider not initialized" error**
- Make sure to call `await agent.initialize()` before using resources
- Verify all required environment variables are set
- Check provider credentials are valid

**Issue: Email webhook signature verification fails**
- Ensure webhook secret is configured correctly
- Verify the signature header name matches provider documentation
- Check that raw request body is being passed (not parsed JSON)

**Issue: Session not found**
- Verify session was created with `setSession()` before webhook arrives
- Check session hasn't expired (default: 24 hours)
- Ensure identifier (phone/email) matches exactly

---

## Next Steps

- See [examples/](../examples/) for complete working examples
- Read [refactor-plan.md](./refactor-plan.md) for architecture details
- Check [README.md](../README.md) for project overview

---

**Need Help?** Open an issue on [GitHub](https://github.com/KennethAtchon/Loctelli/issues)
