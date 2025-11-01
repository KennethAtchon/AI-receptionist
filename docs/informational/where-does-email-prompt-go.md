# Where Does the Email Prompt Text Go?

**Question:** Where does this text go in the AI's message flow?
```typescript
`A customer email was received from ${email.from} with the subject "${email.subject}".
Respond to this customer email.
Use the send_email tool to send your response.`
```

**Answer:** It goes in the **USER MESSAGE** (not the system prompt)

---

## The Complete Message Flow

### Step 1: Email arrives via webhook
**File:** `email.resource.ts:670-684`

```typescript
const agentResponse = await this.processWithAgent(
  `A customer email was received from ${email.from} with the subject "${email.subject}".
  Respond to this customer email.
  Use the send_email tool to send your response.`,  // ← This is the USER MESSAGE (request.input)
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
```

### Step 2: Goes to BaseResource.processWithAgent()
**File:** `base.resource.ts:34-40`

```typescript
protected async processWithAgent(input: string, context: any): Promise<any> {
  return await this.agent.process({
    id: `${this.channel}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    input,  // ← "A customer email was received from..."
    channel: this.channel,  // 'email'
    context
  });
}
```

### Step 3: Agent.process() receives it
**File:** `Agent.ts:157-236`

```typescript
public async process(request: AgentRequest): Promise<AgentResponse> {
  // request.input = "A customer email was received from john.smith@gmail.com..."

  // 1. Security validation
  if (this.securityEnabled) {
    const securityCheck = this.inputValidator.validate(request.input);
    request = { ...request, input: securityCheck.sanitizedContent };
  }

  // 2. Retrieve conversation history
  const conversationHistory = await this.memory.retrieve(request.input, {
    conversationId: request.context.conversationId,
    channel: request.channel
  });

  // 3. Build system prompt (static, no memory)
  const systemPrompt = request.channel
    ? await this.promptBuilder.build({
        identity: this.identity,
        personality: this.personality,
        knowledge: this.knowledge,
        goals: this.goals.getCurrent(),
        channel: request.channel,  // ← 'email'
        businessContext: request.context.businessContext
      })
    : this.cachedSystemPrompt!;

  // 4. Execute with AI provider
  const response = await this.execute(request, systemPrompt, conversationHistory);

  // 5. Update memory - Store user and assistant messages separately
  await this.memory.store({
    id: `${interactionId}-user`,
    content: request.input,  // ← "A customer email was received from..."
    timestamp: new Date(),
    type: 'conversation',
    role: 'user',  // ← USER MESSAGE
    channel: request.channel,
    sessionMetadata: {
      conversationId: request.context.conversationId
    }
  });

  // ... rest
}
```

### Step 4: Agent.execute() sends to AI provider
**File:** `Agent.ts:274-310` (lines renumbered in modified file)

```typescript
private async execute(
  request: AgentRequest,
  systemPrompt: string,
  conversationHistory: ConversationHistory
): Promise<AgentResponse> {
  const availableTools = this.toolRegistry
    ? this.toolRegistry.listAvailable(request.channel)
    : [];

  let messages = conversationHistory.messages;

  // Compress if needed
  if (messages.length > 20) {
    messages = await this.promptOptimizer.compressChatHistory(messages, 4000);
  }

  const fullHistory = [
    ...(conversationHistory.contextMessages || []),
    ...messages
  ];

  // FINAL AI CALL
  const aiResponse = await this.aiProvider.chat({
    conversationId: request.context.conversationId,
    userMessage: request.input,  // ← "A customer email was received from..."
    conversationHistory: fullHistory,  // ← Previous messages
    availableTools: availableTools,
    systemPrompt: systemPrompt  // ← Built from SystemPromptBuilder
  });

  // ... handle tool calls
}
```

---

## What the AI Actually Sees

### Messages sent to OpenAI/Anthropic:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "# IDENTITY & ROLE\n\nYou are Sarah, Customer Service Representative.\n\n... (full system prompt from SystemPromptBuilder)\n\n# COMMUNICATION GUIDELINES\n\n## Channel: EMAIL\n\n- Use proper email structure (greeting, body, closing)\n- HTML formatting is available - use it for clarity\n- Can be more detailed than SMS/call\n- Include relevant links and attachments\n- Professional tone with appropriate signature\n\n..."
    },
    {
      "role": "user",
      "content": "Hi,\n\nI placed an order last week (Order #12345) but haven't received any updates. Can you tell me the status?\n\nThank you,\nJohn Smith"
    },
    {
      "role": "assistant",
      "content": "Hi John,\n\nThank you for reaching out! I'd be happy to help you with Order #12345..."
    },
    {
      "role": "user",
      "content": "A customer email was received from john.smith@gmail.com with the subject \"Re: Order Status Inquiry\".\nRespond to this customer email.\nUse the send_email tool to send your response."
    }
  ],
  "tools": [
    {
      "name": "send_email",
      "description": "Send an email message",
      "parameters": { ... }
    }
  ]
}
```

---

## Key Points

### 1. **It's a USER message, NOT system prompt**
```typescript
// ❌ NOT added to system prompt
// ✅ Added as a user message in conversation history

{
  role: 'user',
  content: 'A customer email was received from john.smith@gmail.com...'
}
```

### 2. **This happens AFTER the actual email is stored**

**Timeline:**
1. Email arrives → Stored as user message: `"Hi, I placed an order..."`
2. Auto-reply triggered → New user message: `"A customer email was received from..."`
3. AI sees BOTH messages in history

**Result:** The AI sees TWO user messages:
- First: The actual email content (`"Hi, I placed an order..."`)
- Second: The instruction to respond (`"A customer email was received..."`)

### 3. **System prompt is built separately**

**System prompt comes from:** `SystemPromptBuilder.build()`
- Contains: Identity, Personality, Knowledge, Goals, Communication Guidelines
- Does NOT contain: `"A customer email was received..."`
- Built once per channel, then used for all requests

---

## So What's the Problem?

### Current Flow:
```
Conversation History:
[
  { role: "user", content: "Hi, I placed an order #12345..." },        ← Actual email
  { role: "assistant", content: "Hi John, thank you..." },            ← AI response
  { role: "user", content: "Yes, I used john.smith@gmail.com..." },   ← User's reply
  { role: "user", content: "A customer email was received from..." }  ← Instruction
]
```

**Issue:** The instruction `"A customer email was received from..."` is added as a **new user message** every time!

This means:
- ✅ AI sees the actual email content (good)
- ⚠️ AI also sees an instruction message (meta, not from user)
- ⚠️ This instruction is stored in conversation history
- ⚠️ The instruction pollutes the conversation with meta-commentary

### Better Approach:

**Option 1: Add to system prompt dynamically**
```typescript
// Build system prompt with email-specific instructions
const systemPrompt = await this.promptBuilder.build({
  identity: this.identity,
  personality: this.personality,
  knowledge: this.knowledge,
  goals: this.goals.getCurrent(),
  channel: request.channel,
  // Add email-specific context
  emailContext: {
    mode: this.contentMode,
    templates: Array.from(this.htmlTemplates.keys()),
    instruction: "Respond to customer emails using the send_email tool"
  }
});
```

**Option 2: Use a special message type that doesn't get stored**
```typescript
// Don't store the instruction in conversation history
// Just pass it as a one-time directive to the AI

const response = await this.execute(request, systemPrompt, conversationHistory, {
  directive: "A customer email was received. Respond using send_email tool."
});
```

**Option 3: Remove the instruction entirely**
```typescript
// System prompt already says:
// "When receiving emails, use send_email tool to respond"

// So we don't need to repeat it every time!
// Just process the email directly:
const agentResponse = await this.processWithAgent(
  "", // ← No instruction needed, email is already in history
  { conversationId, toolHint: 'send_email', ... }
);
```

---

## Recommendation

**Remove the instruction text entirely!**

The system prompt (via `SystemPromptBuilder`) already tells the AI:
- Channel is EMAIL
- Use proper email structure
- Respond professionally

We don't need to add `"A customer email was received from..."` because:
1. ✅ The actual email content is already in conversation history
2. ✅ The system prompt already has email guidelines
3. ✅ The `toolHint` parameter suggests using `send_email`
4. ✅ The `toolParams` provide the necessary threading headers

**Simplified version:**
```typescript
// triggerAutoReply() - SIMPLIFIED
const agentResponse = await this.processWithAgent(
  "", // ← Empty! Email content already in history
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
```

The AI will:
1. See the email in conversation history
2. See system prompt with "Channel: EMAIL" guidelines
3. Get `toolHint: 'send_email'`
4. Automatically compose a response using send_email tool

---

## Summary

| What | Where | When |
|------|-------|------|
| **Actual email content** | Conversation history (user message) | When email arrives (storeInboundEmail) |
| **Instruction text** | Conversation history (user message) | When auto-reply triggers ⚠️ |
| **System prompt** | AI provider call (system message) | Every request |
| **Email mode instructions** | Should be in system prompt | Every email request ✅ |

**Current:** Instruction is a user message (pollutes history)
**Recommendation:** Remove instruction, rely on system prompt + toolHint

---

**Bottom line:** That text goes into the **conversation history as a user message**, not the system prompt. And it probably shouldn't be there at all! 🎯
