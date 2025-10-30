# Webhook Setup Examples

Complete webhook implementation examples for different frameworks.

---

## Table of Contents

- [Express.js](#expressjs)
- [Fastify](#fastify)
- [Next.js API Routes](#nextjs-api-routes)
- [Provider Configuration](#provider-configuration)
- [ngrok for Local Development](#ngrok-for-local-development)

---

## Express.js

Complete Express.js webhook server.

### Installation

```bash
npm install express @atchonk/ai-receptionist
```

### Server Code

```typescript
// server.ts
import express from 'express';
import { AIReceptionist } from '@atchonk/ai-receptionist';

const app = express();

// IMPORTANT: Parse both JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create AI agent
const receptionist = new AIReceptionist({
  agent: {
    identity: {
      name: 'Emma',
      role: 'Receptionist',
      company: 'Acme Corp'
    },
    personality: {
      traits: [
        { name: 'professional', description: 'Professional and courteous' },
        { name: 'helpful', description: 'Always eager to help' }
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
    },
    email: {
      postmark: {
        apiKey: process.env.POSTMARK_API_KEY!,
        fromEmail: 'receptionist@acmecorp.com',
        fromName: 'Emma - Acme Corp',
        // Optional: Webhook secret for signature verification
        // Note: Configure the webhook URL in Postmark's dashboard
        webhookSecret: process.env.POSTMARK_WEBHOOK_SECRET
      }
    }
  },
  webhooks: {
    baseUrl: process.env.BASE_URL!,
    endpoints: {
      voice: '/webhooks/voice',
      sms: '/webhooks/sms',
      email: '/webhooks/email'
    }
  },
  debug: true
});

// Initialize on startup
receptionist.initialize()
  .then(() => console.log('✓ AI Receptionist ready'))
  .catch(err => {
    console.error('Failed to initialize:', err);
    process.exit(1);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Voice webhook (Twilio)
app.post('/webhooks/voice', async (req, res) => {
  console.log('Voice webhook received:', req.body);

  try {
    const twimlResponse = await receptionist.handleVoiceWebhook(req.body);
    res.type('text/xml').send(twimlResponse);
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).type('text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">I apologize, but I'm experiencing technical difficulties. Please try again later.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// SMS webhook (Twilio)
app.post('/webhooks/sms', async (req, res) => {
  console.log('SMS webhook received:', req.body);

  try {
    const twimlResponse = await receptionist.handleSMSWebhook(req.body);
    res.type('text/xml').send(twimlResponse);
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).type('text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Sorry, I'm having technical issues. Please try again later.</Message>
      </Response>
    `);
  }
});

// Email webhook (Postmark)
app.post('/webhooks/email', async (req, res) => {
  console.log('Email webhook received');

  try {
    const signature = req.headers['x-postmark-signature'] as string;

    if (!signature) {
      console.warn('Missing webhook signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    const result = await receptionist.handleEmailWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await receptionist.dispose();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await receptionist.dispose();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Webhook server running on port ${PORT}`);
  console.log(`\n📍 Webhook URLs:`);
  console.log(`   Voice: ${process.env.BASE_URL}/webhooks/voice`);
  console.log(`   SMS:   ${process.env.BASE_URL}/webhooks/sms`);
  console.log(`   Email: ${process.env.BASE_URL}/webhooks/email`);
  console.log(`\n💡 Configure these URLs in your provider dashboards\n`);
});
```

### .env File

```bash
# AI Model
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Postmark
POSTMARK_API_KEY=...
POSTMARK_WEBHOOK_SECRET=...

# Server
BASE_URL=https://your-app.com
PORT=3000
```

---

## Fastify

High-performance webhook server with Fastify.

### Installation

```bash
npm install fastify @atchonk/ai-receptionist
```

### Server Code

```typescript
// server.ts
import Fastify from 'fastify';
import { AIReceptionist } from '@atchonk/ai-receptionist';

const fastify = Fastify({
  logger: true
});

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
        fromEmail: 'receptionist@acmecorp.com',
        fromName: 'Emma - Acme Corp'
      }
    }
  },
  webhooks: {
    baseUrl: process.env.BASE_URL!,
    endpoints: {
      voice: '/webhooks/voice',
      sms: '/webhooks/sms',
      email: '/webhooks/email'
    }
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Voice webhook
fastify.post('/webhooks/voice', async (request, reply) => {
  try {
    const twiml = await receptionist.handleVoiceWebhook(request.body);
    reply.type('text/xml').send(twiml);
  } catch (error) {
    fastify.log.error('Voice webhook error:', error);
    reply.status(500).type('text/xml').send('<Response><Say>Error</Say></Response>');
  }
});

// SMS webhook
fastify.post('/webhooks/sms', async (request, reply) => {
  try {
    const twiml = await receptionist.handleSMSWebhook(request.body);
    reply.type('text/xml').send(twiml);
  } catch (error) {
    fastify.log.error('SMS webhook error:', error);
    reply.status(500).type('text/xml').send('<Response><Message>Error</Message></Response>');
  }
});

// Email webhook
fastify.post('/webhooks/email', async (request, reply) => {
  try {
    const signature = request.headers['x-postmark-signature'] as string;
    const result = await receptionist.handleEmailWebhook(request.body, signature);
    return result;
  } catch (error) {
    fastify.log.error('Email webhook error:', error);
    reply.status(500).send({ error: 'Webhook processing failed' });
  }
});

// Start server
async function start() {
  try {
    await receptionist.initialize();
    console.log('✓ AI Receptionist ready');

    await fastify.listen({
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0'
    });

    console.log(`\n🚀 Webhook server running`);
    console.log(`\n📍 Webhook URLs:`);
    console.log(`   Voice: ${process.env.BASE_URL}/webhooks/voice`);
    console.log(`   SMS:   ${process.env.BASE_URL}/webhooks/sms`);
    console.log(`   Email: ${process.env.BASE_URL}/webhooks/email\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
```

---

## Next.js API Routes

Webhook handlers as Next.js API routes.

### File Structure

```
pages/
  api/
    webhooks/
      voice.ts
      sms.ts
      email.ts
lib/
  receptionist.ts
```

### Shared Receptionist Instance

```typescript
// lib/receptionist.ts
import { AIReceptionist } from '@atchonk/ai-receptionist';

let receptionistInstance: AIReceptionist | null = null;

export async function getReceptionist(): Promise<AIReceptionist> {
  if (!receptionistInstance) {
    receptionistInstance = new AIReceptionist({
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
            fromEmail: 'receptionist@acmecorp.com',
            fromName: 'Emma - Acme Corp'
          }
        }
      },
      webhooks: {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
        endpoints: {
          voice: '/api/webhooks/voice',
          sms: '/api/webhooks/sms',
          email: '/api/webhooks/email'
        }
      }
    });

    await receptionistInstance.initialize();
    console.log('✓ AI Receptionist initialized');
  }

  return receptionistInstance;
}
```

### Voice Webhook Route

```typescript
// pages/api/webhooks/voice.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getReceptionist } from '../../../lib/receptionist';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const receptionist = await getReceptionist();
    const twiml = await receptionist.handleVoiceWebhook(req.body);

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml);
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.setHeader('Content-Type', 'text/xml');
    res.status(500).send('<Response><Say>Error</Say></Response>');
  }
}
```

### SMS Webhook Route

```typescript
// pages/api/webhooks/sms.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getReceptionist } from '../../../lib/receptionist';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const receptionist = await getReceptionist();
    const twiml = await receptionist.handleSMSWebhook(req.body);

    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml);
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.setHeader('Content-Type', 'text/xml');
    res.status(500).send('<Response><Message>Error</Message></Response>');
  }
}
```

### Email Webhook Route

```typescript
// pages/api/webhooks/email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getReceptionist } from '../../../lib/receptionist';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const signature = req.headers['x-postmark-signature'] as string;

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const receptionist = await getReceptionist();
    const result = await receptionist.handleEmailWebhook(req.body, signature);

    res.status(200).json(result);
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
```

---

## Provider Configuration

### Twilio Configuration

1. **Go to Twilio Console** → Phone Numbers
2. **Select your phone number**
3. **Configure Voice & Messaging:**
   - Voice: `https://your-app.com/webhooks/voice` (POST)
   - SMS: `https://your-app.com/webhooks/sms` (POST)

### Postmark Configuration

1. **Go to Postmark** → Servers → Your Server
2. **Navigate to** "Inbound" tab
3. **Add inbound domain** (e.g., `receptionist@yourdomain.com`)
4. **Set webhook URL:** `https://your-app.com/webhooks/email`
5. **Copy webhook secret** for signature verification

---

## ngrok for Local Development

### Installation

```bash
# macOS
brew install ngrok

# Windows
choco install ngrok

# Linux
snap install ngrok
```

### Usage

```bash
# Start your local server
npm start

# In another terminal, expose it
ngrok http 3000
```

**ngrok Output:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Update Environment Variables

```bash
BASE_URL=https://abc123.ngrok.io
```

### Configure Providers

Use the ngrok URL in provider dashboards:
- Twilio Voice: `https://abc123.ngrok.io/webhooks/voice`
- Twilio SMS: `https://abc123.ngrok.io/webhooks/sms`
- Postmark Email: `https://abc123.ngrok.io/webhooks/email`

### Testing

```bash
# Test voice webhook
curl -X POST https://abc123.ngrok.io/webhooks/voice \
  -d "From=+1234567890" \
  -d "To=+0987654321"

# Test SMS webhook
curl -X POST https://abc123.ngrok.io/webhooks/sms \
  -d "From=+1234567890" \
  -d "Body=Hello"

# Test email webhook
curl -X POST https://abc123.ngrok.io/webhooks/email \
  -H "Content-Type: application/json" \
  -d '{"From":"test@example.com","Subject":"Test"}'
```

---

## Troubleshooting

### Webhook Not Receiving Requests

**Check:**
1. Server is running and accessible
2. ngrok tunnel is active (for local dev)
3. Webhook URLs configured correctly in provider dashboards
4. Firewall allows incoming traffic

### Signature Verification Fails

**Check:**
1. Webhook secret is correct
2. Raw request body is used (not parsed)
3. Signature header name matches provider docs

### TwiML Errors

**Check:**
1. Response has correct Content-Type: `text/xml`
2. XML is valid and well-formed
3. TwiML follows Twilio specifications

---

## Production Deployment

### Recommended Setup

1. **Use HTTPS** (required by providers)
2. **Set up monitoring** (Sentry, DataDog, etc.)
3. **Log all webhooks** for debugging
4. **Implement rate limiting** to prevent abuse
5. **Use load balancer** for high traffic
6. **Set up health checks**
7. **Configure auto-scaling**

### Example Deployment (AWS)

```
Internet → ALB → ECS Fargate → AI Receptionist SDK
              ↓
        CloudWatch Logs
```

---

**Need Help?** Check [USAGE.md](./USAGE.md) or open an issue on [GitHub](https://github.com/KennethAtchon/Loctelli/issues)
