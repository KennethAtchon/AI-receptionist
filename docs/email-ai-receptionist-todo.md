# AI Receptionist Email Feature - TODO List

**Status:** Core features complete, enhancements needed for production
**Last Updated:** November 1, 2025

---

## ✅ Completed (Core Features)

### Email Flow
- ✅ Inbound email webhook handling (Postmark)
- ✅ Email threading detection (In-Reply-To, References, Subject, Participants)
- ✅ Conversation creation and matching
- ✅ Storage in memory with metadata
- ✅ AI auto-reply with `send_email` tool
- ✅ Proper threading headers (In-Reply-To, References) - **FIXED Nov 1, 2025**
- ✅ Attachment support (inbound)
- ✅ Multi-email conversations (unlimited back-and-forth)

### Security & Safeguards
- ✅ Email allowlist management (auto-adds senders who initiate conversations)
- ✅ Safeguard against forwarded emails from unknown senders
- ✅ Private allowlist methods with public `removeFromAllowlist()` and `getAllowlist()`

### Email Sending
- ✅ AI can send unlimited emails via `send_email` tool
- ✅ Support for custom recipients, subject, body, HTML
- ✅ Attachment support (outbound)
- ✅ Threading headers preserved

---

## 🔨 TODO - Priority 1 (Production Critical)

### 1. Remove Redundant User Message in Auto-Reply
**Why:** Currently adds instruction as a user message, causing two consecutive user messages. Should move instruction to system prompt instead.

**Current Problem:**
```typescript
// In triggerAutoReply() - lines 670-673
const agentResponse = await this.processWithAgent(
  `A customer email was received from ${email.from} with the subject "${email.subject}".
  Respond to this customer email.
  Use the send_email tool to send your response.`,  // ← This creates a user message!
  { conversationId, toolHint: 'send_email', ... }
);
```

**Results in two user messages in a row:**
```json
[
  { "role": "user", "content": "Hi, I placed an order..." },  // Actual email
  { "role": "user", "content": "A customer email was received..." }  // Instruction
]
```

**Solution:**
Remove the instruction message entirely and add email response behavior to system prompt instead.

**Implementation:**
- ❌ Remove instruction text from `triggerAutoReply()`
- ❌ Add email response instructions to SystemPromptBuilder for email channel
- ❌ Update email channel guidelines to include: "When a customer sends an email, respond using the send_email tool"

**Code changes:**
```typescript
// In triggerAutoReply() - SIMPLIFIED
const agentResponse = await this.processWithAgent(
  "",  // ← Empty! Email content already in conversation history
  {
    conversationId,
    toolHint: 'send_email',
    toolParams: {
      to: email.from,
      subject: `Re: ${cleanSubject}`,
      inReplyTo: formattedInReplyTo,
      references: references
    }
  }
);

// In SystemPromptBuilder.ts - getChannelGuidelines()
case 'email':
  return [
    'Use proper email structure (greeting, body, closing)',
    'Can be more detailed than SMS/call',
    'Include relevant links and attachments',
    'Professional tone with appropriate signature',
    'When responding to customer emails, use the send_email tool',  // ← NEW
    'Always maintain proper email threading'  // ← NEW
  ];
```

**Why this is better:**
- ✅ Only one user message (the actual email content)
- ✅ No redundant instruction message
- ✅ System prompt already tells AI to use send_email for emails
- ✅ Cleaner conversation history
- ✅ AI behavior guided by system prompt, not meta-messages

**Files to modify:**
- `src/resources/core/email.resource.ts` - Remove instruction text from triggerAutoReply()
- `src/agent/prompt/SystemPromptBuilder.ts` - Add email response instruction to email channel guidelines

**Estimated time:** 30 min

---

### 2. Expose Allowlist Management API
**Why:** Users need a way to manually manage who can interact with the AI via email

**Implementation:**
- ✅ Already has `removeFromAllowlist(email)` and `getAllowlist()` methods
- ❌ Need to expose via a separate API (NOT in client.ts)
- ❌ Add `addToAllowlist(email, source?)` as a public method

**Files to modify:**
- `src/resources/core/email.resource.ts` - Make `addToAllowlist()` public
- Create new file: `src/api/email-allowlist.api.ts` or expose via existing REST API

**API Design:**
```typescript
// Expose these methods publicly:
email.addToAllowlist(email: string, addedBy?: string): Promise<void>
email.removeFromAllowlist(email: string): Promise<void>
email.getAllowlist(): string[]
email.isInAllowlist(email: string): boolean  // Make this public too
```

---

### 2. Out-of-Office / Auto-Reply Detection
**Why:** Prevent email loops when AI responds to other auto-responders

**Implementation:**
- ❌ Check for auto-reply headers before sending response
- ❌ Skip auto-reply if detected

**Headers to check:**
```typescript
// Auto-reply indicators
const autoReplyHeaders = [
  'auto-submitted',           // RFC 3834
  'x-auto-response-suppress', // Microsoft
  'x-autorespond',            // Generic
  'precedence'                // 'auto-reply', 'bulk', 'junk'
];

// In triggerAutoReply():
if (email.headers?.['auto-submitted'] && email.headers['auto-submitted'] !== 'no') {
  logger.info('[EmailResource] Skipping auto-reply for auto-submitted email');
  return false;
}

if (email.headers?.['x-auto-response-suppress']?.includes('All')) {
  logger.info('[EmailResource] Skipping auto-reply for suppressed email');
  return false;
}

if (email.headers?.precedence?.match(/auto-reply|bulk|junk/i)) {
  logger.info('[EmailResource] Skipping auto-reply for bulk/auto-reply email');
  return false;
}
```

**Files to modify:**
- `src/resources/core/email.resource.ts` - Add to `triggerAutoReply()` method (around line 524)

---

### 3. Rate Limiting (Soft Implementation)
**Why:** Prevent spam loops if two AIs email each other or if a user sends many emails rapidly

**Implementation:**
- ❌ Track email send rate per conversation
- ❌ Limit to N emails per hour per conversation
- ❌ Log warning if rate limit approached

**Note:** Consumer should handle hard rate limits (e.g., API gateway), but we can add soft limits here.

**Design:**
```typescript
// In EmailResource class
private conversationEmailCounts = new Map<string, { count: number, resetAt: number }>();

private async checkRateLimit(conversationId: string): Promise<boolean> {
  const now = Date.now();
  const limit = 10; // 10 emails per hour
  const windowMs = 60 * 60 * 1000; // 1 hour

  let counter = this.conversationEmailCounts.get(conversationId);

  if (!counter || now > counter.resetAt) {
    // Reset or initialize
    counter = { count: 0, resetAt: now + windowMs };
    this.conversationEmailCounts.set(conversationId, counter);
  }

  if (counter.count >= limit) {
    logger.warn(`[EmailResource] Rate limit exceeded for conversation ${conversationId}`);
    return false; // Rate limit exceeded
  }

  counter.count++;
  return true; // OK to send
}

// In triggerAutoReply():
const canSend = await this.checkRateLimit(conversationId);
if (!canSend) {
  logger.warn('[EmailResource] Skipping auto-reply due to rate limit');
  return false;
}
```

**Files to modify:**
- `src/resources/core/email.resource.ts` - Add rate limiting logic

---

## 🎯 TODO - Priority 2 (Enhanced Experience)

### 4. CC/BCC Handling with Archive CC
**Why:** Support CC/BCC in replies, automatically CC a monitoring inbox

**Implementation:**
- ✅ Already have `cc`, `ccFull`, `bcc`, `bccFull` from Postmark webhook
- ❌ Need to pass CC/BCC to `send_email` tool
- ❌ Add archiveCc configuration (already in PostmarkProvider but not used)

**Design:**
```typescript
// In triggerAutoReply(), add CC support:
const agentResponse = await this.processWithAgent(
  `A customer email was received...`,
  {
    conversationId,
    toolHint: 'send_email',
    toolParams: {
      to: email.from,
      subject: `Re: ${cleanSubject}`,
      inReplyTo: formattedInReplyTo,
      references: references,
      cc: email.cc || undefined,  // ← Add original CC recipients
      // archiveCc will be added automatically by PostmarkProvider
    }
  }
);

// Update send_email tool to support cc parameter
// File: src/tools/standard/email-tools.ts
properties: {
  // ... existing params
  cc: {
    type: 'string',
    description: 'CC email addresses (comma-separated)'
  }
}
```

**Files to modify:**
- `src/resources/core/email.resource.ts` - Pass CC to toolParams
- `src/tools/standard/email-tools.ts` - Add `cc` parameter to send_email tool

**Configuration:**
- `archiveCc` is already supported in PostmarkProvider config
- Users can set it when initializing Postmark provider

---


### 6. AI Email Content Generation Modes (Text vs HTML vs Template)
**Why:** Give consumers control over whether AI generates plain text, HTML, or uses templates

**📖 Full Design:** See [email-content-modes.md](./email-content-modes.md) for complete documentation

**The Three Modes:**

1. **`text` mode (DEFAULT)** - AI generates plain text only
   - Safest, best deliverability
   - No configuration needed
   - AI writes: `send_email({ body: "plain text here" })`

2. **`html` mode** - AI generates HTML markup directly
   - AI writes HTML in `html` field with inline styles
   - Must provide `body` as plain text fallback
   - AI writes: `send_email({ body: "text", html: "<html>...</html>" })`
   - ⚠️ Riskier - AI might generate invalid HTML

3. **`template` mode (RECOMMENDED)** - AI uses predefined HTML templates
   - Consumer provides HTML structure via `.addHtmlTemplate()`
   - AI fills in `{{variables}}` with content
   - AI writes: `send_email({ template: "name", templateVars: {...} })`
   - ✅ Best of both worlds - consumer controls structure, AI enhances content

**Implementation:**
- ❌ Add `setContentMode(mode: 'text' | 'html' | 'template')` method
- ❌ Add `addHtmlTemplate(name, template)` method for templates
- ❌ Update system prompt based on active mode
- ❌ Update `send_email` tool schema dynamically based on mode
- ❌ Add validation to enforce mode restrictions
- ❌ Add template variable substitution logic (`{{varName}}`)

**Quick API:**
```typescript
type EmailContentMode = 'text' | 'html' | 'template';

class EmailResource {
  private contentMode: EmailContentMode = 'text';
  private htmlTemplates = new Map<string, string>();

  public setContentMode(mode: EmailContentMode): void;
  public addHtmlTemplate(name: string, template: string): void;
  private getEmailContentInstructions(): string;  // For system prompt
  private applyTemplate(name: string, vars: Record<string, string>): string;
}
```

**Consumer Usage:**
```typescript
// MODE 1: Text-only (DEFAULT)
const client = new AIReceptionist({ /* ... */ });
await client.initialize();
// AI: send_email({ body: "plain text" })

// MODE 2: AI-generated HTML
client.email.setContentMode('html');
// AI: send_email({
//   body: "fallback",
//   html: "<html><body><h2>Title</h2>...</body></html>"
// })

// MODE 3: Template-based (RECOMMENDED)
client.email.setContentMode('template');
client.email.addHtmlTemplate('order-update', `
  <html><body style="font-family: Arial;">
    <div style="background: #4A90E2; padding: 20px;">
      <h2>{{title}}</h2>
    </div>
    <div style="padding: 20px;">{{mainContent}}</div>
  </body></html>
`);
// AI: send_email({
//   template: "order-update",
//   templateVars: {
//     title: "Order Shipped!",
//     mainContent: "<p>Your order #12345...</p>"
//   }
// })
```

**Mode Comparison:**

| Mode | AI Control | Consumer Control | Safety | Use Case |
|------|------------|------------------|--------|----------|
| `text` | Writes plain text | Nothing | ✅ Highest | Default, simple |
| `html` | Writes HTML | Nothing | ⚠️ Medium | Advanced, trust AI |
| `template` | Fills variables | HTML structure | ✅ High | Professional branded emails |

**Key Points:**
- **Defaults to text** - Safest option, best deliverability
- **Template mode recommended** - Consumer controls brand, AI enhances content
- **HTML mode = full freedom** - AI generates markup (riskier)
- **Only one mode active** - Clear separation of concerns
- **System prompt adapts** - AI knows what parameters to use based on mode

**Files to modify:**
- `src/resources/core/email.resource.ts` - Add mode management and template methods
- `src/tools/standard/email-tools.ts` - Dynamic schema and validation per mode
- `src/types/index.ts` - Add `EmailContentMode` type
- System prompt builder - Integrate mode-specific instructions

---

### 7. Optional Instructions per Email Session
**Why:** Allow per-email customization of AI behavior without changing system prompt

**Implementation:**
- ❌ Add optional `instructions` field to `handleWebhook()` or `triggerAutoReply()`
- ❌ Pass instructions to agent via context

**Design:**
```typescript
// In EmailResource class
async handleWebhook(
  context: WebhookContext,
  options?: {
    instructions?: string;  // ← Add optional instructions
    autoReply?: boolean;
  }
): Promise<{...}> {
  // ...
  const autoReplied = await this.triggerAutoReply(
    parsed,
    conversationId,
    options?.instructions
  );
}

private async triggerAutoReply(
  email: InboundEmailPayload,
  conversationId: string,
  additionalInstructions?: string  // ← Add parameter
): Promise<boolean> {
  // ...
  let prompt = `A customer email was received from ${email.from}...`;

  if (additionalInstructions) {
    prompt += `\n\nAdditional instructions: ${additionalInstructions}`;
  }

  const agentResponse = await this.processWithAgent(prompt, {...});
}
```

**Files to modify:**
- `src/resources/core/email.resource.ts` - Add instructions parameter

---

## 🌟 TODO - Priority 3 (Nice to Have)

### 8. Business Hours Configuration
**Why:** Only respond during business hours

**Implementation:**
- ❌ Add business hours to Agent configuration
- ❌ Check current time before sending auto-reply
- ❌ Queue emails for later if outside business hours (optional)

**Design:**
```typescript
// In Agent config or EmailResource config
businessHours: {
  enabled: true,
  timezone: 'America/New_York',
  schedule: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    // ... etc
  }
}

// In triggerAutoReply():
if (config.businessHours?.enabled) {
  const now = new Date();
  const inBusinessHours = this.isInBusinessHours(now, config.businessHours);

  if (!inBusinessHours) {
    logger.info('[EmailResource] Outside business hours, skipping auto-reply');
    return false;
  }
}
```

**Files to modify:**
- `src/agent/types.ts` - Add business hours config type
- `src/resources/core/email.resource.ts` - Add business hours check


---


## 📋 Summary of Action Items

### Immediate (Priority 1)
1. ✅ Make `addToAllowlist()` public
2. ✅ Add out-of-office detection
3. ✅ Add soft rate limiting

### Short-term (Priority 2)
4. ✅ Add CC/BCC handling with archive CC
5. ✅ Verify Reply-To header usage (may already be done)
6. ✅ Add HTML template system
7. ✅ Add optional instructions parameter

### Long-term (Priority 3)
8. ✅ Add business hours configuration
9. ❌ Skip signature management (not needed)
10. ✅ Add metrics and analytics

---

## 🎯 Recommended Implementation Order

1. **Out-of-office detection** (30 min) - Critical to prevent loops
2. **Rate limiting** (1 hour) - Critical to prevent abuse
3. **Expose allowlist API** (1 hour) - High value, easy win
4. **CC/BCC handling** (1 hour) - Improves functionality
5. **HTML templates** (2 hours) - Makes emails professional
6. **Optional instructions** (30 min) - Adds flexibility
7. **Business hours** (2 hours) - Nice polish

**Total estimated time for Priority 1-2:** ~6-8 hours

---

## 📝 Notes

### What Works Now
- ✅ Core email flow (receive → AI responds → threading works)
- ✅ Email threading is **fixed** (uses actual Message-IDs from headers)
- ✅ Allowlist prevents spam
- ✅ Safeguards against forwarded emails
- ✅ Unlimited conversation length
- ✅ Attachment support

### What's Missing for Production
- ⚠️ Out-of-office detection (could cause loops)
- ⚠️ Rate limiting (could cause spam)
- ⚠️ Allowlist management API (users can't manage manually)

### What's Nice to Have
- HTML templates for professional emails
- CC/BCC support for team collaboration
- Business hours for professional appearance
- Metrics for monitoring and optimization

---

**Ready to implement!** Start with Priority 1 items for production readiness.
