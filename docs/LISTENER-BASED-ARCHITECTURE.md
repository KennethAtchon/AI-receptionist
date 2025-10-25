# 🎧 Listener-Based Architecture - Revolutionary Paradigm Shift

## The Insight

**Original Vision**: Resources as "session managers" that you call methods on
**Revolutionary Idea**: Resources as "passive listeners" that automatically respond to triggers

This is a **fundamental paradigm shift** from imperative to declarative:

```typescript
// ❌ IMPERATIVE: You tell the SDK what to do
await client.voice.make({ to: '+1234567890' });
await client.email.send({ to: 'user@example.com', subject: 'Hello' });

// ✅ DECLARATIVE: You configure the SDK to listen and respond
client.voice.listen({ onInbound: handleCall, onOutbound: handleCall });
client.email.listen({ onInbound: handleEmail, onOutbound: handleEmail });

// Now just trigger events:
eventBus.emit('call:outbound', { to: '+1234567890' });
eventBus.emit('email:outbound', { to: 'user@example.com', subject: 'Hello' });
```

---

## 🏗️ New Architecture

### Resources as Event Listeners

```
┌────────────────────────────────────────────────────────────────┐
│                    AI Receptionist SDK                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Voice Listener  │  │  Email Listener  │  │ SMS Listener │ │
│  │                  │  │                  │  │              │ │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │ ┌──────────┐ │ │
│  │  │  Inbound   │  │  │  │  Inbound   │  │  │ │ Inbound  │ │ │
│  │  │  Handler   │  │  │  │  Handler   │  │  │ │ Handler  │ │ │
│  │  └────────────┘  │  │  └────────────┘  │  │ └──────────┘ │ │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │ ┌──────────┐ │ │
│  │  │  Outbound  │  │  │  │  Outbound  │  │  │ │ Outbound │ │ │
│  │  │  Handler   │  │  │  │  Handler   │  │  │ │ Handler  │ │ │
│  │  └────────────┘  │  │  └────────────┘  │  │ └──────────┘ │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│                        ┌────────▼────────┐                      │
│                        │  Event Router   │                      │
│                        │                 │                      │
│                        │  • Webhook      │                      │
│                        │  • Scheduled    │                      │
│                        │  • Manual       │                      │
│                        └────────┬────────┘                      │
│                                 │                               │
│                        ┌────────▼────────┐                      │
│                        │      Agent      │                      │
│                        │                 │                      │
│                        │  • process()    │                      │
│                        │  • tools        │                      │
│                        │  • memory       │                      │
│                        └────────┬────────┘                      │
│                                 │                               │
│                        ┌────────▼────────┐                      │
│                        │      Tools      │                      │
│                        │                 │                      │
│                        │  • send_email   │                      │
│                        │  • make_call    │                      │
│                        │  • send_sms     │                      │
│                        └────────┬────────┘                      │
│                                 │                               │
│                        ┌────────▼────────┐                      │
│                        │    Providers    │                      │
│                        └─────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Concept: Listeners Not Callers

### The Pattern

**Every resource is just a listener:**
- You configure it once with handlers
- It sits passively waiting for events
- Events come from webhooks, scheduled jobs, or manual triggers
- The handler automatically invokes the Agent with tools

### Voice Listener Example

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({ /* config */ });
await client.initialize();

// ✅ Configure listener once
client.voice.listen({
  // Inbound: Someone calls your Twilio number
  onInbound: async (call) => {
    console.log(`Incoming call from ${call.from}`);
    // Agent automatically handles it via tools
    // No code needed - it's handled!
  },

  // Outbound: You trigger a call
  onOutbound: async (trigger) => {
    console.log(`Making call to ${trigger.to}`);
    // Agent automatically uses make_call tool
    // Returns when call completes
  },

  // Optional: Custom business logic
  onComplete: async (call) => {
    console.log(`Call ${call.sid} completed`);
    await saveToDatabase(call);
  },

  onError: async (call, error) => {
    console.error(`Call ${call.sid} failed:`, error);
    await sendAlert(error);
  }
});

// Now it just listens. Incoming calls are handled automatically.
// Outbound calls are triggered via events:

client.events.emit('voice:outbound', {
  to: '+1234567890',
  context: { reason: 'follow-up call' }
});
```

### Email Listener Example

```typescript
// ✅ Configure listener once
client.email.listen({
  // Inbound: Someone emails your configured address
  onInbound: async (email) => {
    console.log(`Email from ${email.from}: ${email.subject}`);
    // Agent automatically:
    // 1. Finds or creates conversation
    // 2. Stores email in memory
    // 3. Composes AI reply
    // 4. Sends reply via send_email tool
  },

  // Outbound: You trigger an email
  onOutbound: async (trigger) => {
    console.log(`Sending email to ${trigger.to}`);
    // Agent uses send_email tool
  },

  // Optional: Intercept before auto-reply
  beforeReply: async (email, draftReply) => {
    // Check business hours
    if (!isBusinessHours()) {
      return {
        ...draftReply,
        body: `${draftReply.body}\n\nNote: This is an automated reply sent outside business hours.`
      };
    }
    return draftReply;
  },

  // Optional: Custom filtering
  shouldReply: async (email) => {
    // Don't auto-reply to newsletters
    if (email.headers['list-unsubscribe']) return false;
    // Don't auto-reply to no-reply addresses
    if (email.from.includes('no-reply')) return false;
    return true;
  }
});

// Trigger outbound email
client.events.emit('email:outbound', {
  to: 'customer@example.com',
  subject: 'Following up on your inquiry',
  context: { orderId: '12345' }
});
```

### SMS Listener Example

```typescript
// ✅ Configure listener once
client.sms.listen({
  onInbound: async (sms) => {
    console.log(`SMS from ${sms.from}: ${sms.body}`);
    // Agent auto-replies
  },

  onOutbound: async (trigger) => {
    console.log(`Sending SMS to ${trigger.to}`);
    // Agent uses send_sms tool
  },

  // Optional: Rate limiting
  shouldReply: async (sms) => {
    const count = await redis.get(`sms:${sms.from}:count`);
    if (count > 10) {
      console.log('Rate limit exceeded');
      return false;
    }
    return true;
  }
});
```

---

## 🚀 Implementation

### Phase 1: Event System Foundation

**New File**: `src/events/event-bus.ts`

```typescript
import { EventEmitter } from 'events';

export type ChannelEvent =
  | 'voice:inbound'
  | 'voice:outbound'
  | 'voice:complete'
  | 'voice:error'
  | 'email:inbound'
  | 'email:outbound'
  | 'email:complete'
  | 'email:error'
  | 'sms:inbound'
  | 'sms:outbound'
  | 'sms:complete'
  | 'sms:error';

export interface EventPayload {
  id: string;
  timestamp: Date;
  channel: string;
  type: 'inbound' | 'outbound';
  data: any;
}

export class EventBus extends EventEmitter {
  emit(event: ChannelEvent, payload: Partial<EventPayload>): boolean {
    const fullPayload: EventPayload = {
      id: payload.id || `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: payload.timestamp || new Date(),
      channel: event.split(':')[0],
      type: event.split(':')[1] as 'inbound' | 'outbound',
      data: payload.data || {}
    };

    return super.emit(event, fullPayload);
  }

  on(event: ChannelEvent, listener: (payload: EventPayload) => void | Promise<void>): this {
    return super.on(event, listener);
  }
}
```

### Phase 2: Listener Interface

**New File**: `src/resources/listener.interface.ts`

```typescript
import type { Agent } from '../agent/core/Agent';
import type { EventBus } from '../events/event-bus';

export interface InboundContext {
  id: string;
  from: string;
  to: string;
  timestamp: Date;
  payload: any;
  conversationId?: string;
}

export interface OutboundTrigger {
  to: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ListenerHandlers<TInbound, TOutbound> {
  onInbound?: (context: TInbound) => void | Promise<void>;
  onOutbound?: (trigger: TOutbound) => void | Promise<void>;
  onComplete?: (context: TInbound | TOutbound) => void | Promise<void>;
  onError?: (context: TInbound | TOutbound, error: Error) => void | Promise<void>;
}

export abstract class BaseListener<TInbound extends InboundContext, TOutbound extends OutboundTrigger> {
  constructor(
    protected agent: Agent,
    protected eventBus: EventBus,
    protected channel: string
  ) {}

  /**
   * Start listening for events on this channel
   */
  abstract listen(handlers?: ListenerHandlers<TInbound, TOutbound>): void;

  /**
   * Stop listening
   */
  abstract stop(): void;

  /**
   * Trigger outbound event programmatically
   */
  abstract trigger(params: TOutbound): Promise<void>;

  /**
   * Handle inbound event (webhook)
   */
  protected abstract handleInbound(context: TInbound): Promise<void>;

  /**
   * Handle outbound event (triggered)
   */
  protected abstract handleOutbound(trigger: TOutbound): Promise<void>;
}
```

### Phase 3: Voice Listener Implementation

**File**: `src/resources/voice.listener.ts`

```typescript
import { BaseListener, InboundContext, OutboundTrigger, ListenerHandlers } from './listener.interface';
import type { Agent } from '../agent/core/Agent';
import type { EventBus } from '../events/event-bus';
import { logger } from '../utils/logger';

export interface VoiceInboundContext extends InboundContext {
  callSid: string;
  callStatus: string;
  direction: 'inbound';
}

export interface VoiceOutboundTrigger extends OutboundTrigger {
  greeting?: string;
  webhookUrl?: string;
}

export class VoiceListener extends BaseListener<VoiceInboundContext, VoiceOutboundTrigger> {
  private handlers?: ListenerHandlers<VoiceInboundContext, VoiceOutboundTrigger>;
  private listening = false;

  constructor(agent: Agent, eventBus: EventBus) {
    super(agent, eventBus, 'voice');
  }

  /**
   * Start listening for voice events
   */
  listen(handlers?: ListenerHandlers<VoiceInboundContext, VoiceOutboundTrigger>): void {
    if (this.listening) {
      logger.warn('[VoiceListener] Already listening');
      return;
    }

    this.handlers = handlers;
    this.listening = true;

    // Listen for inbound calls (from webhooks)
    this.eventBus.on('voice:inbound', async (payload) => {
      await this.handleInbound(payload.data as VoiceInboundContext);
    });

    // Listen for outbound call triggers
    this.eventBus.on('voice:outbound', async (payload) => {
      await this.handleOutbound(payload.data as VoiceOutboundTrigger);
    });

    logger.info('[VoiceListener] Now listening for voice events');
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.eventBus.removeAllListeners('voice:inbound');
    this.eventBus.removeAllListeners('voice:outbound');
    this.listening = false;
    logger.info('[VoiceListener] Stopped listening');
  }

  /**
   * Trigger outbound call programmatically
   */
  async trigger(params: VoiceOutboundTrigger): Promise<void> {
    this.eventBus.emit('voice:outbound', {
      data: params
    });
  }

  /**
   * Handle incoming call (webhook)
   */
  protected async handleInbound(context: VoiceInboundContext): Promise<void> {
    logger.info(`[VoiceListener] Handling inbound call from ${context.from}`);

    try {
      // User hook (optional)
      if (this.handlers?.onInbound) {
        await this.handlers.onInbound(context);
      }

      // Find or create conversation
      const conversationId = await this.findOrCreateConversation(context);

      // Use Agent to handle the call
      const agentResponse = await this.agent.process({
        id: `voice-inbound-${context.callSid}`,
        input: 'Handle incoming call', // Agent generates greeting
        channel: 'call',
        context: {
          conversationId,
          callSid: context.callSid,
          from: context.from,
          to: context.to
        }
      });

      // Emit completion event
      this.eventBus.emit('voice:complete', {
        data: { ...context, response: agentResponse }
      });

      // User hook (optional)
      if (this.handlers?.onComplete) {
        await this.handlers.onComplete(context);
      }

    } catch (error) {
      logger.error('[VoiceListener] Error handling inbound call:', error as Error);

      this.eventBus.emit('voice:error', {
        data: { ...context, error }
      });

      if (this.handlers?.onError) {
        await this.handlers.onError(context, error as Error);
      }
    }
  }

  /**
   * Handle outbound call trigger
   */
  protected async handleOutbound(trigger: VoiceOutboundTrigger): Promise<void> {
    logger.info(`[VoiceListener] Triggering outbound call to ${trigger.to}`);

    try {
      // User hook (optional)
      if (this.handlers?.onOutbound) {
        await this.handlers.onOutbound(trigger);
      }

      // Create conversation
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await this.agent.getMemory().startSession({
        conversationId,
        channel: 'call',
        metadata: { ...trigger.metadata, direction: 'outbound' }
      });

      // Use Agent to make the call via initiate_call tool
      const agentResponse = await this.agent.process({
        id: `voice-outbound-${Date.now()}`,
        input: `Make a call to ${trigger.to} with greeting: ${trigger.greeting || 'Hello!'}`,
        channel: 'call',
        context: {
          conversationId,
          toolHint: 'initiate_call',
          toolParams: {
            to: trigger.to,
            greeting: trigger.greeting,
            webhookUrl: trigger.webhookUrl || `${process.env.BASE_URL}/webhooks/voice/inbound`
          }
        }
      });

      // Extract call SID from tool result
      const callSid = agentResponse.metadata?.toolResults?.[0]?.result?.data?.callSid;

      const context: VoiceInboundContext = {
        id: callSid,
        callSid,
        from: trigger.to, // Swapped for outbound
        to: trigger.to,
        timestamp: new Date(),
        payload: trigger,
        conversationId,
        callStatus: 'initiated',
        direction: 'inbound' // Will be updated by webhook
      };

      this.eventBus.emit('voice:complete', {
        data: { ...context, response: agentResponse }
      });

      if (this.handlers?.onComplete) {
        await this.handlers.onComplete(trigger);
      }

    } catch (error) {
      logger.error('[VoiceListener] Error triggering outbound call:', error as Error);

      this.eventBus.emit('voice:error', {
        data: { ...trigger, error }
      });

      if (this.handlers?.onError) {
        await this.handlers.onError(trigger, error as Error);
      }
    }
  }

  private async findOrCreateConversation(context: VoiceInboundContext): Promise<string> {
    // Check if conversation exists for this call
    const memory = await this.agent.getMemory().query({
      filters: {
        'sessionMetadata.callSid': context.callSid
      },
      limit: 1
    });

    if (memory.results.length > 0) {
      return memory.results[0].sessionMetadata!.conversationId!;
    }

    // Create new conversation
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await this.agent.getMemory().startSession({
      conversationId,
      channel: 'call',
      metadata: {
        callSid: context.callSid,
        from: context.from,
        to: context.to,
        direction: 'inbound'
      }
    });

    return conversationId;
  }
}
```

### Phase 4: Email Listener Implementation

**File**: `src/resources/email.listener.ts`

```typescript
import { BaseListener, InboundContext, OutboundTrigger, ListenerHandlers } from './listener.interface';
import type { Agent } from '../agent/core/Agent';
import type { EventBus } from '../events/event-bus';
import { logger } from '../utils/logger';

export interface EmailInboundContext extends InboundContext {
  messageId: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

export interface EmailOutboundTrigger extends OutboundTrigger {
  subject: string;
  body?: string;
  html?: string;
  attachments?: any[];
  inReplyTo?: string;
}

export interface EmailListenerHandlers extends ListenerHandlers<EmailInboundContext, EmailOutboundTrigger> {
  // Email-specific hooks
  beforeReply?: (email: EmailInboundContext, draftReply: any) => any | Promise<any>;
  shouldReply?: (email: EmailInboundContext) => boolean | Promise<boolean>;
}

export class EmailListener extends BaseListener<EmailInboundContext, EmailOutboundTrigger> {
  private handlers?: EmailListenerHandlers;
  private listening = false;

  constructor(agent: Agent, eventBus: EventBus) {
    super(agent, eventBus, 'email');
  }

  listen(handlers?: EmailListenerHandlers): void {
    if (this.listening) {
      logger.warn('[EmailListener] Already listening');
      return;
    }

    this.handlers = handlers;
    this.listening = true;

    this.eventBus.on('email:inbound', async (payload) => {
      await this.handleInbound(payload.data as EmailInboundContext);
    });

    this.eventBus.on('email:outbound', async (payload) => {
      await this.handleOutbound(payload.data as EmailOutboundTrigger);
    });

    logger.info('[EmailListener] Now listening for email events');
  }

  stop(): void {
    this.eventBus.removeAllListeners('email:inbound');
    this.eventBus.removeAllListeners('email:outbound');
    this.listening = false;
    logger.info('[EmailListener] Stopped listening');
  }

  async trigger(params: EmailOutboundTrigger): Promise<void> {
    this.eventBus.emit('email:outbound', {
      data: params
    });
  }

  protected async handleInbound(context: EmailInboundContext): Promise<void> {
    logger.info(`[EmailListener] Handling inbound email from ${context.from}`);

    try {
      // User hook (optional)
      if (this.handlers?.onInbound) {
        await this.handlers.onInbound(context);
      }

      // Find or create conversation
      const conversationId = await this.findOrCreateConversation(context);

      // Store incoming email in memory
      await this.storeInboundEmail(context, conversationId);

      // Check if we should auto-reply
      const shouldReply = this.handlers?.shouldReply
        ? await this.handlers.shouldReply(context)
        : true;

      if (!shouldReply) {
        logger.info('[EmailListener] Skipping auto-reply (shouldReply returned false)');
        return;
      }

      // Use Agent to compose reply
      const agentResponse = await this.agent.process({
        id: `email-reply-${context.messageId}`,
        input: context.text || context.html || '',
        channel: 'email',
        context: {
          conversationId,
          messageId: context.messageId,
          from: context.from,
          subject: context.subject,
          toolHint: 'send_email'
        }
      });

      // Optional: Intercept before sending
      let reply = agentResponse;
      if (this.handlers?.beforeReply) {
        reply = await this.handlers.beforeReply(context, agentResponse);
      }

      // Emit completion
      this.eventBus.emit('email:complete', {
        data: { ...context, reply }
      });

      if (this.handlers?.onComplete) {
        await this.handlers.onComplete(context);
      }

    } catch (error) {
      logger.error('[EmailListener] Error handling inbound email:', error as Error);

      this.eventBus.emit('email:error', {
        data: { ...context, error }
      });

      if (this.handlers?.onError) {
        await this.handlers.onError(context, error as Error);
      }
    }
  }

  protected async handleOutbound(trigger: EmailOutboundTrigger): Promise<void> {
    logger.info(`[EmailListener] Triggering outbound email to ${trigger.to}`);

    try {
      if (this.handlers?.onOutbound) {
        await this.handlers.onOutbound(trigger);
      }

      // Create or retrieve conversation
      const conversationId = trigger.inReplyTo
        ? await this.findConversationByMessageId(trigger.inReplyTo)
        : await this.createNewConversation(trigger);

      // Use Agent to send email via send_email tool
      const agentResponse = await this.agent.process({
        id: `email-outbound-${Date.now()}`,
        input: trigger.body || `Send email with subject: ${trigger.subject}`,
        channel: 'email',
        context: {
          conversationId,
          toolHint: 'send_email',
          toolParams: {
            to: trigger.to,
            subject: trigger.subject,
            body: trigger.body,
            html: trigger.html,
            attachments: trigger.attachments,
            inReplyTo: trigger.inReplyTo
          }
        }
      });

      this.eventBus.emit('email:complete', {
        data: { ...trigger, response: agentResponse }
      });

      if (this.handlers?.onComplete) {
        await this.handlers.onComplete(trigger);
      }

    } catch (error) {
      logger.error('[EmailListener] Error triggering outbound email:', error as Error);

      this.eventBus.emit('email:error', {
        data: { ...trigger, error }
      });

      if (this.handlers?.onError) {
        await this.handlers.onError(trigger, error as Error);
      }
    }
  }

  private async findOrCreateConversation(email: EmailInboundContext): Promise<string> {
    // Method 1: Check In-Reply-To header
    if (email.headers?.['in-reply-to']) {
      const conversationId = await this.findConversationByMessageId(email.headers['in-reply-to']);
      if (conversationId) return conversationId;
    }

    // Method 2: Check References header
    if (email.headers?.references) {
      const messageIds = email.headers.references.split(' ');
      for (const msgId of messageIds) {
        const conversationId = await this.findConversationByMessageId(msgId);
        if (conversationId) return conversationId;
      }
    }

    // Method 3: Check subject (Re: prefix)
    if (email.subject.startsWith('Re:')) {
      const originalSubject = email.subject.replace(/^Re:\s*/, '');
      const conversationId = await this.findConversationBySubject(originalSubject, email.from);
      if (conversationId) return conversationId;
    }

    // Method 4: Check participants
    const conversationId = await this.findConversationByParticipants(email.from, email.to);
    if (conversationId) return conversationId;

    // Create new conversation
    return await this.createNewConversation(email);
  }

  private async createNewConversation(context: EmailInboundContext | EmailOutboundTrigger): Promise<string> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await this.agent.getMemory().startSession({
      conversationId,
      channel: 'email',
      metadata: context
    });
    return conversationId;
  }

  private async storeInboundEmail(email: EmailInboundContext, conversationId: string): Promise<void> {
    await this.agent.getMemory().store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: email.text || email.html || '',
      timestamp: email.timestamp,
      type: 'conversation',
      channel: 'email',
      role: 'user',
      sessionMetadata: {
        conversationId,
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        subject: email.subject
      }
    });
  }

  private async findConversationByMessageId(messageId: string): Promise<string | null> {
    const memory = await this.agent.getMemory().query({
      filters: { 'sessionMetadata.messageId': messageId },
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

### Phase 5: Update Client API

**File**: `src/client.ts`

```typescript
export class AIReceptionist {
  // Listeners (NOT resources)
  public readonly voice!: VoiceListener;
  public readonly email!: EmailListener;
  public readonly sms!: SMSListener;
  public readonly text!: TextResource; // Text remains as-is (for now)

  // Event system
  public readonly events!: EventBus;

  async initialize(): Promise<void> {
    // ... existing initialization ...

    // Create event bus
    this.events = new EventBus();

    // Initialize listeners
    (this as any).voice = new VoiceListener(this.agent, this.events);
    (this as any).email = new EmailListener(this.agent, this.events);
    (this as any).sms = new SMSListener(this.agent, this.events);
    (this as any).text = new TextResource(this.agent); // Keep for backwards compat

    logger.info('[AIReceptionist] Event system initialized');
  }

  /**
   * Start listening on all configured channels
   */
  async listen(handlers?: {
    voice?: ListenerHandlers<VoiceInboundContext, VoiceOutboundTrigger>;
    email?: EmailListenerHandlers;
    sms?: ListenerHandlers<SMSInboundContext, SMSOutboundTrigger>;
  }): Promise<void> {
    if (handlers?.voice) this.voice.listen(handlers.voice);
    if (handlers?.email) this.email.listen(handlers.email);
    if (handlers?.sms) this.sms.listen(handlers.sms);

    logger.info('[AIReceptionist] All listeners active');
  }

  /**
   * Stop all listeners
   */
  async stopListening(): Promise<void> {
    this.voice.stop();
    this.email.stop();
    this.sms.stop();
    logger.info('[AIReceptionist] All listeners stopped');
  }
}
```

---

## 🎯 Usage Examples

### Complete Application Example

```typescript
import express from 'express';
import { AIReceptionist } from '@loctelli/ai-receptionist';

const app = express();
app.use(express.json());

// Initialize SDK
const client = new AIReceptionist({
  agent: {
    identity: { name: 'Alex', role: 'Customer Support' }
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
  }
});

await client.initialize();

// ✅ Configure listeners ONCE
await client.listen({
  voice: {
    onInbound: (call) => {
      console.log(`📞 Call from ${call.from}`);
    },
    onComplete: async (call) => {
      console.log(`✅ Call completed: ${call.callSid}`);
      await db.calls.create(call);
    }
  },

  email: {
    onInbound: (email) => {
      console.log(`📧 Email from ${email.from}: ${email.subject}`);
    },
    beforeReply: async (email, draft) => {
      // Custom logic before sending AI reply
      if (!isBusinessHours()) {
        return {
          ...draft,
          body: `${draft.body}\n\n(Auto-reply sent outside business hours)`
        };
      }
      return draft;
    },
    shouldReply: async (email) => {
      // Don't auto-reply to newsletters
      return !email.headers?.['list-unsubscribe'];
    }
  },

  sms: {
    onInbound: (sms) => {
      console.log(`💬 SMS from ${sms.from}: ${sms.body}`);
    }
  }
});

// ✅ Webhook endpoints just emit events
app.post('/webhooks/voice', (req, res) => {
  client.events.emit('voice:inbound', {
    data: {
      id: req.body.CallSid,
      callSid: req.body.CallSid,
      from: req.body.From,
      to: req.body.To,
      timestamp: new Date(),
      payload: req.body,
      callStatus: req.body.CallStatus,
      direction: 'inbound'
    }
  });
  res.send('OK');
});

app.post('/webhooks/email', (req, res) => {
  client.events.emit('email:inbound', {
    data: {
      id: req.body.id,
      messageId: req.body.id,
      from: req.body.from,
      to: req.body.to,
      subject: req.body.subject,
      text: req.body.text,
      html: req.body.html,
      timestamp: new Date(req.body.receivedAt),
      payload: req.body,
      headers: req.body.headers
    }
  });
  res.json({ success: true });
});

app.post('/webhooks/sms', (req, res) => {
  client.events.emit('sms:inbound', {
    data: {
      id: req.body.MessageSid,
      messageSid: req.body.MessageSid,
      from: req.body.From,
      to: req.body.To,
      body: req.body.Body,
      timestamp: new Date(),
      payload: req.body
    }
  });
  res.send('OK');
});

// ✅ Trigger outbound events programmatically
app.post('/api/send-email', async (req, res) => {
  await client.email.trigger({
    to: req.body.to,
    subject: req.body.subject,
    body: req.body.body,
    context: { userId: req.body.userId }
  });
  res.json({ success: true });
});

app.post('/api/make-call', async (req, res) => {
  await client.voice.trigger({
    to: req.body.to,
    greeting: req.body.greeting,
    context: { campaignId: req.body.campaignId }
  });
  res.json({ success: true });
});

app.listen(3000);
```

### Scheduled Email Campaigns

```typescript
import cron from 'node-cron';

// Send daily summary email at 9am
cron.schedule('0 9 * * *', async () => {
  const users = await db.users.findAll({ subscribed: true });

  for (const user of users) {
    await client.email.trigger({
      to: user.email,
      subject: 'Your Daily Summary',
      context: {
        userId: user.id,
        summaryDate: new Date().toISOString()
      }
    });
  }
});
```

### Event-Driven Workflow

```typescript
// Listen for email completions and trigger follow-up SMS
client.events.on('email:complete', async (payload) => {
  const email = payload.data;

  // If customer hasn't responded in 2 hours, send SMS
  setTimeout(async () => {
    const conversation = await client.agent.getMemory().query({
      filters: { 'sessionMetadata.conversationId': email.conversationId }
    });

    const lastMessage = conversation.results[0];
    if (lastMessage?.role === 'assistant') {
      // We sent last message, customer hasn't responded
      await client.sms.trigger({
        to: email.from,
        context: {
          conversationId: email.conversationId,
          reason: 'email-follow-up'
        }
      });
    }
  }, 2 * 60 * 60 * 1000); // 2 hours
});
```

---

## 🚀 Benefits of Listener Architecture

### 1. **Simpler Mental Model**
- Configure once, run forever
- No imperative "make this call" code
- Just emit events and listeners handle it

### 2. **Separation of Concerns**
- Webhooks → Events
- Events → Listeners
- Listeners → Agent → Tools
- Clean boundaries

### 3. **Easier Testing**
```typescript
// Test by emitting events, no HTTP needed
client.events.emit('email:inbound', { data: mockEmail });
expect(mockHandler).toHaveBeenCalled();
```

### 4. **Flexible Integrations**
- Webhooks → Events
- Cron jobs → Events
- User actions → Events
- External systems → Events

### 5. **Built-in Observability**
```typescript
// Monitor all channels
client.events.on('*', (payload) => {
  analytics.track(payload);
});
```

---

## 🔄 Migration from Resource Pattern

### Before (Resource Pattern)
```typescript
await client.voice.make({ to: '+1234567890' });
await client.email.send({ to: 'user@example.com', subject: 'Hi' });
```

### After (Listener Pattern)
```typescript
// Configure once
client.listen({
  voice: { onInbound: handleCall },
  email: { onInbound: handleEmail }
});

// Trigger programmatically
await client.voice.trigger({ to: '+1234567890' });
await client.email.trigger({ to: 'user@example.com', subject: 'Hi' });

// Or emit events
client.events.emit('voice:outbound', { data: { to: '+1234567890' } });
client.events.emit('email:outbound', { data: { to: 'user@example.com', subject: 'Hi' } });
```

---

## ✅ Implementation Checklist

- [ ] Create EventBus system
- [ ] Create BaseListener interface
- [ ] Implement VoiceListener
- [ ] Implement EmailListener
- [ ] Implement SMSListener
- [ ] Update Client.ts with event system
- [ ] Add `client.listen()` method
- [ ] Update webhook examples to emit events
- [ ] Write tests for listener pattern
- [ ] Update documentation
- [ ] Create migration guide

---

## 🎯 Conclusion

**This is the cleanest possible architecture:**

1. **Webhooks** → Emit events
2. **Events** → Trigger listeners
3. **Listeners** → Use Agent
4. **Agent** → Orchestrates tools
5. **Tools** → Call providers

**No imperative resource methods. Just pure event-driven automation.** 🚀
