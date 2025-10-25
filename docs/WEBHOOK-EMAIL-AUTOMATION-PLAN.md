# 📧 Webhook Email Automation Plan

## Executive Summary

**Goal**: Automatically receive incoming emails via webhooks and have AI respond intelligently within existing conversations.

**Answer to your questions:**
1. ✅ **YES**, the AI can reply to ANY conversation that exists in memory
2. The webhook system will automatically find the original conversation and add the incoming email to it
3. If no conversation exists, it creates a new one

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Email Conversation Flow                      │
└─────────────────────────────────────────────────────────────────┘

  1. You send email                    ┌──────────────────┐
     via AI Receptionist    ────────►  │  Email Provider  │
                                       │  (Resend/SG)     │
                                       └────────┬─────────┘
                                                │
  2. Customer replies ─────────────────────────►│
                                                │
                                                ▼
                                       ┌──────────────────┐
  3. Provider parses email             │  Inbound Parse   │
     and sends webhook     ◄───────────│  + Webhook       │
                                       └────────┬─────────┘
                                                │
                                                ▼
  4. Your webhook endpoint             ┌──────────────────┐
     receives POST request  ◄───────────│  HTTP POST       │
                                       │  (JSON payload)  │
                                       └────────┬─────────┘
                                                │
                                                ▼
  5. EmailRouter automatically         ┌──────────────────┐
     processes webhook      ────────►  │  EmailRouter     │
                                       │  .handleInbound()│
                                       └────────┬─────────┘
                                                │
                                                ▼
  6. Find conversation by              ┌──────────────────┐
     analyzing headers/refs ────────►  │  Memory Search   │
                                       │  - Find thread   │
                                       │  - Match conv ID │
                                       └────────┬─────────┘
                                                │
                                                ▼
  7. Store in conversation             ┌──────────────────┐
     as 'user' message      ────────►  │  Agent.Memory    │
                                       │  role: 'user'    │
                                       └────────┬─────────┘
                                                │
                                                ▼
  8. AI reads thread and               ┌──────────────────┐
     generates reply        ────────►  │  Agent.process() │
                                       │  + Email Tool    │
                                       └────────┬─────────┘
                                                │
                                                ▼
  9. AI reply sent                     ┌──────────────────┐
     back to customer       ────────►  │  Customer Inbox  │
                                       └──────────────────┘
```

---

## 📋 Provider Capabilities

### 1. **Resend** (RECOMMENDED)

**Status**: ✅ Private Alpha (Available)

**Capabilities**:
- Inbound email forwarding to webhooks
- Email storage (survives webhook downtime)
- Attachment API (separate call)
- Auto-generated domains (`@your-app.resend.app`)
- Custom domain support
- Webhook security (signature verification)

**Setup**:
```typescript
// 1. Configure inbound domain in Resend dashboard
// 2. Set webhook endpoint
// 3. Install resend@6.2.0-canary.2 or later
```

**Webhook Payload**:
```json
{
  "id": "email_id",
  "from": "customer@example.com",
  "to": "support@yourapp.resend.app",
  "subject": "Re: Question about pricing",
  "text": "Email body...",
  "html": "<p>Email body...</p>",
  "headers": {
    "message-id": "<msg@provider.com>",
    "in-reply-to": "<original@provider.com>",
    "references": "<thread@provider.com>"
  },
  "receivedAt": "2025-01-25T10:30:00Z"
}
```

**Limitations**:
- Private alpha (need access)
- Attachments require separate API call
- Max 30MB total message size

---

### 2. **SendGrid**

**Status**: ✅ Production Ready

**Capabilities**:
- Mature Inbound Parse Webhook
- Full MIME message or parsed
- Spam scoring
- Attachment extraction
- Custom domain support

**Setup**:
```bash
# 1. Configure MX record
#    Priority: 10
#    Points to: mx.sendgrid.net

# 2. SendGrid Dashboard → Settings → Inbound Parse
# 3. Add hostname and webhook URL
```

**Webhook Payload**:
```json
{
  "headers": "Received: ...\nMessage-ID: ...",
  "from": "Customer <customer@example.com>",
  "to": "support@yourapp.com",
  "subject": "Re: Question",
  "text": "Email body...",
  "html": "<p>Email body...</p>",
  "envelope": {
    "to": ["support@yourapp.com"],
    "from": "customer@example.com"
  },
  "attachments": 2,
  "attachment1": "...",
  "attachment-info": {
    "attachment1": {
      "filename": "file.pdf",
      "type": "application/pdf"
    }
  },
  "spam_score": "0.1",
  "spam_report": "..."
}
```

**Limitations**:
- Max 30MB message size
- Must return 2xx within timeout
- Requires MX record changes

---

### 3. **SMTP** (Custom/Self-Hosted)

**Status**: ⚠️ Requires Third-Party Service

**Options**:

#### **Option A: CloudMailin** (Recommended for SMTP)
- Handles SMTP → Webhook conversion
- Custom domain support
- Attachment handling
- Free tier available

#### **Option B: MailSlurp**
- Developer-focused
- Real-time webhooks
- Multiple mailbox support

#### **Option C: Self-Hosted (smtp2http)**
- Open source
- Full control
- Requires server management

**Setup** (CloudMailin example):
```bash
# 1. Sign up for CloudMailin
# 2. Configure MX record to CloudMailin
# 3. Set webhook endpoint
# 4. CloudMailin forwards all emails as HTTP POST
```

**Webhook Payload** (varies by provider):
```json
{
  "envelope": {
    "to": "support@yourapp.com",
    "from": "customer@example.com"
  },
  "headers": {
    "Message-ID": "<msg@provider.com>",
    "In-Reply-To": "<original@provider.com>"
  },
  "plain": "Email body...",
  "html": "<p>Email body...</p>",
  "attachments": []
}
```

---

## 🏗️ Implementation Plan

### Phase 1: Email Router Enhancement

**Add webhook handling to EmailRouter**:

```typescript
// src/providers/email/email-router.ts

export class EmailRouter {
  // ... existing code ...

  /**
   * Handle incoming webhook from email provider
   * Automatically stores in conversation and triggers AI response
   */
  async handleInboundWebhook(payload: InboundWebhookPayload): Promise<{
    conversationId: string;
    emailId: string;
    aiReply?: string;
    autoReplied: boolean;
  }> {
    // 1. Parse provider-specific payload
    const parsed = this.parseWebhookPayload(payload);

    // 2. Find existing conversation or create new
    const conversation = await this.findOrCreateConversation(parsed);

    // 3. Store incoming email in memory as 'user' message
    await this.storeInboundEmail(parsed, conversation);

    // 4. Optionally trigger AI auto-reply
    const aiReply = await this.triggerAutoReply(parsed, conversation);

    return {
      conversationId: conversation.id,
      emailId: parsed.messageId,
      aiReply: aiReply?.id,
      autoReplied: !!aiReply
    };
  }
}
```

### Phase 2: Conversation Matching Logic

**How to find the right conversation**:

```typescript
/**
 * Find conversation by analyzing email headers
 */
private async findOrCreateConversation(email: ParsedEmail): Promise<Conversation> {
  // Method 1: Check In-Reply-To header
  if (email.headers['in-reply-to']) {
    const originalEmail = await this.findEmailByMessageId(
      email.headers['in-reply-to']
    );
    if (originalEmail) {
      return originalEmail.conversation;
    }
  }

  // Method 2: Check References header (full thread)
  if (email.headers.references) {
    const messageIds = email.headers.references.split(' ');
    for (const msgId of messageIds) {
      const found = await this.findEmailByMessageId(msgId);
      if (found) return found.conversation;
    }
  }

  // Method 3: Check subject line (Re: prefix)
  if (email.subject.startsWith('Re:')) {
    const originalSubject = email.subject.replace(/^Re:\s*/, '');
    const found = await this.findConversationBySubject(
      originalSubject,
      email.from
    );
    if (found) return found;
  }

  // Method 4: Check from/to email addresses
  const found = await this.findConversationByParticipants(
    email.from,
    email.to
  );
  if (found) return found;

  // No match found - create new conversation
  return this.createNewConversation(email);
}
```

### Phase 3: Store Inbound Email

```typescript
/**
 * Store incoming email in Agent memory
 */
private async storeInboundEmail(
  email: ParsedEmail,
  conversation: Conversation
): Promise<void> {
  await this.agent.getMemory().store({
    id: `msg-${conversation.id}-${Date.now()}`,
    content: email.text || email.html || '',
    timestamp: new Date(email.receivedAt),
    type: 'conversation',
    channel: 'email',
    role: 'user', // ← Incoming emails are from the user
    sessionMetadata: {
      conversationId: conversation.id,
      emailId: email.messageId,
      threadId: conversation.threadId,
      direction: 'inbound',
      from: email.from,
      to: email.to,
      subject: email.subject,
      status: 'completed'
    }
  });
}
```

### Phase 4: AI Auto-Reply (Optional)

```typescript
/**
 * Optionally trigger AI to auto-reply
 */
private async triggerAutoReply(
  email: ParsedEmail,
  conversation: Conversation,
  config?: {
    autoReply?: boolean;
    prompt?: string;
    tone?: string;
  }
): Promise<EmailSession | null> {
  // Check if auto-reply is enabled
  if (!config?.autoReply) {
    return null;
  }

  // Use AI to read thread and compose reply
  const reply = await this.emailResource.reply(email.messageId, {
    prompt: config.prompt || 'Respond to this customer email professionally',
    tone: config.tone || 'professional'
  });

  return reply;
}
```

---

## 🔌 Webhook Endpoint Setup

### Express.js Example

```typescript
import express from 'express';
import { AIReceptionist } from '@loctelli/ai-receptionist';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For SendGrid

const aiReceptionist = new AIReceptionist({...});
await aiReceptionist.initialize();

// Resend webhook
app.post('/webhooks/resend/inbound', async (req, res) => {
  try {
    const result = await aiReceptionist.emailRouter.handleInboundWebhook({
      provider: 'resend',
      payload: req.body,
      autoReply: true, // Auto-respond with AI
      autoReplyPrompt: 'Handle this customer inquiry professionally'
    });

    res.json({
      success: true,
      conversationId: result.conversationId,
      autoReplied: result.autoReplied
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// SendGrid webhook
app.post('/webhooks/sendgrid/inbound', async (req, res) => {
  try {
    const result = await aiReceptionist.emailRouter.handleInboundWebhook({
      provider: 'sendgrid',
      payload: req.body,
      autoReply: true
    });

    res.status(200).send('OK'); // SendGrid requires 2xx
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Still return 200 to prevent retries
  }
});

app.listen(3000);
```

---

## 🎨 User Configuration

Users can control auto-reply behavior:

```typescript
const aiReceptionist = new AIReceptionist({
  agent: {...},
  providers: {
    email: {
      resend: {
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: 'support@myapp.com',
        inbound: {
          enabled: true,
          webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
          autoReply: true, // ← Enable AI auto-reply
          autoReplyConfig: {
            prompt: 'Respond professionally to customer inquiries',
            tone: 'friendly',
            requireApproval: false, // true = draft only, false = auto-send
            businessHours: {
              enabled: true,
              timezone: 'America/New_York',
              hours: { start: 9, end: 17 },
              days: [1, 2, 3, 4, 5] // Mon-Fri
            }
          }
        }
      }
    }
  }
});
```

---

## ✅ Benefits

1. **Automatic Thread Matching**
   - Finds conversation via In-Reply-To, References, Subject, or participants
   - AI always has full context

2. **Can Reply to ANY Conversation**
   - As long as it's in memory, AI can continue it
   - Even cross-channel (started via SMS, continued via email)

3. **Flexible Auto-Reply**
   - Fully automatic
   - Draft for approval
   - Business hours only
   - Custom prompts per conversation

4. **Zero Manual Intervention**
   - Webhook → Store → AI Reply → Send
   - All automatic

5. **Multi-Provider Support**
   - Works with Resend, SendGrid, SMTP services
   - Normalized webhook handling

---

## 🚀 Recommended Approach

### **TIER 1: Resend** (Best Developer Experience)
- Modern API
- Email storage
- Webhook + Inbound API
- **Use this if you can get alpha access**

### **TIER 2: SendGrid** (Production Ready)
- Battle-tested
- Wide adoption
- Full featured
- **Use this for production apps today**

### **TIER 3: CloudMailin** (SMTP Alternative)
- SMTP → Webhook bridge
- Works with any email provider
- **Use this if you need SMTP or custom domains**

---

## 📦 Implementation Checklist

### EmailRouter Enhancement
- [ ] Add `handleInboundWebhook()` method
- [ ] Add provider-specific payload parsers
- [ ] Add conversation matching logic
- [ ] Add inbound email storage
- [ ] Add auto-reply trigger
- [ ] Add webhook signature verification

### Configuration
- [ ] Add inbound config to provider settings
- [ ] Add auto-reply configuration options
- [ ] Add business hours logic
- [ ] Add approval workflow option

### Testing
- [ ] Unit tests for conversation matching
- [ ] Integration tests for each provider
- [ ] End-to-end webhook flow test
- [ ] AI reply quality tests

### Documentation
- [ ] Webhook setup guide for each provider
- [ ] Configuration examples
- [ ] Security best practices
- [ ] Troubleshooting guide

---

## 🎯 Next Steps

1. **Choose primary provider** (Resend or SendGrid)
2. **Implement EmailRouter.handleInboundWebhook()**
3. **Add conversation matching logic**
4. **Test with real webhooks**
5. **Add auto-reply intelligence**
6. **Deploy webhook endpoint**
7. **Monitor and optimize**

---

## ❓ FAQ

### Q: Can AI reply to emails it didn't start?
**A**: YES! As long as the conversation exists in memory (meaning at least one email was sent/received through the SDK), AI can continue it.

### Q: What if customer replies to a very old email?
**A**: The conversation matching will still work via In-Reply-To header. If conversation is purged from memory, a new one is created.

### Q: Can we have human approval before AI sends?
**A**: YES! Set `requireApproval: true` in config. AI drafts the reply, you review/edit, then manually send.

### Q: Does this work across providers?
**A**: YES! Store in memory is provider-agnostic. You could receive via SendGrid and reply via Resend.

### Q: What about attachments?
**A**: Webhook includes attachment metadata. We can store references and pass to AI context if needed.

---

This plan gives you **fully automated email conversations** where AI can read any reply and respond intelligently! 🚀
