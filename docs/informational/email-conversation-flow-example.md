# Email Conversation Flow - AI's Perspective

**How email conversations work in the AI Receptionist system**

---

## The Flow

1. **User sends email** → Postmark → Webhook → `handleWebhook()`
2. **Email stored in memory** → `storeInboundEmail()` stores the email content as a user message
3. **AI processes conversation** → Sees full conversation history + new email
4. **AI generates reply** → Uses `send_email` tool
5. **Reply stored in memory** → `storeOutboundEmail()` stores the bot's reply

---

## Where is the user's email content?

**Answer:** It's stored in memory as a "user" message with role `'user'`

**Code:** `email.resource.ts:530-544`
```typescript
// Build content with attachment info if present
let content = email.text || email.html || '';
if (email.attachments && email.attachments.length > 0) {
  const attachmentInfo = email.attachments.map(att =>
    `[Attachment: ${att.name} (${att.contentType}, ${att.contentLength} bytes)]`
  ).join('\n');
  content = `${content}\n\n${attachmentInfo}`;
}

await this.agent.getMemory().store({
  id: `msg-${conversationId}-${Date.now()}`,
  content,  // ← The user's email content
  timestamp: new Date(email.receivedAt),
  type: 'conversation',
  channel: 'email',
  role: 'user', // ← Incoming emails are from the user
  sessionMetadata: {
    conversationId,
    emailId: email.id,
    from: email.from,
    subject: email.subject,
    // ... etc
  }
});
```

---

## Example Conversation from AI's Perspective

### Scenario: Customer inquiring about order status

**Initial Email (User → AI)**

```json
{
  "conversationHistory": [],
  "newMessage": {
    "role": "user",
    "content": "Hi,\n\nI placed an order last week (Order #12345) but haven't received any updates. Can you tell me the status?\n\nThank you,\nJohn Smith",
    "timestamp": "2025-11-01T10:30:00Z",
    "channel": "email",
    "sessionMetadata": {
      "conversationId": "conv_abc123",
      "emailId": "CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com",
      "from": "john.smith@gmail.com",
      "to": "info@inbound.loctelli.com",
      "subject": "Order Status Inquiry",
      "direction": "inbound"
    }
  },
  "systemPrompt": "You are Sarah, Customer Service Representative...\n\n# COMMUNICATION GUIDELINES\n\n## Channel: EMAIL\n\n- Use proper email structure (greeting, body, closing)\n- HTML formatting is available - use it for clarity\n- Can be more detailed than SMS/call\n- Include relevant links and attachments\n- Professional tone with appropriate signature\n\n...",
  "userPrompt": "A customer email was received from john.smith@gmail.com with the subject \"Order Status Inquiry\".\nRespond to this customer email.\nUse the send_email tool to send your response."
}
```

**AI Response (Round 1)**

AI sees:
- Empty conversation history (first email)
- User's email content: "Hi, I placed an order..."
- System prompt with email channel guidelines
- User prompt instructing to respond

AI calls:
```json
{
  "tool": "send_email",
  "parameters": {
    "to": "john.smith@gmail.com",
    "subject": "Re: Order Status Inquiry",
    "body": "Hi John,\n\nThank you for reaching out! I'd be happy to help you with Order #12345.\n\nLet me check the status for you right away. Could you please confirm the email address you used when placing the order? This will help me locate your order details quickly.\n\nBest regards,\nSarah\nCustomer Service",
    "inReplyTo": "<CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com>",
    "references": "<CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com>"
  }
}
```

**Memory after AI responds:**
```json
[
  {
    "id": "msg-conv_abc123-1730458200000",
    "role": "user",
    "content": "Hi,\n\nI placed an order last week (Order #12345) but haven't received any updates. Can you tell me the status?\n\nThank you,\nJohn Smith",
    "timestamp": "2025-11-01T10:30:00Z",
    "channel": "email",
    "sessionMetadata": {
      "conversationId": "conv_abc123",
      "emailId": "CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com",
      "from": "john.smith@gmail.com",
      "subject": "Order Status Inquiry",
      "direction": "inbound"
    }
  },
  {
    "id": "msg-conv_abc123-1730458215000",
    "role": "assistant",
    "content": "Hi John,\n\nThank you for reaching out! I'd be happy to help you with Order #12345.\n\nLet me check the status for you right away. Could you please confirm the email address you used when placing the order? This will help me locate your order details quickly.\n\nBest regards,\nSarah\nCustomer Service",
    "timestamp": "2025-11-01T10:30:15Z",
    "channel": "email",
    "sessionMetadata": {
      "conversationId": "conv_abc123",
      "emailId": "509c5376-b9f1-43fa-8f81-def74088eb4b@mtasv.net",
      "to": "john.smith@gmail.com",
      "subject": "Re: Order Status Inquiry",
      "direction": "outbound",
      "inReplyTo": "<CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com>"
    }
  }
]
```

---

**Second Email (User → AI)**

```json
{
  "conversationHistory": [
    {
      "role": "user",
      "content": "Hi,\n\nI placed an order last week (Order #12345)...",
      "timestamp": "2025-11-01T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Hi John,\n\nThank you for reaching out! I'd be happy to help...",
      "timestamp": "2025-11-01T10:30:15Z"
    }
  ],
  "newMessage": {
    "role": "user",
    "content": "Yes, I used john.smith@gmail.com. That's the same email address.\n\nAlso, I just realized I have a tracking number: TRK789456. Does that help?",
    "timestamp": "2025-11-01T10:35:00Z",
    "channel": "email",
    "sessionMetadata": {
      "conversationId": "conv_abc123",
      "emailId": "CAMii_xyz789abc@mail.gmail.com",
      "from": "john.smith@gmail.com",
      "subject": "Re: Order Status Inquiry",
      "direction": "inbound",
      "inReplyTo": "<509c5376-b9f1-43fa-8f81-def74088eb4b@mtasv.net>"
    }
  },
  "systemPrompt": "...",
  "userPrompt": "A customer email was received from john.smith@gmail.com with the subject \"Re: Order Status Inquiry\".\nRespond to this customer email.\nUse the send_email tool to send your response."
}
```

**AI Response (Round 2)**

AI sees:
- **Full conversation history** (previous user email + previous AI response)
- **New user message** with tracking number
- Context that this is a continuing conversation

AI calls:
```json
{
  "tool": "send_email",
  "parameters": {
    "to": "john.smith@gmail.com",
    "subject": "Re: Order Status Inquiry",
    "body": "Hi John,\n\nPerfect! With tracking number TRK789456, I can confirm that your Order #12345 is currently in transit.\n\nAccording to the carrier, your package is expected to arrive on November 3rd, 2025. You can track the shipment in real-time here: https://track.example.com/TRK789456\n\nIs there anything else I can help you with regarding this order?\n\nBest regards,\nSarah\nCustomer Service",
    "inReplyTo": "<CAMii_xyz789abc@mail.gmail.com>",
    "references": "<CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com> <509c5376-b9f1-43fa-8f81-def74088eb4b@mtasv.net> <CAMii_xyz789abc@mail.gmail.com>"
  }
}
```

**Final conversation history:**
```json
[
  {
    "role": "user",
    "content": "Hi,\n\nI placed an order last week (Order #12345)...",
    "timestamp": "2025-11-01T10:30:00Z",
    "channel": "email"
  },
  {
    "role": "assistant",
    "content": "Hi John,\n\nThank you for reaching out! I'd be happy to help...",
    "timestamp": "2025-11-01T10:30:15Z",
    "channel": "email"
  },
  {
    "role": "user",
    "content": "Yes, I used john.smith@gmail.com. That's the same email address...",
    "timestamp": "2025-11-01T10:35:00Z",
    "channel": "email"
  },
  {
    "role": "assistant",
    "content": "Hi John,\n\nPerfect! With tracking number TRK789456...",
    "timestamp": "2025-11-01T10:35:20Z",
    "channel": "email"
  }
]
```

---

## Key Points

### 1. **Email content IS in the conversation history**
- User's email content is stored in `content` field
- Role is set to `'user'`
- AI sees the full email body when generating a response

### 2. **AI sees full context**
- All previous messages in the conversation
- The new email content
- System prompt with channel-specific guidelines
- User prompt with instruction to respond

### 3. **Threading is automatic**
- `inReplyTo` and `references` headers are managed automatically
- AI doesn't need to think about threading - it's handled by the system

### 4. **Conversation grows naturally**
```
User email 1  (role: user)
  ↓
AI response 1 (role: assistant)
  ↓
User email 2  (role: user) ← sees both previous messages
  ↓
AI response 2 (role: assistant) ← sees all 3 previous messages
  ↓
User email 3  (role: user) ← sees all 4 previous messages
  ... and so on
```

---

## Adding Email Content Mode Instructions to System Prompt

### Current System Prompt (Lines 498-504)

```typescript
case 'email':
  return [
    'Use proper email structure (greeting, body, closing)',
    'HTML formatting is available - use it for clarity',
    'Can be more detailed than SMS/call',
    'Include relevant links and attachments',
    'Professional tone with appropriate signature'
  ];
```

### Proposed Enhancement

**Add email content mode instructions dynamically based on active mode:**
 
```typescript
// In SystemPromptBuilder.ts

private getChannelGuidelines(channel: Channel, context?: any): string[] {
  switch (channel) {
    case 'email':
      const baseGuidelines = [
        'Use proper email structure (greeting, body, closing)',
        'Can be more detailed than SMS/call',
        'Include relevant links and attachments',
        'Professional tone with appropriate signature'
      ];

      // Add content mode-specific instructions
      if (context?.emailContentMode) {
        baseGuidelines.push(...this.getEmailContentModeInstructions(context.emailContentMode, context.emailTemplates));
      }

      return baseGuidelines;

    case 'call':
      // ... existing
    case 'sms':
      // ... existing
    default:
      // ... existing
  }
}

private getEmailContentModeInstructions(mode: 'text' | 'html' | 'template', templates?: string[]): string[] {
  switch (mode) {
    case 'text':
      return [
        'Generate plain text emails only',
        'Use the \'body\' parameter in send_email tool',
        'No HTML formatting - keep it simple and readable'
      ];

    case 'html':
      return [
        'You can generate HTML emails',
        'Use the \'html\' parameter in send_email tool for HTML content',
        'ALWAYS provide a plain text version in \'body\' parameter as fallback',
        'Use inline styles only (no external CSS)',
        'Keep HTML simple and mobile-friendly',
        'Ensure professional, clean markup'
      ];

    case 'template':
      const templateList = templates && templates.length > 0
        ? templates.join(', ')
        : 'none available';
      return [
        'Use predefined HTML templates for professional emails',
        `Available templates: ${templateList}`,
        'Use \'template\' parameter to select a template',
        'Fill \'templateVars\' with appropriate content',
        'Focus on content quality - the template controls structure',
        'Enhance content to be engaging and professional'
      ];

    default:
      return [];
  }
}
```

### Usage in EmailResource

```typescript
// In email.resource.ts

private async triggerAutoReply(
  email: InboundEmailPayload,
  conversationId: string
): Promise<boolean> {
  // ... existing code ...

  // Build context with email content mode
  const emailContext = {
    emailContentMode: this.contentMode,
    emailTemplates: Array.from(this.htmlTemplates.keys())
  };

  // Use Agent to compose and send reply
  const agentResponse = await this.processWithAgent(
    `A customer email was received from ${email.from} with the subject "${email.subject}".
    Respond to this customer email.
    Use the send_email tool to send your response.`,
    {
      conversationId,
      toolHint: 'send_email',
      toolParams: {
        to: email.from,
        subject: `Re: ${cleanSubject}`,
        inReplyTo: formattedInReplyTo,
        references: references
      },
      // Pass email context to be included in system prompt
      channelContext: emailContext  // ← NEW
    }
  );

  // ... rest of code ...
}
```

---

## Example System Prompt with Email Mode Instructions

### Text Mode (Default)
```
# COMMUNICATION GUIDELINES

## Channel: EMAIL

- Use proper email structure (greeting, body, closing)
- Can be more detailed than SMS/call
- Include relevant links and attachments
- Professional tone with appropriate signature
- Generate plain text emails only
- Use the 'body' parameter in send_email tool
- No HTML formatting - keep it simple and readable
```

### HTML Mode
```
# COMMUNICATION GUIDELINES

## Channel: EMAIL

- Use proper email structure (greeting, body, closing)
- Can be more detailed than SMS/call
- Include relevant links and attachments
- Professional tone with appropriate signature
- You can generate HTML emails
- Use the 'html' parameter in send_email tool for HTML content
- ALWAYS provide a plain text version in 'body' parameter as fallback
- Use inline styles only (no external CSS)
- Keep HTML simple and mobile-friendly
- Ensure professional, clean markup
```

### Template Mode
```
# COMMUNICATION GUIDELINES

## Channel: EMAIL

- Use proper email structure (greeting, body, closing)
- Can be more detailed than SMS/call
- Include relevant links and attachments
- Professional tone with appropriate signature
- Use predefined HTML templates for professional emails
- Available templates: order-update, customer-service, professional
- Use 'template' parameter to select a template
- Fill 'templateVars' with appropriate content
- Focus on content quality - the template controls structure
- Enhance content to be engaging and professional
```

---

## Summary

### ✅ Email content IS included in conversation history
- Stored in `content` field with role `'user'`
- AI sees full email body when generating response
- Conversation history grows naturally with each exchange

### ✅ System prompt should include email mode instructions
- Add mode-specific guidelines to `getChannelGuidelines()`
- Pass email context (mode + templates) when calling agent
- System prompt dynamically adapts based on active mode

### ✅ AI sees complete context
- Full conversation history
- New email content
- System prompt with channel + mode guidelines
- Threading headers managed automatically

### 🎯 Recommended Implementation
1. Add `getEmailContentModeInstructions()` to SystemPromptBuilder
2. Update `getChannelGuidelines()` to accept context parameter
3. Pass email context from `triggerAutoReply()` to agent
4. System prompt now tells AI which mode it's in and how to use it

This ensures the AI knows:
- What mode it's in (text/html/template)
- What parameters to use in send_email tool
- What templates are available (if in template mode)
- How to format content appropriately
