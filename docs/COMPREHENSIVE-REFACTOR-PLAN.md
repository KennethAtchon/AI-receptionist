# 🏗️ Comprehensive Refactor Plan - Unified Vision Architecture

## Executive Summary

This document outlines a complete architectural refactor to align the AI Receptionist SDK with its stated vision: **A unified, tool-driven, multi-channel AI communication platform where resources maintain active sessions while sharing a common tool ecosystem.**

**Core Goals:**
1. **Webhook Email Automation**: Automatic inbound email processing with AI auto-reply
2. **Unified Resource Pattern**: All resources (Voice, Email, SMS, Text) share the same tool system
3. **Agent-Centric Architecture**: Everything flows through the Agent
4. **Continuous Session Management**: Resources maintain active conversations while using tools
5. **Zero Redundancy**: Single execution path for all actions

---

## 📊 Current State Analysis

### What Works Well ✅

1. **Tool System**: Excellent channel-aware tool design with `.onCall()`, `.onSMS()`, `.onEmail()` handlers
2. **Agent Architecture**: Six-pillar agent system with Identity, Personality, Knowledge, Goals, Memory
3. **Provider System**: Clean provider abstraction with lazy loading and validation
4. **TextResource**: Correctly uses Agent → Tools pattern

### Critical Problems ❌

| Problem | Impact | Current | Vision |
|---------|--------|---------|--------|
| **Resource-Tool Separation** | Resources bypass tools entirely | Resources → Processors → Providers | Resources → Agent → Tools → Providers |
| **Processor Layer Redundancy** | Duplicate logic, maintenance burden | Tools + Processors both exist | Tools only |
| **Missing Continuous Sessions** | Can't maintain active conversations | One-shot API calls | Active session managers |
| **Only Text Uses Agent** | Other resources are "dumb pipes" | CallsResource bypasses Agent | All resources use Agent |
| **No Webhook Support** | Can't receive inbound emails | N/A | Full webhook automation |

---

## 🎯 Target Architecture

### The Vision (From SDK_VISION.md + WEBHOOK-EMAIL-AUTOMATION-PLAN.md)

```
┌────────────────────────────────────────────────────────────────┐
│                    AI Receptionist SDK                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Voice     │  │    Email     │  │     SMS      │         │
│  │   Resource   │  │   Resource   │  │   Resource   │         │
│  │              │  │              │  │              │         │
│  │ • maintain   │  │ • maintain   │  │ • maintain   │         │
│  │   sessions   │  │   threads    │  │   threads    │         │
│  │ • webhook    │  │ • webhook    │  │ • webhook    │         │
│  │   handlers   │  │   handlers   │  │   handlers   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                    │
│                  ┌────────▼────────┐                           │
│                  │      Agent      │  (Intelligent Core)       │
│                  │  • process()    │                           │
│                  │  • tools        │                           │
│                  │  • memory       │                           │
│                  └────────┬────────┘                           │
│                           │                                    │
│                  ┌────────▼────────┐                           │
│                  │   Tool System   │  (Shared Ecosystem)       │
│                  │  • send_email   │                           │
│                  │  • make_call    │                           │
│                  │  • send_sms     │                           │
│                  │  • calendar     │                           │
│                  └────────┬────────┘                           │
│                           │                                    │
│                  ┌────────▼────────┐                           │
│                  │    Providers    │  (External APIs)          │
│                  │  • Twilio       │                           │
│                  │  • Resend       │                           │
│                  │  • SendGrid     │                           │
│                  │  • Google       │                           │
│                  └─────────────────┘                           │
└────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Execution Path**: All actions go through Agent → Tools → Providers
2. **Tools Call Providers Directly**: Remove processor layer entirely
3. **Resources Are Session Managers**: Maintain active conversations, handle webhooks
4. **All Resources Use Agent**: No bypassing the intelligent core
5. **Webhook-First Design**: Every channel can receive inbound messages

---

## 📋 Refactor Plan - Phase by Phase

## Phase 1: Foundation - Tool System Enhancement 🔧

**Goal**: Make tools the single source of truth for all actions

### 1.1 Remove Processor Layer

**Files to Modify:**
- `src/processors/call.processor.ts` → DELETE
- `src/processors/messaging.processor.ts` → DELETE
- `src/processors/calendar.processor.ts` → DELETE
- `src/processors/email.processor.ts` → DELETE
- `src/processors/base.processor.ts` → DELETE
- `src/processors/processor.types.ts` → DELETE
- `src/processors/initialization.ts` → DELETE
- `src/processors/index.ts` → DELETE

**Action:**
```typescript
// Before (Processor):
class CallProcessor {
  async initiateCall(params) {
    const client = this.twilioProvider.createClient();
    return await client.calls.create({ ... });
  }
}

// After (Tool calls provider directly):
export function buildInitiateCallTool(config: {
  providerRegistry: ProviderRegistry
}): ITool {
  return new ToolBuilder()
    .withName('initiate_call')
    .withDescription('Make an outbound phone call')
    .withParameters({ ... })
    .default(async (params, ctx) => {
      // Get provider directly
      const twilioProvider = await config.providerRegistry.get<TwilioProvider>('twilio');
      const client = twilioProvider.createClient();

      // Call Twilio directly
      const call = await client.calls.create({
        to: params.to,
        from: twilioProvider.getConfig().phoneNumber,
        url: params.webhookUrl
      });

      return {
        success: true,
        data: { callSid: call.sid },
        response: { text: 'Call initiated successfully' }
      };
    })
    .build();
}
```

### 1.2 Enhance Tools to Access Providers Directly

**Files to Modify:**
- `src/tools/standard/call-tools.ts`
- `src/tools/standard/messaging-tools.ts`
- `src/tools/standard/email-tools.ts`
- `src/tools/standard/calendar-tools.ts`

**Pattern:**
```typescript
// All tools receive ProviderRegistry instead of Processors
export function buildCallTools(config: {
  providerRegistry: ProviderRegistry
}): ITool[] {
  return [
    buildInitiateCallTool(config),
    buildEndCallTool(config),
    buildTransferCallTool(config)
  ];
}
```

### 1.3 Update Tool Initialization

**File**: `src/tools/initialization.ts`

```typescript
export async function registerAllTools(
  config: {
    config: AIReceptionistConfig;
    agent: Agent;
    providerRegistry: ProviderRegistry; // Remove processor params
  },
  toolRegistry: ToolRegistry
): Promise<void> {
  // Register standard tools
  if (config.config.tools?.defaults?.includes('calls')) {
    const callTools = buildCallTools({ providerRegistry: config.providerRegistry });
    callTools.forEach(tool => toolRegistry.register(tool));
  }

  if (config.config.tools?.defaults?.includes('messaging')) {
    const messagingTools = buildMessagingTools({ providerRegistry: config.providerRegistry });
    messagingTools.forEach(tool => toolRegistry.register(tool));
  }

  if (config.config.tools?.defaults?.includes('email')) {
    const emailTools = buildEmailTools({ providerRegistry: config.providerRegistry });
    emailTools.forEach(tool => toolRegistry.register(tool));
  }

  if (config.config.tools?.defaults?.includes('calendar')) {
    const calendarTools = buildCalendarTools({ providerRegistry: config.providerRegistry });
    calendarTools.forEach(tool => toolRegistry.register(tool));
  }

  // Register custom tools
  if (config.config.tools?.custom) {
    config.config.tools.custom.forEach(tool => toolRegistry.register(tool));
  }
}
```

---

## Phase 2: Resource Transformation 🔄

**Goal**: Transform resources from "dumb wrappers" to "intelligent session managers"

### 2.1 Create Base Resource Interface

**New File**: `src/resources/base.resource.ts`

```typescript
import type { Agent } from '../agent/core/Agent';
import type { Channel } from '../types';

export interface ResourceSession {
  id: string;
  conversationId: string;
  channel: Channel;
  status: 'active' | 'inactive' | 'completed';
  startedAt: Date;
  metadata?: Record<string, any>;
}

export interface WebhookContext {
  provider: string;
  payload: any;
  signature?: string;
  timestamp?: Date;
}

export abstract class BaseResource<TSession extends ResourceSession> {
  constructor(
    protected agent: Agent,
    protected channel: Channel
  ) {}

  /**
   * All resources use Agent.process() for actions
   */
  protected async processWithAgent(input: string, context: any): Promise<any> {
    return await this.agent.process({
      id: `${this.channel}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      input,
      channel: this.channel,
      context
    });
  }

  /**
   * Create a new session
   */
  protected async createSession(metadata?: Record<string, any>): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.agent.getMemory().startSession({
      conversationId,
      channel: this.channel,
      metadata
    });

    return conversationId;
  }

  /**
   * End a session
   */
  protected async endSession(conversationId: string): Promise<void> {
    await this.agent.getMemory().endSession(conversationId);
  }

  /**
   * Handle incoming webhook (to be implemented by each resource)
   */
  abstract handleWebhook(context: WebhookContext): Promise<any>;
}
```

### 2.2 Refactor VoiceResource (formerly CallsResource)

**File**: `src/resources/voice.resource.ts`

```typescript
import { BaseResource, ResourceSession, WebhookContext } from './base.resource';
import type { Agent } from '../agent/core/Agent';
import { logger } from '../utils/logger';

export interface VoiceSession extends ResourceSession {
  callSid: string;
  to: string;
  from?: string;
  direction: 'inbound' | 'outbound';
}

export interface MakeCallOptions {
  to: string;
  greeting?: string;
  metadata?: Record<string, any>;
}

export class VoiceResource extends BaseResource<VoiceSession> {
  constructor(agent: Agent) {
    super(agent, 'call');
  }

  /**
   * Make an outbound call
   * Uses Agent → initiate_call tool → Twilio provider
   */
  async make(options: MakeCallOptions): Promise<VoiceSession> {
    logger.info(`[VoiceResource] Initiating call to ${options.to}`);

    // Create conversation session
    const conversationId = await this.createSession(options.metadata);

    // Use Agent to make the call via tools
    const agentResponse = await this.processWithAgent(
      `Make a call to ${options.to} with greeting: ${options.greeting || 'Hello!'}`,
      {
        conversationId,
        toolHint: 'initiate_call', // Hint which tool to use
        toolParams: {
          to: options.to,
          greeting: options.greeting,
          webhookUrl: `${process.env.BASE_URL}/webhooks/voice/inbound`
        }
      }
    );

    // Extract call SID from tool result
    const callSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.callSid;

    return {
      id: callSid,
      callSid,
      conversationId,
      to: options.to,
      channel: 'call',
      direction: 'outbound',
      status: 'active',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming call webhook (Twilio)
   */
  async handleWebhook(context: WebhookContext): Promise<any> {
    logger.info('[VoiceResource] Handling inbound call webhook');

    const { CallSid, From, To, CallStatus } = context.payload;

    // Create or retrieve conversation
    let conversationId = await this.findConversationByCallSid(CallSid);
    if (!conversationId) {
      conversationId = await this.createSession({
        callSid: CallSid,
        from: From,
        to: To,
        direction: 'inbound'
      });
    }

    // Use Agent to handle the call
    const agentResponse = await this.processWithAgent(
      'Handle incoming call', // Agent will generate appropriate response
      {
        conversationId,
        callSid: CallSid,
        from: From,
        to: To,
        callStatus: CallStatus
      }
    );

    // Return TwiML for Twilio
    return this.generateTwiML(agentResponse.content);
  }

  /**
   * Continue an active call conversation
   * This maintains the session while AI uses tools in the background
   */
  async handleConversation(callSid: string, userSpeech: string): Promise<string> {
    const conversationId = await this.findConversationByCallSid(callSid);
    if (!conversationId) {
      throw new Error(`No conversation found for call ${callSid}`);
    }

    // Agent processes speech and can use tools (send email, SMS, etc.)
    const agentResponse = await this.processWithAgent(userSpeech, {
      conversationId,
      callSid
    });

    return agentResponse.content; // Return text for TTS
  }

  private async findConversationByCallSid(callSid: string): Promise<string | null> {
    // Query agent memory for conversation with this callSid
    const memory = await this.agent.getMemory().query({
      filters: {
        'sessionMetadata.callSid': callSid
      },
      limit: 1
    });

    return memory.results[0]?.sessionMetadata?.conversationId || null;
  }

  private generateTwiML(response: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${response}</Say>
  <Gather input="speech" action="/webhooks/voice/continue" method="POST">
    <Say>You can continue speaking...</Say>
  </Gather>
</Response>`;
  }
}
```

### 2.3 Refactor EmailResource with Webhook Support

**File**: `src/resources/email.resource.ts`

```typescript
import { BaseResource, ResourceSession, WebhookContext } from './base.resource';
import type { Agent } from '../agent/core/Agent';
import { logger } from '../utils/logger';

export interface EmailSession extends ResourceSession {
  messageId?: string;
  threadId?: string;
  to: string | string[];
  from?: string;
  subject?: string;
  direction: 'inbound' | 'outbound';
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
}

export interface InboundEmailPayload {
  id: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  receivedAt: string;
}

export class EmailResource extends BaseResource<EmailSession> {
  constructor(agent: Agent) {
    super(agent, 'email');
  }

  /**
   * Send an email
   * Uses Agent → send_email tool → Email provider
   */
  async send(options: SendEmailOptions): Promise<EmailSession> {
    logger.info(`[EmailResource] Sending email to ${options.to}`);

    // Create conversation session
    const conversationId = await this.createSession(options.metadata);

    // Use Agent to send email via tools
    const agentResponse = await this.processWithAgent(
      `Send email to ${options.to} with subject "${options.subject}"`,
      {
        conversationId,
        toolHint: 'send_email',
        toolParams: {
          to: options.to,
          subject: options.subject,
          body: options.body,
          html: options.html,
          attachments: options.attachments
        }
      }
    );

    // Extract message ID from tool result
    const messageId = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageId;

    return {
      id: messageId || `email-${Date.now()}`,
      messageId,
      conversationId,
      to: options.to,
      subject: options.subject,
      channel: 'email',
      direction: 'outbound',
      status: 'completed',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming email webhook (Resend/SendGrid)
   *
   * This implements the WEBHOOK-EMAIL-AUTOMATION-PLAN vision:
   * 1. Parse webhook payload
   * 2. Find or create conversation by analyzing email headers
   * 3. Store incoming email in agent memory as 'user' message
   * 4. Optionally trigger AI auto-reply
   */
  async handleWebhook(context: WebhookContext): Promise<{
    conversationId: string;
    emailId: string;
    autoReplied: boolean;
  }> {
    logger.info('[EmailResource] Handling inbound email webhook');

    // Parse provider-specific payload
    const parsed = this.parseWebhookPayload(context);

    // Find existing conversation or create new
    const conversationId = await this.findOrCreateConversation(parsed);

    // Store incoming email in memory as 'user' message
    await this.storeInboundEmail(parsed, conversationId);

    // Optionally trigger AI auto-reply
    const autoReplied = await this.triggerAutoReply(parsed, conversationId);

    return {
      conversationId,
      emailId: parsed.id,
      autoReplied
    };
  }

  /**
   * AI-powered email generation
   * Uses Agent to compose email based on prompt
   */
  async generate(options: {
    prompt: string;
    context?: string;
    tone?: string;
    metadata?: Record<string, any>;
  }): Promise<{ subject: string; body: string; html?: string }> {
    logger.info('[EmailResource] Generating email with AI');

    const conversationId = await this.createSession(options.metadata);

    const agentResponse = await this.processWithAgent(
      `Generate an email with this prompt: ${options.prompt}. Context: ${options.context || 'none'}. Tone: ${options.tone || 'professional'}`,
      {
        conversationId,
        mode: 'email-generation'
      }
    );

    // Parse email from agent response
    return this.parseGeneratedEmail(agentResponse.content);
  }

  /**
   * Reply to an existing email thread
   * Finds conversation and uses Agent to compose contextual reply
   */
  async reply(options: {
    inReplyTo: string; // Message ID
    prompt?: string;
    autoSend?: boolean;
  }): Promise<EmailSession> {
    logger.info(`[EmailResource] Replying to email ${options.inReplyTo}`);

    // Find conversation by message ID
    const conversationId = await this.findConversationByMessageId(options.inReplyTo);
    if (!conversationId) {
      throw new Error(`No conversation found for message ${options.inReplyTo}`);
    }

    // Use Agent to compose reply
    const agentResponse = await this.processWithAgent(
      options.prompt || 'Compose a professional reply to the previous email',
      {
        conversationId,
        toolHint: options.autoSend ? 'send_email' : undefined
      }
    );

    if (options.autoSend) {
      const messageId = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageId;
      return {
        id: messageId || `email-${Date.now()}`,
        messageId,
        conversationId,
        to: '', // Extract from conversation
        channel: 'email',
        direction: 'outbound',
        status: 'completed',
        startedAt: new Date()
      };
    }

    // Return draft
    const draft = this.parseGeneratedEmail(agentResponse.content);
    return {
      id: `draft-${Date.now()}`,
      conversationId,
      to: '', // Extract from conversation
      subject: draft.subject,
      channel: 'email',
      direction: 'outbound',
      status: 'inactive',
      startedAt: new Date(),
      metadata: { draft }
    };
  }

  // Private helper methods

  private parseWebhookPayload(context: WebhookContext): InboundEmailPayload {
    // Provider-specific parsing (Resend, SendGrid, etc.)
    switch (context.provider) {
      case 'resend':
        return {
          id: context.payload.id,
          from: context.payload.from,
          to: context.payload.to,
          subject: context.payload.subject,
          text: context.payload.text,
          html: context.payload.html,
          headers: context.payload.headers,
          receivedAt: context.payload.receivedAt
        };

      case 'sendgrid':
        return {
          id: context.payload.message_id || `sg-${Date.now()}`,
          from: context.payload.from,
          to: context.payload.to,
          subject: context.payload.subject,
          text: context.payload.text,
          html: context.payload.html,
          headers: this.parseSendGridHeaders(context.payload.headers),
          receivedAt: new Date().toISOString()
        };

      default:
        throw new Error(`Unknown email provider: ${context.provider}`);
    }
  }

  private async findOrCreateConversation(email: InboundEmailPayload): Promise<string> {
    // Method 1: Check In-Reply-To header
    if (email.headers?.['in-reply-to']) {
      const conversationId = await this.findConversationByMessageId(email.headers['in-reply-to']);
      if (conversationId) return conversationId;
    }

    // Method 2: Check References header (full thread)
    if (email.headers?.references) {
      const messageIds = email.headers.references.split(' ');
      for (const msgId of messageIds) {
        const conversationId = await this.findConversationByMessageId(msgId);
        if (conversationId) return conversationId;
      }
    }

    // Method 3: Check subject line (Re: prefix)
    if (email.subject.startsWith('Re:')) {
      const originalSubject = email.subject.replace(/^Re:\s*/, '');
      const conversationId = await this.findConversationBySubject(originalSubject, email.from);
      if (conversationId) return conversationId;
    }

    // Method 4: Check from/to participants
    const conversationId = await this.findConversationByParticipants(email.from, email.to);
    if (conversationId) return conversationId;

    // No match found - create new conversation
    return await this.createSession({
      messageId: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      direction: 'inbound'
    });
  }

  private async storeInboundEmail(email: InboundEmailPayload, conversationId: string): Promise<void> {
    await this.agent.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: email.text || email.html || '',
      timestamp: new Date(email.receivedAt),
      type: 'conversation',
      channel: 'email',
      role: 'user', // Incoming emails are from the user
      sessionMetadata: {
        conversationId,
        emailId: email.id,
        direction: 'inbound',
        from: email.from,
        to: email.to,
        subject: email.subject
      }
    });

    logger.info(`[EmailResource] Stored inbound email in conversation ${conversationId}`);
  }

  private async triggerAutoReply(
    email: InboundEmailPayload,
    conversationId: string
  ): Promise<boolean> {
    // Check if auto-reply is enabled (from config)
    const autoReplyEnabled = true; // TODO: Get from config

    if (!autoReplyEnabled) {
      return false;
    }

    logger.info(`[EmailResource] Triggering AI auto-reply for ${email.from}`);

    // Use Agent to compose and send reply
    await this.processWithAgent(
      `Respond to this customer email professionally`,
      {
        conversationId,
        toolHint: 'send_email',
        toolParams: {
          to: email.from,
          subject: `Re: ${email.subject}`,
          inReplyTo: email.id
        }
      }
    );

    return true;
  }

  private async findConversationByMessageId(messageId: string): Promise<string | null> {
    const memory = await this.agent.getMemory().query({
      filters: {
        'sessionMetadata.emailId': messageId
      },
      limit: 1
    });

    return memory.results[0]?.sessionMetadata?.conversationId || null;
  }

  private async findConversationBySubject(subject: string, from: string): Promise<string | null> {
    const memory = await this.agent.getMemory().query({
      filters: {
        'sessionMetadata.subject': subject,
        'sessionMetadata.from': from
      },
      limit: 1
    });

    return memory.results[0]?.sessionMetadata?.conversationId || null;
  }

  private async findConversationByParticipants(from: string, to: string | string[]): Promise<string | null> {
    const toArray = Array.isArray(to) ? to : [to];
    const memory = await this.agent.getMemory().query({
      filters: {
        'sessionMetadata.from': from,
        'sessionMetadata.to': { $in: toArray }
      },
      limit: 1
    });

    return memory.results[0]?.sessionMetadata?.conversationId || null;
  }

  private parseSendGridHeaders(headers: string): Record<string, string> {
    // Parse SendGrid's raw header string
    const parsed: Record<string, string> = {};
    const lines = headers.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        parsed[match[1].toLowerCase()] = match[2];
      }
    }
    return parsed;
  }

  private parseGeneratedEmail(content: string): { subject: string; body: string; html?: string } {
    // Parse AI-generated email (extract subject and body)
    // This is a simple implementation - could be enhanced
    const lines = content.split('\n');
    const subjectLine = lines.find(l => l.startsWith('Subject:'));
    const subject = subjectLine ? subjectLine.replace('Subject:', '').trim() : 'No Subject';
    const body = lines.filter(l => !l.startsWith('Subject:')).join('\n').trim();

    return { subject, body };
  }
}
```

### 2.4 Refactor SMSResource

**File**: `src/resources/sms.resource.ts`

```typescript
import { BaseResource, ResourceSession, WebhookContext } from './base.resource';
import type { Agent } from '../agent/core/Agent';
import { logger } from '../utils/logger';

export interface SMSSession extends ResourceSession {
  messageSid?: string;
  to: string;
  from?: string;
  direction: 'inbound' | 'outbound';
}

export interface SendSMSOptions {
  to: string;
  body: string;
  metadata?: Record<string, any>;
}

export class SMSResource extends BaseResource<SMSSession> {
  constructor(agent: Agent) {
    super(agent, 'sms');
  }

  /**
   * Send an SMS
   * Uses Agent → send_sms tool → Twilio provider
   */
  async send(options: SendSMSOptions): Promise<SMSSession> {
    logger.info(`[SMSResource] Sending SMS to ${options.to}`);

    const conversationId = await this.createSession(options.metadata);

    const agentResponse = await this.processWithAgent(
      `Send SMS to ${options.to}: ${options.body}`,
      {
        conversationId,
        toolHint: 'send_sms',
        toolParams: {
          to: options.to,
          message: options.body
        }
      }
    );

    const messageSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.messageSid;

    return {
      id: messageSid || `sms-${Date.now()}`,
      messageSid,
      conversationId,
      to: options.to,
      channel: 'sms',
      direction: 'outbound',
      status: 'completed',
      startedAt: new Date(),
      metadata: options.metadata
    };
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   */
  async handleWebhook(context: WebhookContext): Promise<any> {
    logger.info('[SMSResource] Handling inbound SMS webhook');

    const { MessageSid, From, To, Body } = context.payload;

    // Find or create conversation
    let conversationId = await this.findConversationByParticipants(From, To);
    if (!conversationId) {
      conversationId = await this.createSession({
        messageSid: MessageSid,
        from: From,
        to: To,
        direction: 'inbound'
      });
    }

    // Store incoming SMS
    await this.agent.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: Body,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'sms',
      role: 'user',
      sessionMetadata: {
        conversationId,
        messageSid: MessageSid,
        from: From,
        to: To
      }
    });

    // Use Agent to compose reply
    const agentResponse = await this.processWithAgent(Body, {
      conversationId,
      messageSid: MessageSid,
      from: From,
      to: To
    });

    // Return TwiML response
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${agentResponse.content}</Message>
</Response>`;
  }

  private async findConversationByParticipants(from: string, to: string): Promise<string | null> {
    const memory = await this.agent.getMemory().query({
      filters: {
        'sessionMetadata.from': from,
        'sessionMetadata.to': to
      },
      limit: 1
    });

    return memory.results[0]?.sessionMetadata?.conversationId || null;
  }
}
```

---

## Phase 3: Client Initialization Simplification 🎯

**Goal**: Clean up initialization to reflect new architecture

### 3.1 Update Client.ts

**File**: `src/client.ts`

```typescript
async initialize(): Promise<void> {
  if (this.initialized) {
    logger.warn('[AIReceptionist] Already initialized');
    return;
  }

  logger.info(`[AIReceptionist] Initializing agent: ${this.config.agent.identity.name}`);

  // 1. Initialize provider registry and register all providers
  this.providerRegistry = await initializeProviders(this.config);

  // 2. Create tool infrastructure (registry + store)
  const { toolRegistry, toolStore } = createToolInfrastructure();
  this.toolRegistry = toolRegistry;
  this.toolStore = toolStore;

  // 3. Create and initialize the Agent (Six-Pillar Architecture)
  const aiProvider = await getAIProvider(this.providerRegistry);

  this.agent = AgentBuilder.create()
    .withIdentity(this.config.agent.identity)
    .withPersonality(this.config.agent.personality || {})
    .withKnowledge(this.config.agent.knowledge || { domain: 'general' })
    .withGoals(this.config.agent.goals || { primary: 'Assist users effectively' })
    .withMemory(this.config.agent.memory || { contextWindow: 20 })
    .withAIProvider(aiProvider)
    .withToolRegistry(this.toolRegistry)
    .build();

  this.toolStore.setAgent(this.agent);
  await this.agent.initialize();

  // 4. Register all tools (tools call providers directly - NO processors)
  await registerAllTools(
    {
      config: this.config,
      agent: this.agent,
      providerRegistry: this.providerRegistry // Pass registry, not processors
    },
    this.toolRegistry
  );

  // 5. Initialize resources (session managers)
  const resources = initializeResources(this.agent);

  // Assign resources
  (this as any).voice = resources.voice;
  (this as any).email = resources.email;
  (this as any).sms = resources.sms;
  (this as any).text = resources.text;

  this.initialized = true;

  logger.info(`[AIReceptionist] Initialized successfully`);
  logger.info(`[AIReceptionist] - Registered providers: ${this.providerRegistry.list().join(', ')}`);
  logger.info(`[AIReceptionist] - Registered tools: ${this.toolRegistry.count()}`);
}
```

### 3.2 Update Resource Initialization

**File**: `src/resources/initialization.ts`

```typescript
import type { Agent } from '../agent/core/Agent';
import { VoiceResource } from './voice.resource';
import { EmailResource } from './email.resource';
import { SMSResource } from './sms.resource';
import { TextResource } from './text.resource';

export function initializeResources(agent: Agent) {
  return {
    voice: new VoiceResource(agent),
    email: new EmailResource(agent),
    sms: new SMSResource(agent),
    text: new TextResource(agent)
  };
}
```

---

## Phase 4: Webhook System Implementation 🔗

**Goal**: Implement webhook endpoints for inbound messages

### 4.1 Create Webhook Router

**New File**: `src/webhooks/webhook-router.ts`

```typescript
import type { AIReceptionist } from '../client';
import { logger } from '../utils/logger';

export class WebhookRouter {
  constructor(private client: AIReceptionist) {}

  /**
   * Handle incoming voice call webhook (Twilio)
   */
  async handleVoiceWebhook(payload: any): Promise<any> {
    try {
      return await this.client.voice!.handleWebhook({
        provider: 'twilio',
        payload,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[WebhookRouter] Voice webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming email webhook (Resend/SendGrid)
   */
  async handleEmailWebhook(provider: 'resend' | 'sendgrid', payload: any, signature?: string): Promise<any> {
    try {
      // Verify webhook signature
      if (signature) {
        await this.verifyWebhookSignature(provider, payload, signature);
      }

      return await this.client.email!.handleWebhook({
        provider,
        payload,
        signature,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[WebhookRouter] Email webhook error:', error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming SMS webhook (Twilio)
   */
  async handleSMSWebhook(payload: any): Promise<any> {
    try {
      return await this.client.sms!.handleWebhook({
        provider: 'twilio',
        payload,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('[WebhookRouter] SMS webhook error:', error as Error);
      throw error;
    }
  }

  private async verifyWebhookSignature(provider: string, payload: any, signature: string): Promise<void> {
    // Implement signature verification for each provider
    // Resend, SendGrid, etc.
    logger.debug(`[WebhookRouter] Verifying ${provider} webhook signature`);
  }
}
```

### 4.2 Add Webhook Methods to Client

**File**: `src/client.ts`

```typescript
export class AIReceptionist {
  // ... existing code ...

  /**
   * Get webhook router for handling inbound messages
   */
  public getWebhookRouter(): WebhookRouter {
    this.ensureInitialized();
    return new WebhookRouter(this);
  }
}
```

### 4.3 Example Express Integration

**New File**: `examples/webhook-server.ts`

```typescript
import express from 'express';
import { AIReceptionist } from '@loctelli/ai-receptionist';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio/SendGrid

// Initialize SDK
const aiReceptionist = new AIReceptionist({
  agent: {
    identity: {
      name: 'Alex',
      role: 'Customer Support Representative'
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
      resend: {
        apiKey: process.env.RESEND_API_KEY!,
        fromEmail: 'support@myapp.com'
      }
    }
  },
  tools: {
    defaults: ['calls', 'messaging', 'email', 'calendar']
  }
});

await aiReceptionist.initialize();
const webhookRouter = aiReceptionist.getWebhookRouter();

// Voice webhook (Twilio)
app.post('/webhooks/voice/inbound', async (req, res) => {
  try {
    const twiml = await webhookRouter.handleVoiceWebhook(req.body);
    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Voice webhook error:', error);
    res.status(500).send('Internal error');
  }
});

// Email webhook (Resend)
app.post('/webhooks/email/resend', async (req, res) => {
  try {
    const result = await webhookRouter.handleEmailWebhook(
      'resend',
      req.body,
      req.headers['x-resend-signature'] as string
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// SMS webhook (Twilio)
app.post('/webhooks/sms/inbound', async (req, res) => {
  try {
    const twiml = await webhookRouter.handleSMSWebhook(req.body);
    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('Internal error');
  }
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

---

## Phase 5: Email Provider Enhancements 📧

**Goal**: Add Resend support and enhance EmailRouter for webhook handling

### 5.1 Create Resend Provider

**New File**: `src/providers/email/resend.provider.ts`

```typescript
import type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
import { BaseProvider } from '../base.provider';
import { logger } from '../../utils/logger';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export class ResendProvider extends BaseProvider implements IEmailProvider {
  readonly name = 'resend';
  readonly type = 'email' as const;

  private client: any; // Resend client

  constructor(private config: ResendConfig) {
    super();
  }

  async initialize(): Promise<void> {
    const { Resend } = await import('resend');
    this.client = new Resend(this.config.apiKey);
    this.initialized = true;
    logger.info('[ResendProvider] Initialized');
  }

  async dispose(): Promise<void> {
    this.client = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Resend doesn't have a health check endpoint, so we just verify client exists
      return !!this.client;
    } catch {
      return false;
    }
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    this.ensureInitialized();

    try {
      const { data, error } = await this.client.emails.send({
        from: `${this.config.fromName || this.config.fromEmail} <${this.config.fromEmail}>`,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
        reply_to: params.replyTo,
        attachments: params.attachments
      });

      if (error) {
        logger.error('[ResendProvider] Send failed:', error as Error);
        return {
          success: false,
          error: error.message
        };
      }

      logger.info(`[ResendProvider] Email sent: ${data.id}`);
      return {
        success: true,
        messageId: data.id
      };
    } catch (error) {
      logger.error('[ResendProvider] Send failed:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getConfig(): ResendConfig {
    return this.config;
  }
}
```

### 5.2 Enhance EmailRouter with Webhook Handling

**File**: `src/providers/email/email-router.ts` (add methods)

```typescript
export class EmailRouter {
  // ... existing code ...

  /**
   * Handle incoming webhook from email provider
   * Automatically stores in conversation and triggers AI response
   */
  async handleInboundWebhook(payload: {
    provider: 'resend' | 'sendgrid';
    data: any;
  }): Promise<{
    conversationId: string;
    emailId: string;
    autoReplied: boolean;
  }> {
    const parsed = this.parseWebhookPayload(payload);
    const conversation = await this.findOrCreateConversation(parsed);
    await this.storeInboundEmail(parsed, conversation);
    const aiReply = await this.triggerAutoReply(parsed, conversation);

    return {
      conversationId: conversation.id,
      emailId: parsed.messageId,
      autoReplied: !!aiReply
    };
  }

  private parseWebhookPayload(payload: any): ParsedEmail {
    switch (payload.provider) {
      case 'resend':
        return {
          messageId: payload.data.id,
          from: payload.data.from,
          to: payload.data.to,
          subject: payload.data.subject,
          text: payload.data.text,
          html: payload.data.html,
          headers: payload.data.headers,
          receivedAt: payload.data.receivedAt
        };

      case 'sendgrid':
        return {
          messageId: payload.data.message_id,
          from: payload.data.from,
          to: payload.data.to,
          subject: payload.data.subject,
          text: payload.data.text,
          html: payload.data.html,
          headers: this.parseSendGridHeaders(payload.data.headers),
          receivedAt: new Date().toISOString()
        };

      default:
        throw new Error(`Unknown provider: ${payload.provider}`);
    }
  }

  // ... additional helper methods from EmailResource ...
}
```

---

## Phase 6: Testing & Documentation 📚

### 6.1 Update Tests

**Files to Update:**
- `tests/resources/*.test.ts`
- `tests/tools/*.test.ts`
- `tests/webhooks/*.test.ts` (new)

**Pattern:**
```typescript
describe('VoiceResource', () => {
  it('should make call via Agent and tools', async () => {
    // Arrange
    const mockAgent = createMockAgent();
    const voiceResource = new VoiceResource(mockAgent);

    // Act
    const call = await voiceResource.make({ to: '+1234567890' });

    // Assert
    expect(mockAgent.process).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'call',
        context: expect.objectContaining({
          toolHint: 'initiate_call'
        })
      })
    );
    expect(call.status).toBe('active');
  });
});
```

### 6.2 Update Documentation

**Files to Update:**
- `docs/architecture/index.md` - Update architecture diagram
- `docs/architecture/providers.md` - Remove processor references
- `docs/architecture/tools.md` - Add "tools call providers directly" section
- `README.md` - Update examples with new API

**Add New Docs:**
- `docs/webhooks/setup-guide.md` - How to configure webhooks
- `docs/webhooks/email-automation.md` - Email webhook automation guide
- `docs/resources/session-management.md` - How resources maintain sessions

---

## 📊 Migration Guide

### For Existing Users

#### Breaking Changes

1. **Resources renamed:**
   - `client.calls` → `client.voice`
   - Methods remain the same

2. **No direct processor access:**
   - Before: `client.callProcessor.initiateCall()`
   - After: `client.voice.make()` (uses Agent → Tools internally)

3. **Tool initialization:**
   - Tools now receive `ProviderRegistry` instead of processors
   - Custom tools may need updates

#### Migration Steps

```typescript
// Before (v1.x)
const client = new AIReceptionist({ ... });
await client.initialize();
await client.calls.make({ to: '+1234567890' });

// After (v2.x)
const client = new AIReceptionist({ ... });
await client.initialize();
await client.voice.make({ to: '+1234567890' }); // Same API, renamed resource
```

---

## ✅ Success Criteria

### Phase 1 Complete When:
- [ ] All processor files deleted
- [ ] All tools call providers directly via ProviderRegistry
- [ ] All tool tests pass

### Phase 2 Complete When:
- [ ] BaseResource created with `handleWebhook()` interface
- [ ] VoiceResource uses Agent.process() for all actions
- [ ] EmailResource uses Agent.process() and supports webhook handling
- [ ] SMSResource uses Agent.process() and supports webhook handling
- [ ] All resource tests pass

### Phase 3 Complete When:
- [ ] Client initialization simplified (no processor references)
- [ ] Resource initialization only requires Agent
- [ ] All integration tests pass

### Phase 4 Complete When:
- [ ] WebhookRouter implemented
- [ ] Webhook endpoints tested with real payloads
- [ ] Example webhook server documented

### Phase 5 Complete When:
- [ ] ResendProvider implemented
- [ ] EmailRouter handles inbound webhooks
- [ ] Email conversation matching works (In-Reply-To, References, etc.)
- [ ] Auto-reply tested end-to-end

### Phase 6 Complete When:
- [ ] All tests updated and passing
- [ ] Documentation reflects new architecture
- [ ] Migration guide published
- [ ] Examples updated

---

## 🚀 Implementation Timeline

### Week 1-2: Foundation
- Phase 1: Remove processors, tools call providers directly
- Phase 2: Refactor resources (BaseResource, VoiceResource, SMSResource)

### Week 3: Email & Webhooks
- Phase 2: Complete EmailResource with webhook support
- Phase 4: WebhookRouter implementation
- Phase 5: Resend provider and email automation

### Week 4: Polish & Testing
- Phase 3: Client initialization cleanup
- Phase 6: Testing, documentation, migration guide

---

## 📈 Expected Benefits

### Developer Experience
- **Simpler API**: Fewer layers to understand
- **Consistent Pattern**: All resources → Agent → Tools → Providers
- **Webhook-First**: Inbound communication built-in

### Architecture
- **Less Code**: Remove entire processor layer (~1000 lines)
- **Single Source of Truth**: Tools are the only execution path
- **Better Separation**: Resources manage sessions, tools execute actions

### Features
- **Email Automation**: Automatic inbound email handling with AI replies
- **Cross-Channel Tools**: Voice can send email, Email can make calls, etc.
- **Session Continuity**: Conversations maintained across channels

### Performance
- **Fewer Layers**: Faster execution (Resource → Agent → Tool → Provider)
- **Less Memory**: No redundant processor instances

---

## 🎯 Alignment with Vision

This refactor achieves the vision stated in `SDK_VISION.md`:

✅ **"One resource per communication channel, all sharing the same tool ecosystem"**
   → VoiceResource, EmailResource, SMSResource all use shared tools

✅ **"Tools are pre-configured and ready to use"**
   → Tools call providers directly, no processor layer

✅ **"Resources maintain their primary channel while using tools in the background"**
   → Resources are session managers with `handleWebhook()` for continuous conversations

✅ **"All cross-channel actions are executed via tool calls"**
   → Resources use Agent.process() which orchestrates tools

✅ **"Plug-and-play developer experience"**
   → Simplified initialization, webhook support built-in

---

## 📝 Notes & Considerations

### Security
- Webhook signature verification is critical (implement in Phase 4)
- Validate all inbound payloads before processing
- Rate limiting on webhook endpoints recommended

### Scalability
- Consider webhook queue system for high volume
- Agent memory may need pagination for long conversations
- Tool execution should be async with timeout handling

### Extensibility
- BaseResource pattern makes adding new channels easy
- Tool system already supports custom tools
- Provider system supports custom providers

### Backward Compatibility
- Major version bump required (v1.x → v2.x)
- Migration guide essential for existing users
- Consider deprecation warnings in v1.x before breaking changes

---

## 🤝 Contributing

This refactor is a significant architectural change. Please:

1. Review each phase before implementation
2. Update tests alongside code changes
3. Document breaking changes in CHANGELOG.md
4. Update examples for new patterns

---

**This refactor transforms the SDK from a fragmented system into a unified, tool-driven platform that achieves the full vision. Let's build it! 🚀**
