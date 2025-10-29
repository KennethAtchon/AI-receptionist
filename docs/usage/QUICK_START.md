# Quick Start - AI Receptionist SDK

Get up and running in 5 minutes!

---

## Installation

```bash
npm install @atchonk/ai-receptionist
```

---

## 1. Basic Demo (Text Mode)

Perfect for testing without any external services.

```typescript
// demo.ts
import { AIReceptionist } from '@atchonk/ai-receptionist';

async function demo() {
  // Create AI agent
  const agent = new AIReceptionist({
    agent: {
      identity: {
        name: 'Demo Agent',
        role: 'Assistant',
        company: 'Demo Corp'
      }
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4'
    }
  });

  // Initialize
  await agent.initialize();
  console.log('✓ Agent initialized');

  // Test text generation
  const response = await agent.text.generate({
    prompt: 'Tell me about your company',
    conversationId: 'demo_1'
  });

  console.log('Agent:', response.text);

  // Clean up
  await agent.dispose();
}

demo().catch(console.error);
```

**Run:**
```bash
OPENAI_API_KEY=sk-your-key npx ts-node demo.ts
```

---

## 2. Voice Call Demo (Outbound)

Make an AI-powered phone call.

```typescript
// call-demo.ts
import { AIReceptionist } from '@atchonk/ai-receptionist';

async function callDemo() {
  const agent = new AIReceptionist({
    agent: {
      identity: {
        name: 'Sarah',
        role: 'Sales Representative',
        company: 'Acme Corp'
      },
      personality: {
        traits: [
          { name: 'friendly', description: 'Warm and welcoming' }
        ]
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
      }
    }
  });

  await agent.initialize();
  console.log('✓ Agent initialized');

  // Make call
  const call = await agent.voice.make({
    to: '+1234567890',
    metadata: { purpose: 'demo' }
  });

  console.log('✓ Call initiated:', call.id);
}

callDemo().catch(console.error);
```

**Environment variables:**
```bash
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 3. Webhook Demo (Inbound)

Handle incoming calls, SMS, and emails.

```typescript
// webhook-server.ts
import express from 'express';
import { AIReceptionist } from '@atchonk/ai-receptionist';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create AI agent
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
        fromName: 'Emma - Acme Corp'
      }
    }
  },
  webhooks: {
    baseUrl: process.env.BASE_URL!, // e.g., https://your-app.com
    endpoints: {
      voice: '/webhooks/voice',
      sms: '/webhooks/sms',
      email: '/webhooks/email'
    }
  }
});

// Initialize on startup
receptionist.initialize().then(() => {
  console.log('✓ Receptionist ready');
});

// Voice webhook
app.post('/webhooks/voice', async (req, res) => {
  try {
    const twiml = await receptionist.handleVoiceWebhook(req.body);
    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).send('<Response><Say>Error</Say></Response>');
  }
});

// SMS webhook
app.post('/webhooks/sms', async (req, res) => {
  try {
    const twiml = await receptionist.handleSMSWebhook(req.body);
    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('<Response><Message>Error</Message></Response>');
  }
});

// Email webhook
app.post('/webhooks/email', async (req, res) => {
  try {
    const result = await receptionist.handleEmailWebhook(req.body);
    res.json(result);
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`Voice: ${process.env.BASE_URL}/webhooks/voice`);
  console.log(`SMS: ${process.env.BASE_URL}/webhooks/sms`);
  console.log(`Email: ${process.env.BASE_URL}/webhooks/email`);
});
```

**Environment variables:**
```bash
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
POSTMARK_API_KEY=...
BASE_URL=https://your-app.com
PORT=3000
```

**Run locally with ngrok:**
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use ngrok URL as BASE_URL
# Configure webhooks in Twilio/Postmark dashboards
```

---

## 4. Complete Sales Agent Demo

Full-featured sales agent with calendar booking.

```typescript
// sales-agent.ts
import { AIReceptionist } from '@atchonk/ai-receptionist';

async function createSalesAgent() {
  const sarah = new AIReceptionist({
    agent: {
      identity: {
        name: 'Sarah',
        role: 'Senior Sales Representative',
        company: 'Acme SaaS',
        title: 'Enterprise Sales'
      },
      personality: {
        traits: [
          { name: 'friendly', description: 'Warm and approachable' },
          { name: 'professional', description: 'Maintains professionalism' },
          { name: 'consultative', description: 'Focuses on customer needs' }
        ],
        communicationStyle: {
          primary: 'consultative',
          tone: 'professional yet friendly',
          language: 'clear and jargon-free'
        }
      },
      knowledge: {
        domain: 'B2B SaaS Sales',
        expertise: [
          'product demonstrations',
          'pricing and packaging',
          'objection handling',
          'enterprise sales',
          'ROI analysis'
        ],
        restrictions: [
          'Do not discuss competitor products negatively',
          'Always confirm pricing with manager for custom deals',
          'Do not promise features not yet released'
        ]
      },
      goals: {
        primary: 'Book qualified product demonstrations',
        secondary: [
          'Identify decision makers',
          'Understand customer pain points',
          'Qualify budget and timeline'
        ],
        metrics: [
          'demos_booked',
          'qualified_leads',
          'response_time',
          'customer_satisfaction'
        ]
      },
      memory: {
        contextWindow: 20,
        retentionDays: 90
      }
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
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
          fromEmail: 'sarah@acmesaas.com',
          fromName: 'Sarah - Acme SaaS',
          replyTo: 'sales@acmesaas.com'
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
      defaults: ['calendar', 'booking'],
      calendar: {
        provider: 'google',
        apiKey: process.env.GOOGLE_API_KEY!,
        calendarId: process.env.GOOGLE_CALENDAR_ID!
      }
    },
    debug: true
  });

  await sarah.initialize();
  console.log('✓ Sarah (Sales Agent) ready');

  return sarah;
}

// Example usage
async function main() {
  const sarah = await createSalesAgent();

  // Scenario 1: Outbound call to lead
  console.log('\n📞 Calling lead...');
  await sarah.voice.make({
    to: '+19876543210',
    metadata: {
      leadId: 'lead_789',
      source: 'website_demo_request',
      priority: 'high',
      company: 'Enterprise Corp',
      contact: 'John Doe'
    }
  });

  // Scenario 2: Follow-up email
  console.log('\n📧 Sending follow-up email...');
  await sarah.email.generateAndSend({
    prompt: 'Send a professional follow-up email to John Doe at Enterprise Corp thanking them for their demo request and confirming our call scheduled for tomorrow at 2 PM',
    to: 'john.doe@enterprisecorp.com',
    tone: 'professional',
    maxLength: 'medium'
  });

  // Scenario 3: SMS reminder
  console.log('\n💬 Sending SMS reminder...');
  await sarah.sms.send({
    to: '+19876543210',
    body: "Hi John! This is Sarah from Acme SaaS. Looking forward to our demo tomorrow at 2 PM. I'll call you then. Let me know if you need to reschedule!"
  });

  console.log('\n✓ All tasks completed');
  await sarah.dispose();
}

main().catch(console.error);
```

---

## Configuration Cheat Sheet

### Minimal Configuration
```typescript
{
  agent: {
    identity: { name: 'Agent', role: 'Assistant' }
  },
  model: {
    provider: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4'
  }
}
```

### With Twilio (Voice + SMS)
```typescript
{
  // ... agent & model config
  providers: {
    communication: {
      twilio: {
        accountSid: 'AC...',
        authToken: '...',
        phoneNumber: '+1234567890'
      }
    }
  }
}
```

### With Postmark (Email)
```typescript
{
  // ... agent & model config
  providers: {
    email: {
      postmark: {
        apiKey: '...',
        fromEmail: 'agent@company.com',
        fromName: 'Agent Name'
      }
    }
  }
}
```

### With Webhooks
```typescript
{
  // ... agent & model config
  webhooks: {
    baseUrl: 'https://your-app.com',
    endpoints: {
      voice: '/webhooks/voice',
      sms: '/webhooks/sms',
      email: '/webhooks/email'
    }
  }
}
```

---

## Testing Checklist

- [ ] Text generation works (`agent.text.generate()`)
- [ ] Voice calls work (`agent.voice.make()`)
- [ ] SMS works (`agent.sms.send()`)
- [ ] Email works (`agent.email.send()`)
- [ ] Webhooks receive requests
- [ ] Sessions are created and tracked
- [ ] Agent disposes cleanly

---

## What's Next?

1. Read the full [USAGE.md](./USAGE.md) guide
2. Explore [webhook examples](./webhook-examples.md)
3. Check out the [refactor plan](./refactor-plan.md) for architecture details
4. Build your first multi-agent system!

---

**Questions?** Open an issue on [GitHub](https://github.com/KennethAtchon/Loctelli/issues)
