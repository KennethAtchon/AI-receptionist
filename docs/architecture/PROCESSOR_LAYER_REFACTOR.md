# Processor Layer Refactor: AI-Driven Provider Orchestration

> **Goal**: Refactor the architecture so that providers are PURE API wrappers, and introduce a "Processor" layer that uses AI to orchestrate API calls. The processor acts as an intelligent bridge between services and providers.

**Version**: 1.0  
**Date**: October 2025  
**Status**: Design Document

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Problems](#current-architecture-problems)
3. [Target Architecture](#target-architecture)
4. [The Processor Layer](#the-processor-layer)
5. [Refactoring Providers to PURE Wrappers](#refactoring-providers-to-pure-wrappers)
6. [Service Layer Changes](#service-layer-changes)
7. [Data Flow Comparison](#data-flow-comparison)
8. [Detailed Component Changes](#detailed-component-changes)
9. [Implementation Phases](#implementation-phases)
10. [Breaking Changes](#breaking-changes)
11. [Testing Strategy](#testing-strategy)
12. [Examples](#examples)

---

## Executive Summary

### The Problem

Currently, the SDK has a mixed architecture where:
- **AI Providers** (OpenAI, OpenRouter) are PURE wrappers ✅
- **Other Providers** (Twilio, Google) contain some business logic ❌
- **Services** directly orchestrate provider calls with hardcoded logic ❌
- **No AI-driven decision making** for API orchestration ❌

### The Solution

Introduce a **Processor Layer** that:
1. **Makes all providers PURE** - They only wrap external APIs, no business logic
2. **Uses AI to make decisions** - The processor consults AI to decide what to do
3. **Orchestrates API calls** - The processor executes the appropriate provider methods
4. **Bridges services and providers** - Services call processors, processors call providers

### Key Benefits

- **Intelligent orchestration**: AI decides which APIs to call and when
- **Cleaner separation**: Providers are purely infrastructure, processors are purely orchestration
- **Flexibility**: Easy to add new providers or change orchestration logic
- **Testability**: Mock processors independently from providers
- **Consistency**: All providers follow the same PURE wrapper pattern

---

## Current Architecture Problems

### Problem 1: Mixed Responsibilities in Providers

```typescript
// Current GoogleProvider (BAD - has business logic)
export class GoogleProvider extends BaseProvider {
  // ❌ This is business logic, not just an API wrapper
  async getAvailableSlots(params: {
    calendarId: string;
    date: Date;
    duration: number;
  }): Promise<string[]> {
    // Complex logic to compute slots from Google Calendar API
    // This belongs in a service or processor, not the provider
  }
  
  async createEvent(event: GoogleEvent): Promise<string> {
    // ✅ This is fine - just wraps the API
  }
}
```

### Problem 2: Hardcoded Orchestration in Services

```typescript
// Current CallService (BAD - hardcoded orchestration)
export class CallService {
  async handleUserSpeech(callSid: string, userSpeech: string): Promise<string> {
    // 1. Get conversation
    const conversation = await this.conversationService.getByCallId(callSid);
    
    // 2. Add user message
    await this.conversationService.addMessage(conversation.id, {...});
    
    // 3. Get AI response
    const aiResponse = await this.aiProvider.chat({...});
    
    // 4. If AI wants tools, execute them ❌ Hardcoded logic!
    if (aiResponse.toolCalls) {
      for (const toolCall of aiResponse.toolCalls) {
        await this.toolExecutor.execute(...);
      }
      // Call AI again ❌ More hardcoded logic!
      const finalResponse = await this.aiProvider.chat({...});
    }
    
    return aiResponse.content;
  }
}
```

**Problems:**
- The service hardcodes the orchestration flow
- No AI involvement in deciding what to do
- Difficult to change the flow without modifying service code

### Problem 3: No AI-Driven Decision Making

Currently, the AI is only used to generate text responses and tool calls. The **orchestration** of those tool calls is hardcoded. We want the AI to be involved in deciding:
- Which APIs to call
- In what order
- How to handle errors and retries
- When to stop or continue

---

## Target Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER APPLICATION                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RESOURCE LAYER (Public API)                    │
│    CallsResource │ SMSResource │ EmailResource │ TextResource    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               SERVICE LAYER (Domain Orchestration)               │
│   CallService │ CalendarService │ MessagingService               │
│   - High-level business logic                                    │
│   - Delegates to processors for orchestration                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           PROCESSOR LAYER ★ NEW ★ (AI-Driven Orchestration)     │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  CallProcessor  │  │ CalendarProc... │  │ MessagingProc...│ │
│  │                 │  │                 │  │                 │ │
│  │ Uses AI to:     │  │ Uses AI to:     │  │ Uses AI to:     │ │
│  │ - Decide when   │  │ - Find slots    │  │ - Choose        │ │
│  │   to use tools  │  │ - Handle        │  │   template      │ │
│  │ - Handle errors │  │   conflicts     │  │ - Handle opt-out│ │
│  │ - Retry logic   │  │ - Book smartly  │  │ - Format msgs   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                   │
│        Each processor:                                            │
│        1. Receives request from service                           │
│        2. Consults AI for decision-making                         │
│        3. Executes provider methods based on AI guidance          │
│        4. Returns results to service                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 AGENT LAYER (Intelligence)                       │
│                      Agent (6 Pillars)                            │
│   - Identity │ Personality │ Knowledge │ Capability │ Memory     │
│   - Goals                                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          PROVIDER LAYER (PURE API Wrappers)                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ AI Providers (Already PURE ✅)                              │ │
│  │  OpenAIProvider │ OpenRouterProvider                        │ │
│  │  - chat()       │ - chat()                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Communication Providers (Make PURE)                         │ │
│  │  TwilioProvider                                             │ │
│  │  - makeCall()     ← Pure wrapper only                       │ │
│  │  - sendSMS()      ← Pure wrapper only                       │ │
│  │  - endCall()      ← Pure wrapper only                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Calendar Providers (Make PURE)                              │ │
│  │  GoogleProvider                                             │ │
│  │  - listFreeBusy()  ← Pure wrapper only                     │ │
│  │  - createEvent()   ← Pure wrapper only                     │ │
│  │  - updateEvent()   ← Pure wrapper only                     │ │
│  │  - deleteEvent()   ← Pure wrapper only                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Differences from Current Architecture

| Aspect | Current | Target |
|--------|---------|--------|
| **Provider Responsibility** | Mixed (API + some logic) | PURE (API only) |
| **Orchestration Location** | Services (hardcoded) | Processors (AI-driven) |
| **AI Usage** | Text generation + tool suggestions | Decision-making + orchestration |
| **Service Complexity** | High (handles orchestration) | Low (delegates to processors) |
| **Flexibility** | Low (change requires code edits) | High (AI adapts behavior) |

---

## The Processor Layer

### What is a Processor?

A **Processor** is an AI-driven orchestrator that:
1. Receives a high-level request from a service (e.g., "book this appointment")
2. Consults the AI to decide HOW to fulfill the request
3. Executes the appropriate provider methods in the right order
4. Handles errors, retries, and edge cases using AI guidance
5. Returns the result to the service

### Processor Responsibilities

✅ **Processors SHOULD:**
- Use AI to make orchestration decisions
- Call provider methods to interact with external APIs
- Handle multi-step workflows (e.g., check availability → book → send confirmation)
- Retry failed operations based on AI guidance
- Format requests/responses between service and provider layers
- Log orchestration steps for observability

❌ **Processors SHOULD NOT:**
- Contain domain business rules (those belong in services)
- Directly call external APIs (use providers instead)
- Store state (use services for that)
- Implement UI/UX logic (that's for resources)

### Base Processor Interface

```typescript
// src/processors/base.processor.ts
export interface IProcessor {
  readonly name: string;
  readonly type: 'call' | 'calendar' | 'messaging' | 'custom';
}

export abstract class BaseProcessor implements IProcessor {
  abstract readonly name: string;
  abstract readonly type: 'call' | 'calendar' | 'messaging' | 'custom';

  constructor(
    protected aiProvider: IAIProvider,
    protected logger: Logger
  ) {}

  /**
   * Ask AI for guidance on how to proceed
   */
  protected async consultAI(params: {
    context: string;
    options: string[];
    history?: string[];
  }): Promise<AIResponse> {
    return this.aiProvider.chat({
      conversationId: `processor-${this.name}-${Date.now()}`,
      userMessage: params.context,
      systemPrompt: this.buildSystemPrompt(params.options),
      conversationHistory: params.history?.map(h => ({
        role: 'user',
        content: h,
        timestamp: new Date()
      }))
    });
  }

  /**
   * Build system prompt for AI guidance
   */
  protected abstract buildSystemPrompt(options: string[]): string;
}
```

### Processor Types

#### 1. CallProcessor

**Purpose**: Orchestrate voice call interactions using AI

```typescript
// src/processors/call.processor.ts
export class CallProcessor extends BaseProcessor {
  readonly name = 'call';
  readonly type = 'call' as const;

  constructor(
    aiProvider: IAIProvider,
    private communicationProvider: ICommunicationProvider,
    private toolExecutor: ToolExecutionService,
    logger: Logger
  ) {
    super(aiProvider, logger);
  }

  /**
   * Process user speech during a call
   * AI decides what to do (respond, use tools, end call, etc.)
   */
  async processUserSpeech(params: {
    callSid: string;
    userSpeech: string;
    conversationHistory: Message[];
    availableTools: ITool[];
  }): Promise<ProcessorResponse> {
    this.logger.info(`[CallProcessor] Processing speech for call ${params.callSid}`);

    // 1. Ask AI what to do
    const aiResponse = await this.consultAI({
      context: params.userSpeech,
      options: ['respond', 'use_tools', 'transfer_call', 'end_call'],
      history: params.conversationHistory.map(m => m.content)
    });

    // 2. If AI wants to use tools, execute them
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const toolResults = await this.executeTools(
        aiResponse.toolCalls,
        params.callSid,
        params.conversationHistory
      );

      // 3. Ask AI again with tool results to get final response
      const finalResponse = await this.consultAI({
        context: `Tool results: ${JSON.stringify(toolResults)}. What should I say?`,
        options: ['respond_with_results', 'use_more_tools', 'end_call'],
        history: [...params.conversationHistory.map(m => m.content), aiResponse.content]
      });

      return {
        content: finalResponse.content,
        action: 'respond',
        metadata: {
          toolsUsed: aiResponse.toolCalls.map(tc => tc.name),
          toolResults
        }
      };
    }

    // 4. No tools needed, just respond
    return {
      content: aiResponse.content,
      action: 'respond'
    };
  }

  /**
   * Execute tools with AI guidance on error handling
   */
  private async executeTools(
    toolCalls: ToolCall[],
    callSid: string,
    conversationHistory: Message[]
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.toolExecutor.execute(
          toolCall.name,
          toolCall.parameters,
          {
            channel: 'call',
            conversationId: callSid,
            callSid
          }
        );
        results.push(result);
      } catch (error) {
        // Ask AI how to handle the error
        const errorGuidance = await this.consultAI({
          context: `Tool ${toolCall.name} failed with error: ${error.message}. What should I do?`,
          options: ['retry', 'skip', 'use_alternative', 'inform_user'],
          history: conversationHistory.map(m => m.content)
        });

        this.logger.warn(`[CallProcessor] Tool ${toolCall.name} failed, AI suggests: ${errorGuidance.content}`);

        // Handle based on AI guidance
        if (errorGuidance.content.includes('retry')) {
          // Retry once
          const retryResult = await this.toolExecutor.execute(
            toolCall.name,
            toolCall.parameters,
            { channel: 'call', conversationId: callSid, callSid }
          ).catch(e => ({
            success: false,
            error: e.message,
            response: { speak: 'I encountered an error and could not complete that action.' }
          }));
          results.push(retryResult);
        } else {
          // Add error result
          results.push({
            success: false,
            error: error.message,
            response: { speak: errorGuidance.content }
          });
        }
      }
    }

    return results;
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI assistant helping to orchestrate a phone call.
Available actions: ${options.join(', ')}
Choose the most appropriate action and provide a response.`;
  }
}

export interface ProcessorResponse {
  content: string;
  action: 'respond' | 'transfer' | 'end_call' | 'escalate';
  metadata?: Record<string, any>;
}
```

#### 2. CalendarProcessor

**Purpose**: Orchestrate calendar operations (availability, booking) using AI

```typescript
// src/processors/calendar.processor.ts
export class CalendarProcessor extends BaseProcessor {
  readonly name = 'calendar';
  readonly type = 'calendar' as const;

  constructor(
    aiProvider: IAIProvider,
    private calendarProvider: ICalendarProvider,
    logger: Logger
  ) {
    super(aiProvider, logger);
  }

  /**
   * Find and book available slot using AI guidance
   */
  async findAndBook(params: {
    calendarId: string;
    preferredDates: Date[];
    duration: number;
    attendees?: string[];
    userPreferences?: string; // e.g., "prefer mornings"
  }): Promise<BookingResult> {
    this.logger.info(`[CalendarProcessor] Finding slot for ${params.duration}min meeting`);

    // 1. Get free/busy information from provider
    const busySlots = await this.calendarProvider.listFreeBusy({
      calendarId: params.calendarId,
      timeMin: params.preferredDates[0],
      timeMax: new Date(params.preferredDates[params.preferredDates.length - 1].getTime() + 7 * 24 * 60 * 60 * 1000)
    });

    // 2. Ask AI to pick the best slot based on preferences
    const slotGuidance = await this.consultAI({
      context: `Find best ${params.duration}min slot. User prefers: ${params.userPreferences || 'any time'}. 
Busy periods: ${JSON.stringify(busySlots)}
Available dates: ${params.preferredDates.map(d => d.toISOString()).join(', ')}`,
      options: ['suggest_slot', 'request_more_info', 'no_availability']
    });

    // 3. Parse AI's slot suggestion
    const suggestedSlot = this.parseSlotFromAI(slotGuidance.content);

    if (!suggestedSlot) {
      return {
        success: false,
        error: 'No suitable slot found',
        suggestion: slotGuidance.content
      };
    }

    // 4. Check if slot is truly available
    const isAvailable = await this.verifySlotAvailability(
      suggestedSlot.start,
      suggestedSlot.end,
      busySlots
    );

    if (!isAvailable) {
      // Ask AI for alternative
      const alternative = await this.consultAI({
        context: `Suggested slot ${suggestedSlot.start.toISOString()} is not available. Find alternative.`,
        options: ['suggest_alternative', 'no_availability'],
        history: [slotGuidance.content]
      });
      // Recursively try again (with limit)
      return { success: false, error: 'Slot not available', suggestion: alternative.content };
    }

    // 5. Book the slot
    try {
      const eventId = await this.calendarProvider.createEvent({
        calendarId: params.calendarId,
        summary: 'Meeting',
        start: suggestedSlot.start,
        end: suggestedSlot.end,
        attendees: params.attendees?.map(email => ({ email }))
      });

      return {
        success: true,
        eventId: eventId.id,
        slot: suggestedSlot,
        message: `Booked ${params.duration}min meeting at ${suggestedSlot.start.toISOString()}`
      };
    } catch (error) {
      // Ask AI how to handle booking error
      const errorGuidance = await this.consultAI({
        context: `Booking failed: ${error.message}. What should I do?`,
        options: ['retry_different_slot', 'inform_user', 'escalate']
      });

      return {
        success: false,
        error: error.message,
        suggestion: errorGuidance.content
      };
    }
  }

  /**
   * Parse AI's response to extract a time slot
   */
  private parseSlotFromAI(aiResponse: string): { start: Date; end: Date } | null {
    // Use regex or JSON parsing to extract slot from AI response
    // This is a simplified example
    const match = aiResponse.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (match) {
      const start = new Date(match[1]);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      return { start, end };
    }
    return null;
  }

  /**
   * Verify slot is available
   */
  private async verifySlotAvailability(
    start: Date,
    end: Date,
    busySlots: Array<{ start: Date; end: Date }>
  ): Promise<boolean> {
    return !busySlots.some(busy =>
      (start >= busy.start && start < busy.end) ||
      (end > busy.start && end <= busy.end) ||
      (start <= busy.start && end >= busy.end)
    );
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI calendar assistant. Help find the best meeting slot.
Consider user preferences, time zones, and availability.
Available actions: ${options.join(', ')}
Always respond with a specific date/time in ISO format when suggesting slots.`;
  }
}

export interface BookingResult {
  success: boolean;
  eventId?: string;
  slot?: { start: Date; end: Date };
  error?: string;
  message?: string;
  suggestion?: string;
}
```

#### 3. MessagingProcessor

**Purpose**: Orchestrate SMS/email messaging with templates, compliance, AI-driven content

```typescript
// src/processors/messaging.processor.ts
export class MessagingProcessor extends BaseProcessor {
  readonly name = 'messaging';
  readonly type = 'messaging' as const;

  constructor(
    aiProvider: IAIProvider,
    private communicationProvider: ICommunicationProvider,
    logger: Logger
  ) {
    super(aiProvider, logger);
  }

  /**
   * Send message with AI-driven template selection and customization
   */
  async sendMessage(params: {
    to: string;
    context: string; // e.g., "appointment reminder", "follow-up"
    variables?: Record<string, string>;
    channel: 'sms' | 'email';
  }): Promise<MessagingResult> {
    this.logger.info(`[MessagingProcessor] Sending ${params.channel} to ${params.to}`);

    // 1. Ask AI to generate appropriate message
    const messageContent = await this.consultAI({
      context: `Generate ${params.channel} message for: ${params.context}
Variables: ${JSON.stringify(params.variables || {})}
Keep it concise and professional.`,
      options: ['send_message', 'skip_message', 'schedule_later']
    });

    // 2. Check compliance (opt-out, rate limits, etc.)
    const canSend = await this.checkCompliance(params.to, params.channel);
    if (!canSend) {
      return {
        success: false,
        error: 'Compliance check failed (user opted out or rate limited)'
      };
    }

    // 3. Send via provider
    try {
      let messageId: string;
      if (params.channel === 'sms') {
        messageId = await this.communicationProvider.sendSMS(
          params.to,
          messageContent.content
        );
      } else {
        // Email sending would go here
        throw new Error('Email not implemented yet');
      }

      return {
        success: true,
        messageId,
        content: messageContent.content
      };
    } catch (error) {
      // Ask AI how to handle error
      const errorGuidance = await this.consultAI({
        context: `Message sending failed: ${error.message}. What should I do?`,
        options: ['retry', 'try_different_channel', 'skip', 'escalate']
      });

      return {
        success: false,
        error: error.message,
        suggestion: errorGuidance.content
      };
    }
  }

  /**
   * Check compliance rules (opt-out, rate limits, etc.)
   */
  private async checkCompliance(to: string, channel: string): Promise<boolean> {
    // Check opt-out list, rate limits, time of day, etc.
    // This would typically query a database or compliance service
    return true; // Simplified
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI messaging assistant. Generate appropriate messages for different contexts.
Keep messages concise, professional, and compliant.
Available actions: ${options.join(', ')}`;
  }
}

export interface MessagingResult {
  success: boolean;
  messageId?: string;
  content?: string;
  error?: string;
  suggestion?: string;
}
```

---

## Refactoring Providers to PURE Wrappers

All providers must become PURE API wrappers with NO business logic.

### Current vs. Target Provider Comparison

#### TwilioProvider

**Current** (mostly good, but used directly by services):
```typescript
export class TwilioProvider extends BaseProvider {
  async makeCall(to: string, options: CallOptions): Promise<string> {
    // ✅ Pure wrapper - just calls Twilio API
    const call = await this.client.calls.create({
      to,
      from: this.config.phoneNumber,
      url: options.webhookUrl
    });
    return call.sid;
  }

  async sendSMS(to: string, body: string): Promise<string> {
    // ✅ Pure wrapper - just calls Twilio API
    const message = await this.client.messages.create({
      to,
      from: this.config.phoneNumber,
      body
    });
    return message.sid;
  }
}
```

**Target** (same but ensure interface consistency):
```typescript
export class TwilioProvider extends BaseProvider implements ICommunicationProvider {
  readonly name = 'twilio';
  readonly type = 'communication' as const;

  // Same methods, but now explicitly implements ICommunicationProvider
  async makeCall(to: string, options: CallOptions): Promise<string> { /* same */ }
  async sendSMS(to: string, body: string, options?: SMSOptions): Promise<string> { /* same */ }
  async endCall(callSid: string): Promise<void> { /* add if missing */ }
}
```

#### GoogleProvider

**Current** (has business logic - BAD):
```typescript
export class GoogleProvider extends BaseProvider {
  // ❌ This is business logic - should be in CalendarProcessor
  async getAvailableSlots(params: {
    calendarId: string;
    date: Date;
    duration: number;
  }): Promise<string[]> {
    // Complex slot computation logic
    // This doesn't belong here!
  }

  async createEvent(event: GoogleEvent): Promise<string> {
    // ✅ This is fine - pure wrapper
  }
}
```

**Target** (PURE wrapper):
```typescript
export class GoogleProvider extends BaseProvider implements ICalendarProvider {
  readonly name = 'google';
  readonly type = 'calendar' as const;

  // ❌ Remove getAvailableSlots entirely!

  // ✅ Add pure API wrappers only
  async listFreeBusy(params: {
    calendarId: string;
    timeMin: Date;
    timeMax: Date;
    timeZone?: string;
  }): Promise<Array<{ start: Date; end: Date }>> {
    // Just call Google FreeBusy API and return results
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        items: [{ id: params.calendarId }]
      }
    });

    return response.data.calendars[params.calendarId].busy.map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end)
    }));
  }

  async createEvent(params: {
    calendarId: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: { email: string; optional?: boolean }[];
  }): Promise<{ id: string }> {
    // Just call Google Calendar API
    const response = await this.calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
        attendees: params.attendees
      }
    });

    return { id: response.data.id };
  }

  async updateEvent(params: {
    calendarId: string;
    eventId: string;
    changes: Partial<CalendarEvent>;
  }): Promise<void> {
    // Pure wrapper for update
  }

  async deleteEvent(params: {
    calendarId: string;
    eventId: string;
  }): Promise<void> {
    // Pure wrapper for delete
  }
}
```

### Provider Interface Contracts

#### ICommunicationProvider

```typescript
// src/types/providers/communication.provider.ts
export interface ICommunicationProvider extends IProvider {
  readonly name: string;
  readonly type: 'communication';

  /**
   * Initiate an outbound call
   * @returns Call SID
   */
  makeCall(to: string, options: CallOptions): Promise<string>;

  /**
   * Send SMS message
   * @returns Message SID
   */
  sendSMS(to: string, body: string, options?: SMSOptions): Promise<string>;

  /**
   * End an active call
   */
  endCall(callSid: string): Promise<void>;
}

export interface CallOptions {
  webhookUrl: string;
  statusCallback?: string;
  from?: string; // Override default number
  timeout?: number;
}

export interface SMSOptions {
  statusCallback?: string;
  from?: string; // Override default number
}
```

#### ICalendarProvider

```typescript
// src/types/providers/calendar.provider.ts
export interface ICalendarProvider extends IProvider {
  readonly name: string;
  readonly type: 'calendar';

  /**
   * List busy time blocks (free/busy query)
   * Pure API call - no business logic
   */
  listFreeBusy(params: {
    calendarId: string;
    timeMin: Date;
    timeMax: Date;
    timeZone?: string;
  }): Promise<Array<{ start: Date; end: Date }>>;

  /**
   * Create calendar event
   * Pure API call - no business logic
   */
  createEvent(params: {
    calendarId: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: { email: string; optional?: boolean }[];
    timeZone?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }>;

  /**
   * Update existing event
   */
  updateEvent?(params: {
    calendarId: string;
    eventId: string;
    changes: Partial<CalendarEvent>;
  }): Promise<void>;

  /**
   * Delete event
   */
  deleteEvent?(params: {
    calendarId: string;
    eventId: string;
  }): Promise<void>;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: { email: string; optional?: boolean }[];
  timeZone?: string;
}
```

---

## Service Layer Changes

Services become thinner - they delegate orchestration to processors.

### Before (CallService with hardcoded orchestration)

```typescript
// Current CallService - 174 lines, lots of hardcoded logic
export class CallService {
  async handleUserSpeech(callSid: string, userSpeech: string): Promise<string> {
    // 1. Get conversation
    const conversation = await this.conversationService.getByCallId(callSid);
    
    // 2. Add user message
    await this.conversationService.addMessage(conversation.id, {...});
    
    // 3. Get AI response ❌ Hardcoded
    const aiResponse = await this.aiProvider.chat({...});
    
    // 4. Execute tools ❌ Hardcoded loop
    if (aiResponse.toolCalls) {
      for (const toolCall of aiResponse.toolCalls) {
        const toolResult = await this.toolExecutor.execute(...);
        await this.conversationService.addMessage(conversation.id, {
          role: 'tool',
          content: JSON.stringify(toolResult)
        });
      }
      
      // ❌ Hardcoded second AI call
      const finalResponse = await this.aiProvider.chat({...});
      await this.conversationService.addMessage(conversation.id, {
        role: 'assistant',
        content: finalResponse.content
      });
      return finalResponse.content;
    }
    
    // ❌ Hardcoded single response path
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: aiResponse.content
    });
    return aiResponse.content;
  }
}
```

### After (CallService delegates to CallProcessor)

```typescript
// New CallService - much simpler, delegates to processor
export class CallService {
  constructor(
    private conversationService: ConversationService,
    private callProcessor: CallProcessor // ★ NEW
  ) {}

  async handleUserSpeech(callSid: string, userSpeech: string): Promise<string> {
    // 1. Get conversation context
    const conversation = await this.conversationService.getByCallId(callSid);
    if (!conversation) {
      throw new Error(`Conversation not found for call ${callSid}`);
    }

    // 2. Add user message to conversation
    await this.conversationService.addMessage(conversation.id, {
      role: 'user',
      content: userSpeech
    });

    // 3. Get conversation history
    const history = await this.conversationService.getMessages(conversation.id);

    // 4. ★ Delegate to processor - it handles all the orchestration! ★
    const response = await this.callProcessor.processUserSpeech({
      callSid,
      userSpeech,
      conversationHistory: history,
      availableTools: this.getAvailableTools()
    });

    // 5. Add assistant response to conversation
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: response.content
    });

    // 6. Return response
    return response.content;
  }

  private getAvailableTools(): ITool[] {
    // Get tools from registry
    return [];
  }
}
```

### CalendarService (New)

```typescript
// src/services/calendar.service.ts
export class CalendarService {
  constructor(
    private calendarProcessor: CalendarProcessor // ★ NEW
  ) {}

  /**
   * Find available slots using AI-driven processor
   */
  async findAvailableSlots(params: {
    calendarId: string;
    preferredDates: Date[];
    duration: number;
    userPreferences?: string;
  }): Promise<Date[]> {
    // Validate params
    if (params.duration < 15 || params.duration > 480) {
      throw new Error('Duration must be between 15 and 480 minutes');
    }

    // ★ Delegate to processor
    const result = await this.calendarProcessor.findAndBook({
      ...params,
      attendees: [] // No booking yet, just finding slots
    });

    // Extract slots from result
    return result.slot ? [result.slot.start] : [];
  }

  /**
   * Book appointment using AI-driven processor
   */
  async bookAppointment(params: {
    calendarId: string;
    title: string;
    start: Date;
    end: Date;
    attendees?: string[];
  }): Promise<{ id: string }> {
    // Validate params
    if (params.start >= params.end) {
      throw new Error('Start time must be before end time');
    }

    // ★ Delegate to processor
    const result = await this.calendarProcessor.findAndBook({
      calendarId: params.calendarId,
      preferredDates: [params.start],
      duration: (params.end.getTime() - params.start.getTime()) / (60 * 1000),
      attendees: params.attendees
    });

    if (!result.success) {
      throw new Error(result.error || 'Booking failed');
    }

    return { id: result.eventId! };
  }
}
```

---

## Data Flow Comparison

### Current Data Flow (Before)

```
User Action (make call)
    ↓
CallsResource.make()
    ↓
CallService.initiateCall()
    ↓
├─ ConversationService.create()  ← creates conversation
├─ ToolExecutor.getToolsForChannel()  ← gets tools
└─ TwilioProvider.makeCall()  ← makes API call
    ↓
Twilio API
    ↓
User receives call
    ↓
User speaks
    ↓
Webhook to CallService.handleUserSpeech()
    ↓
├─ ConversationService.getByCallId()  ← get conversation
├─ ConversationService.addMessage()  ← add user message
├─ ★ AIProvider.chat()  ← AI decides response ★
│   ↓
│   if toolCalls:
│   ├─ ★ Hardcoded: loop through tool calls ★
│   ├─ ★ ToolExecutor.execute() for each ★
│   └─ ★ AIProvider.chat() again with results ★
│
└─ ConversationService.addMessage()  ← add assistant message
    ↓
Return response to Twilio
```

**Problems:**
- ❌ Orchestration logic hardcoded in CallService
- ❌ No AI involved in deciding how to handle errors
- ❌ Services directly call providers
- ❌ Difficult to change orchestration flow

### Target Data Flow (After)

```
User Action (make call)
    ↓
CallsResource.make()
    ↓
CallService.initiateCall()
    ↓
├─ ConversationService.create()  ← creates conversation
└─ CallProcessor.initiateCall()  ← ★ Processor handles orchestration ★
    ↓
    ├─ ★ AI: How should I greet the user? ★
    ├─ TwilioProvider.makeCall()  ← Pure API call
    └─ Return result to service
    ↓
Twilio API
    ↓
User receives call
    ↓
User speaks
    ↓
Webhook to CallService.handleUserSpeech()
    ↓
├─ ConversationService.getByCallId()  ← get conversation
├─ ConversationService.addMessage()  ← add user message
└─ ★ CallProcessor.processUserSpeech() ★  ← ★ Processor orchestrates ★
    ↓
    ├─ ★ AI: What should I do? (respond/use tools/end call) ★
    ├─ if use_tools:
    │   ├─ ★ AI: Which tools? ★
    │   ├─ ToolExecutor.execute() for each tool
    │   │   ↓
    │   │   if tool fails:
    │   │   └─ ★ AI: How to handle error? (retry/skip/inform) ★
    │   │
    │   └─ ★ AI: What should I say with these results? ★
    │
    └─ Return ProcessorResponse to service
    ↓
ConversationService.addMessage()  ← add assistant message
    ↓
Return response to Twilio
```

**Benefits:**
- ✅ Processor orchestrates using AI guidance
- ✅ AI involved in decision-making at each step
- ✅ Services are thin and delegate to processors
- ✅ Easy to change orchestration by adjusting AI prompts
- ✅ Consistent pattern across all operations

---

## Detailed Component Changes

### File Structure Changes

```
src/
├── processors/  ★ NEW DIRECTORY ★
│   ├── index.ts
│   ├── base.processor.ts
│   ├── call.processor.ts
│   ├── calendar.processor.ts
│   └── messaging.processor.ts
│
├── providers/
│   ├── ai/
│   │   ├── openai.provider.ts  ← No changes (already pure)
│   │   └── openrouter.provider.ts  ← No changes (already pure)
│   │
│   ├── communication/  ★ RENAMED from core/ ★
│   │   └── twilio.provider.ts  ← Make fully pure, add interface
│   │
│   └── calendar/  ★ NEW DIRECTORY ★
│       └── google.provider.ts  ← Make pure, remove business logic
│
├── services/
│   ├── call.service.ts  ← Refactor to use CallProcessor
│   ├── calendar.service.ts  ← NEW - use CalendarProcessor
│   ├── messaging.service.ts  ← NEW - use MessagingProcessor
│   ├── conversation.service.ts  ← Minor changes
│   └── tool-execution.service.ts  ← No changes
│
├── types/
│   ├── providers/  ★ NEW DIRECTORY ★
│   │   ├── communication.provider.ts  ← ICommunicationProvider
│   │   ├── calendar.provider.ts  ← ICalendarProvider
│   │   └── index.ts
│   │
│   ├── processors/  ★ NEW DIRECTORY ★
│   │   ├── processor.types.ts  ← Processor interfaces
│   │   └── index.ts
│   │
│   └── index.ts  ← Update exports
│
└── client.ts  ← Update initialization to create processors
```

### Changes by File

#### 1. `src/client.ts` (AIReceptionist)

**Changes:**
- Create processor instances during initialization
- Pass processors to services instead of providers

```typescript
// BEFORE
export class AIReceptionist {
  private callService?: CallService;

  async initialize(): Promise<void> {
    // ...
    
    // Create CallService with providers
    this.callService = new CallService(
      await this.providerRegistry.get<TwilioProvider>('twilio'),
      aiProvider,
      this.conversationService,
      this.toolExecutor,
      agentId
    );
  }
}

// AFTER
export class AIReceptionist {
  private callProcessor?: CallProcessor;
  private calendarProcessor?: CalendarProcessor;
  private messagingProcessor?: MessagingProcessor;
  private callService?: CallService;
  private calendarService?: CalendarService;

  async initialize(): Promise<void> {
    // ...
    
    // ★ Create processors ★
    this.callProcessor = new CallProcessor(
      aiProvider,
      await this.providerRegistry.get<ICommunicationProvider>('twilio'),
      this.toolExecutor,
      logger
    );

    this.calendarProcessor = new CalendarProcessor(
      aiProvider,
      await this.providerRegistry.get<ICalendarProvider>('google'),
      logger
    );

    this.messagingProcessor = new MessagingProcessor(
      aiProvider,
      await this.providerRegistry.get<ICommunicationProvider>('twilio'),
      logger
    );

    // ★ Create services with processors ★
    this.callService = new CallService(
      this.conversationService,
      this.callProcessor  // ← Pass processor, not provider
    );

    this.calendarService = new CalendarService(
      this.calendarProcessor  // ← Pass processor
    );

    // Initialize resources with services
    (this as any).calls = new CallsResource(this.callService);
    // ...
  }
}
```

#### 2. `src/providers/communication/twilio.provider.ts`

**Changes:**
- Implement `ICommunicationProvider` interface explicitly
- Ensure all methods are pure API wrappers

```typescript
// BEFORE
export class TwilioProvider extends BaseProvider {
  readonly name = 'twilio';
  readonly type = 'communication' as const;
  
  // Methods exist but no explicit interface
}

// AFTER
export class TwilioProvider extends BaseProvider implements ICommunicationProvider {
  readonly name = 'twilio';
  readonly type = 'communication' as const;

  async makeCall(to: string, options: CallOptions): Promise<string> {
    this.ensureInitialized();
    
    const call = await this.client.calls.create({
      to,
      from: options.from || this.config.phoneNumber,
      url: options.webhookUrl,
      statusCallback: options.statusCallback,
      timeout: options.timeout
    });

    return call.sid;
  }

  async sendSMS(to: string, body: string, options?: SMSOptions): Promise<string> {
    this.ensureInitialized();

    const message = await this.client.messages.create({
      to,
      from: options?.from || this.config.phoneNumber,
      body,
      statusCallback: options?.statusCallback
    });

    return message.sid;
  }

  async endCall(callSid: string): Promise<void> {
    this.ensureInitialized();

    await this.client.calls(callSid).update({
      status: 'completed'
    });
  }
}
```

#### 3. `src/providers/calendar/google.provider.ts`

**Changes:**
- Remove `getAvailableSlots` method entirely
- Add `listFreeBusy` as pure API wrapper
- Implement `ICalendarProvider` interface

```typescript
// BEFORE
export class GoogleProvider extends BaseProvider {
  readonly name = 'google';
  readonly type = 'core' as const;

  // ❌ Remove this entirely
  async getAvailableSlots(params: {...}): Promise<string[]> {
    // Business logic for computing slots
  }

  async createEvent(event: GoogleEvent): Promise<string> {
    // ...
  }
}

// AFTER
export class GoogleProvider extends BaseProvider implements ICalendarProvider {
  readonly name = 'google';
  readonly type = 'calendar' as const;

  // ✅ Add pure API wrapper
  async listFreeBusy(params: {
    calendarId: string;
    timeMin: Date;
    timeMax: Date;
    timeZone?: string;
  }): Promise<Array<{ start: Date; end: Date }>> {
    this.ensureInitialized();

    const { google } = await import('googleapis');
    const calendar = google.calendar({ version: 'v3', auth: this.auth });

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        timeZone: params.timeZone || 'UTC',
        items: [{ id: params.calendarId }]
      }
    });

    const busy = response.data.calendars?.[params.calendarId]?.busy || [];
    return busy.map(slot => ({
      start: new Date(slot.start!),
      end: new Date(slot.end!)
    }));
  }

  async createEvent(params: {
    calendarId: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: { email: string; optional?: boolean }[];
    timeZone?: string;
  }): Promise<{ id: string }> {
    this.ensureInitialized();

    const { google } = await import('googleapis');
    const calendar = google.calendar({ version: 'v3', auth: this.auth });

    const response = await calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: {
          dateTime: params.start.toISOString(),
          timeZone: params.timeZone || 'UTC'
        },
        end: {
          dateTime: params.end.toISOString(),
          timeZone: params.timeZone || 'UTC'
        },
        attendees: params.attendees
      }
    });

    return { id: response.data.id! };
  }

  async updateEvent(params: {
    calendarId: string;
    eventId: string;
    changes: Partial<CalendarEvent>;
  }): Promise<void> {
    this.ensureInitialized();
    // Pure API wrapper for update
  }

  async deleteEvent(params: {
    calendarId: string;
    eventId: string;
  }): Promise<void> {
    this.ensureInitialized();
    // Pure API wrapper for delete
  }
}
```

#### 4. `src/services/call.service.ts`

**Changes:**
- Remove direct provider access
- Delegate orchestration to CallProcessor
- Keep only high-level business logic

```typescript
// BEFORE (174 lines with hardcoded orchestration)
export class CallService {
  constructor(
    private twilioProvider: TwilioProvider,
    private aiProvider: IAIProvider,
    private conversationService: ConversationService,
    private toolExecutor: ToolExecutionService,
    private agentId: string,
    private webhookBaseUrl: string = 'http://localhost:3000'
  ) {}

  async handleUserSpeech(callSid: string, userSpeech: string): Promise<string> {
    // ... 60+ lines of hardcoded orchestration logic
  }
}

// AFTER (much simpler, delegates to processor)
export class CallService {
  constructor(
    private conversationService: ConversationService,
    private callProcessor: CallProcessor  // ★ NEW
  ) {}

  async initiateCall(options: MakeCallOptions): Promise<CallSession> {
    // 1. Create conversation
    const conversation = await this.conversationService.create({
      channel: 'call',
      metadata: options.metadata
    });

    // 2. ★ Delegate to processor ★
    const result = await this.callProcessor.initiateCall({
      to: options.to,
      conversationId: conversation.id,
      greeting: 'Hello! How can I help you today?'
    });

    return {
      id: result.callSid,
      conversationId: conversation.id,
      to: options.to,
      status: 'initiated',
      startedAt: new Date()
    };
  }

  async handleUserSpeech(callSid: string, userSpeech: string): Promise<string> {
    // 1. Get conversation context
    const conversation = await this.conversationService.getByCallId(callSid);
    if (!conversation) {
      throw new Error(`Conversation not found for call ${callSid}`);
    }

    // 2. Add user message
    await this.conversationService.addMessage(conversation.id, {
      role: 'user',
      content: userSpeech
    });

    // 3. Get conversation history
    const history = await this.conversationService.getMessages(conversation.id);

    // 4. ★ Delegate to processor - handles all orchestration ★
    const response = await this.callProcessor.processUserSpeech({
      callSid,
      userSpeech,
      conversationHistory: history,
      availableTools: []  // TODO: Get from registry
    });

    // 5. Add assistant response
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: response.content
    });

    // 6. Handle special actions
    if (response.action === 'end_call') {
      await this.endCall(callSid);
    }

    return response.content;
  }

  async endCall(callSid: string): Promise<void> {
    const conversation = await this.conversationService.getByCallId(callSid);
    if (conversation) {
      await this.conversationService.complete(conversation.id);
    }

    // ★ Delegate to processor to end call via provider ★
    await this.callProcessor.endCall(callSid);
  }
}
```

#### 5. `src/tools/standard/index.ts` (Standard Tools)

**Changes:**
- Update calendar tool to use CalendarService instead of provider
- Ensure tools delegate to services/processors, not providers directly

```typescript
// BEFORE
function createCalendarTool(calendarConfig: any, providerConfig: ProviderConfig) {
  return new ToolBuilder()
    .withName('check_calendar')
    .onCall(async (params, ctx) => {
      // ❌ Hardcoded logic for checking availability
      const availableSlots = ['9:00 AM', '2:00 PM', '4:00 PM'];
      // ...
    })
    .build();
}

// AFTER
function createCalendarTool(
  calendarService: CalendarService  // ★ Pass service instead of config ★
) {
  return new ToolBuilder()
    .withName('check_calendar')
    .onCall(async (params, ctx) => {
      if (params.action === 'check_availability') {
        // ★ Delegate to service (which uses processor) ★
        const slots = await calendarService.findAvailableSlots({
          calendarId: 'primary',
          preferredDates: [new Date(params.date)],
          duration: params.duration || 60,
          userPreferences: params.preferences
        });

        return {
          success: true,
          data: { slots },
          response: {
            speak: `I found ${slots.length} available times. The first one is at ${slots[0].toLocaleTimeString()}.`
          }
        };
      }

      if (params.action === 'book') {
        // ★ Delegate to service ★
        const booking = await calendarService.bookAppointment({
          calendarId: 'primary',
          title: params.title || 'Appointment',
          start: new Date(params.date + ' ' + params.time),
          end: new Date(params.date + ' ' + params.time),  // Add duration
          attendees: params.attendees
        });

        return {
          success: true,
          data: { bookingId: booking.id },
          response: {
            speak: `Perfect! I've booked your appointment. Your confirmation number is ${booking.id}.`
          }
        };
      }

      return {
        success: false,
        error: 'Unknown action',
        response: { speak: 'I could not complete that action.' }
      };
    })
    .build();
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Set up processor infrastructure

1. **Create processor types and interfaces**
   - `src/types/processors/processor.types.ts`
   - `src/types/processors/index.ts`

2. **Create base processor class**
   - `src/processors/base.processor.ts`

3. **Create provider interfaces**
   - `src/types/providers/communication.provider.ts`
   - `src/types/providers/calendar.provider.ts`

4. **Update exports**
   - `src/types/index.ts`
   - `src/processors/index.ts`

**Deliverables:**
- [ ] Processor base class and types
- [ ] Provider interfaces defined
- [ ] All types exported properly
- [ ] Unit tests for base processor

### Phase 2: Pure Providers (Week 2)

**Goal**: Make all providers PURE wrappers

1. **Refactor GoogleProvider**
   - Remove `getAvailableSlots` method
   - Add `listFreeBusy` as pure wrapper
   - Implement `ICalendarProvider`
   - Move file to `src/providers/calendar/google.provider.ts`
   - Update all imports

2. **Refactor TwilioProvider**
   - Ensure all methods are pure wrappers
   - Implement `ICommunicationProvider` explicitly
   - Add `endCall` method if missing
   - Move file to `src/providers/communication/twilio.provider.ts`
   - Update all imports

3. **Update provider registry**
   - Update registration keys
   - Update validators

**Deliverables:**
- [ ] GoogleProvider is pure (no business logic)
- [ ] TwilioProvider implements interface
- [ ] All provider tests passing
- [ ] Documentation updated

### Phase 3: Processors (Week 3-4)

**Goal**: Implement processor layer

1. **Implement CallProcessor**
   - `src/processors/call.processor.ts`
   - `processUserSpeech()` method with AI orchestration
   - `initiateCall()` method
   - `endCall()` method
   - Error handling with AI guidance
   - Unit tests

2. **Implement CalendarProcessor**
   - `src/processors/calendar.processor.ts`
   - `findAndBook()` method with AI slot selection
   - Conflict detection
   - Retry logic
   - Unit tests

3. **Implement MessagingProcessor**
   - `src/processors/messaging.processor.ts`
   - `sendMessage()` with AI content generation
   - Compliance checking
   - Template selection
   - Unit tests

**Deliverables:**
- [ ] CallProcessor implemented and tested
- [ ] CalendarProcessor implemented and tested
- [ ] MessagingProcessor implemented and tested
- [ ] Integration tests with mocked providers

### Phase 4: Services Refactor (Week 5)

**Goal**: Update services to use processors

1. **Refactor CallService**
   - Remove direct provider access
   - Inject CallProcessor
   - Delegate orchestration to processor
   - Simplify methods
   - Update tests

2. **Create CalendarService**
   - New service using CalendarProcessor
   - `findAvailableSlots()` method
   - `bookAppointment()` method
   - Validation logic
   - Unit tests

3. **Create MessagingService**
   - New service using MessagingProcessor
   - `sendTemplatedMessage()` method
   - Compliance checking
   - Rate limiting
   - Unit tests

**Deliverables:**
- [ ] CallService refactored and tested
- [ ] CalendarService created and tested
- [ ] MessagingService created and tested
- [ ] All service tests passing

### Phase 5: Client Integration (Week 6)

**Goal**: Wire processors into main client

1. **Update AIReceptionist client**
   - Create processor instances during init
   - Pass processors to services
   - Update resource initialization
   - Update client tests

2. **Update standard tools**
   - Pass services instead of configs
   - Remove hardcoded logic
   - Delegate to services/processors
   - Update tool tests

3. **Update resources**
   - Ensure resources use services correctly
   - Update resource tests

**Deliverables:**
- [ ] Client creates and wires processors
- [ ] All resources use new architecture
- [ ] Standard tools updated
- [ ] End-to-end tests passing

### Phase 6: Documentation & Migration (Week 7)

**Goal**: Document changes and provide migration guide

1. **Update architecture docs**
   - Update `docs/architecture/root.md`
   - Create `docs/architecture/PROCESSOR_LAYER_REFACTOR.md` (this doc)
   - Update diagrams

2. **Create migration guide**
   - Breaking changes list
   - Code examples for migration
   - FAQ

3. **Update examples**
   - Update all examples to use new architecture
   - Add processor examples

**Deliverables:**
- [ ] Architecture docs updated
- [ ] Migration guide created
- [ ] All examples updated
- [ ] README updated

---

## Breaking Changes

### Critical Breaking Changes

#### 1. GoogleProvider API Changes

**BREAKING**: `getAvailableSlots()` method removed

```typescript
// ❌ BEFORE (will no longer work)
const googleProvider = await registry.get<GoogleProvider>('google');
const slots = await googleProvider.getAvailableSlots({
  calendarId: 'primary',
  date: new Date(),
  duration: 60
});

// ✅ AFTER (use CalendarService instead)
const calendarService = client.getCalendarService();
const slots = await calendarService.findAvailableSlots({
  calendarId: 'primary',
  preferredDates: [new Date()],
  duration: 60
});
```

#### 2. Provider Registry Keys

**BREAKING**: Some provider keys have changed

```typescript
// ❌ BEFORE
registry.get('google-calendar')  // Old key
registry.get('twilio')  // Unchanged

// ✅ AFTER
registry.get('google')  // New key
registry.get('twilio')  // Unchanged
```

#### 3. Service Constructors

**BREAKING**: Service constructors now take processors instead of providers

```typescript
// ❌ BEFORE
new CallService(
  twilioProvider,
  aiProvider,
  conversationService,
  toolExecutor,
  agentId
)

// ✅ AFTER
new CallService(
  conversationService,
  callProcessor  // Takes processor instead
)
```

#### 4. Tool Registration

**BREAKING**: Standard tools now require service instances

```typescript
// ❌ BEFORE
await setupStandardTools(
  registry,
  toolConfig,
  providerConfig  // Pass config
);

// ✅ AFTER
await setupStandardTools(
  registry,
  {
    calendarService,  // Pass service instances
    messagingService,
    // ...
  }
);
```

### Migration Checklist

- [ ] Update all `GoogleProvider` usage to use `CalendarService`
- [ ] Update provider registry keys from `google-calendar` to `google`
- [ ] Update service instantiation to use processors
- [ ] Update tool registration to pass services
- [ ] Update all imports (providers moved to subdirectories)
- [ ] Run tests and fix any broken tests
- [ ] Update any custom tools that directly accessed providers

---

## Testing Strategy

### Unit Tests

#### Processor Tests

Test processors in isolation with mocked dependencies:

```typescript
// tests/processors/call.processor.test.ts
describe('CallProcessor', () => {
  let processor: CallProcessor;
  let mockAI: jest.Mocked<IAIProvider>;
  let mockComm: jest.Mocked<ICommunicationProvider>;
  let mockTools: jest.Mocked<ToolExecutionService>;

  beforeEach(() => {
    mockAI = createMockAIProvider();
    mockComm = createMockCommunicationProvider();
    mockTools = createMockToolExecutor();
    processor = new CallProcessor(mockAI, mockComm, mockTools, logger);
  });

  it('should process user speech without tools', async () => {
    mockAI.chat.mockResolvedValue({
      content: 'How can I help you?',
      finishReason: 'stop'
    });

    const result = await processor.processUserSpeech({
      callSid: 'CA123',
      userSpeech: 'Hello',
      conversationHistory: [],
      availableTools: []
    });

    expect(result.content).toBe('How can I help you?');
    expect(result.action).toBe('respond');
    expect(mockAI.chat).toHaveBeenCalledTimes(1);
  });

  it('should execute tools when AI requests them', async () => {
    mockAI.chat
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ id: '1', name: 'check_calendar', parameters: {} }],
        finishReason: 'tool_calls'
      })
      .mockResolvedValueOnce({
        content: 'I found 3 available slots.',
        finishReason: 'stop'
      });

    mockTools.execute.mockResolvedValue({
      success: true,
      data: { slots: ['9am', '2pm', '4pm'] },
      response: { speak: 'Found slots' }
    });

    const result = await processor.processUserSpeech({
      callSid: 'CA123',
      userSpeech: 'Check availability',
      conversationHistory: [],
      availableTools: [mockCalendarTool]
    });

    expect(result.content).toBe('I found 3 available slots.');
    expect(mockAI.chat).toHaveBeenCalledTimes(2);
    expect(mockTools.execute).toHaveBeenCalledTimes(1);
  });

  it('should handle tool errors with AI guidance', async () => {
    mockAI.chat
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ id: '1', name: 'check_calendar', parameters: {} }],
        finishReason: 'tool_calls'
      })
      .mockResolvedValueOnce({  // Error handling guidance
        content: 'retry',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({  // Final response
        content: 'I apologize, I had trouble checking the calendar.',
        finishReason: 'stop'
      });

    mockTools.execute
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce({  // Retry succeeds
        success: true,
        data: { slots: [] },
        response: { speak: 'No slots' }
      });

    const result = await processor.processUserSpeech({
      callSid: 'CA123',
      userSpeech: 'Check availability',
      conversationHistory: [],
      availableTools: [mockCalendarTool]
    });

    expect(mockAI.chat).toHaveBeenCalledTimes(3);
    expect(mockTools.execute).toHaveBeenCalledTimes(2);  // Original + retry
  });
});
```

#### Provider Tests (Ensure Purity)

Test that providers ONLY call APIs, no business logic:

```typescript
// tests/providers/calendar/google.provider.test.ts
describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let mockGoogleClient: any;

  beforeEach(async () => {
    mockGoogleClient = createMockGoogleClient();
    provider = new GoogleProvider(config);
    await provider.initialize();
  });

  it('should only call Google FreeBusy API (pure wrapper)', async () => {
    mockGoogleClient.freebusy.query.mockResolvedValue({
      data: {
        calendars: {
          'primary': {
            busy: [
              { start: '2025-01-01T09:00:00Z', end: '2025-01-01T10:00:00Z' }
            ]
          }
        }
      }
    });

    const result = await provider.listFreeBusy({
      calendarId: 'primary',
      timeMin: new Date('2025-01-01'),
      timeMax: new Date('2025-01-02')
    });

    expect(result).toEqual([
      {
        start: new Date('2025-01-01T09:00:00Z'),
        end: new Date('2025-01-01T10:00:00Z')
      }
    ]);
    expect(mockGoogleClient.freebusy.query).toHaveBeenCalledTimes(1);
    // ✅ Provider should NOT do any slot computation, just return raw data
  });

  it('should not contain any business logic', () => {
    // Verify provider has no methods like "getAvailableSlots"
    expect(provider).not.toHaveProperty('getAvailableSlots');
    expect(provider).not.toHaveProperty('findBestSlot');
    expect(provider).not.toHaveProperty('computeSlots');
  });
});
```

### Integration Tests

Test full flow from service → processor → provider:

```typescript
// tests/integration/calendar-booking-flow.test.ts
describe('Calendar Booking Flow', () => {
  let client: AIReceptionist;
  let calendarService: CalendarService;

  beforeEach(async () => {
    client = new AIReceptionist({
      agent: mockAgentConfig,
      model: mockModelConfig,
      providers: {
        calendar: { google: mockGoogleConfig }
      }
    });
    await client.initialize();
    calendarService = client.getCalendarService();
  });

  it('should find and book appointment using AI guidance', async () => {
    const result = await calendarService.bookAppointment({
      calendarId: 'primary',
      title: 'Test Meeting',
      start: new Date('2025-01-30T14:00:00Z'),
      end: new Date('2025-01-30T15:00:00Z'),
      attendees: ['test@example.com']
    });

    expect(result.id).toBeDefined();
    // Verify the flow:
    // 1. Service called processor
    // 2. Processor consulted AI
    // 3. Processor called provider
    // 4. Provider called Google API
  });
});
```

### E2E Tests

Test real scenarios with minimal mocking:

```typescript
// tests/e2e/call-with-calendar-booking.test.ts
describe('Call with Calendar Booking (E2E)', () => {
  it('should handle voice call that books appointment', async () => {
    const client = new AIReceptionist(config);
    await client.initialize();

    // Simulate incoming call
    const call = await client.calls.make({ to: '+1234567890' });

    // Simulate user speech
    const response1 = await simulateUserSpeech(call.id, "I'd like to book an appointment");
    expect(response1).toContain('What date');

    const response2 = await simulateUserSpeech(call.id, 'January 30th at 2pm');
    // AI should:
    // 1. Understand date/time
    // 2. Check calendar via CalendarProcessor
    // 3. Book if available
    // 4. Confirm to user
    expect(response2).toContain('booked');
  });
});
```

---

## Examples

### Example 1: Booking Appointment via Voice Call

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

const sarah = new AIReceptionist({
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Scheduling Assistant'
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
    calendar: {
      google: {
        apiKey: process.env.GOOGLE_API_KEY!,
        calendarId: 'primary',
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!)
      }
    }
  }
});

await sarah.initialize();

// Make a call - processor orchestrates the entire flow using AI
const call = await sarah.calls.make({
  to: '+1234567890'
});

console.log('Call initiated:', call.id);

// Behind the scenes, when user speaks:
// 1. CallService receives webhook
// 2. CallService delegates to CallProcessor
// 3. CallProcessor asks AI: "What should I do?"
// 4. AI might say: "Use check_calendar tool"
// 5. CallProcessor executes tool via ToolExecutor
// 6. Tool calls CalendarService
// 7. CalendarService delegates to CalendarProcessor
// 8. CalendarProcessor uses AI to pick best slot
// 9. CalendarProcessor calls GoogleProvider.listFreeBusy()
// 10. CalendarProcessor calls GoogleProvider.createEvent()
// 11. Results bubble back up through services
// 12. CallProcessor generates final response using AI
// 13. Response sent to user via Twilio
```

### Example 2: Direct Calendar Booking (No Voice)

```typescript
// Get calendar service from client
const calendarService = sarah.getCalendarService();

// Find available slots - processor uses AI to pick best times
const slots = await calendarService.findAvailableSlots({
  calendarId: 'primary',
  preferredDates: [
    new Date('2025-01-30'),
    new Date('2025-01-31')
  ],
  duration: 60,
  userPreferences: 'prefer afternoons'
});

console.log('Available slots:', slots);

// Book appointment - processor uses AI to handle conflicts
const booking = await calendarService.bookAppointment({
  calendarId: 'primary',
  title: 'Demo Call',
  start: slots[0],
  end: new Date(slots[0].getTime() + 60 * 60 * 1000),
  attendees: ['customer@example.com']
});

console.log('Booked:', booking.id);
```

### Example 3: Custom Processor

```typescript
// Create a custom processor for your specific use case
import { BaseProcessor, IAIProvider } from '@loctelli/ai-receptionist';

export class CustomOrderProcessor extends BaseProcessor {
  readonly name = 'order';
  readonly type = 'custom' as const;

  constructor(
    aiProvider: IAIProvider,
    private inventoryProvider: IInventoryProvider,
    private paymentProvider: IPaymentProvider,
    logger: Logger
  ) {
    super(aiProvider, logger);
  }

  async processOrder(params: {
    items: Array<{ productId: string; quantity: number }>;
    customerId: string;
    paymentMethod: string;
  }): Promise<OrderResult> {
    // 1. Ask AI to validate order
    const validation = await this.consultAI({
      context: `Validate order: ${JSON.stringify(params.items)}`,
      options: ['proceed', 'request_clarification', 'reject']
    });

    if (validation.content.includes('reject')) {
      return {
        success: false,
        error: 'Order rejected by AI',
        reason: validation.content
      };
    }

    // 2. Check inventory via provider (pure API wrapper)
    const availability = await this.inventoryProvider.checkAvailability(
      params.items.map(i => i.productId)
    );

    // 3. Ask AI how to handle out-of-stock items
    if (availability.outOfStock.length > 0) {
      const guidance = await this.consultAI({
        context: `Items out of stock: ${availability.outOfStock.join(', ')}. What should I do?`,
        options: ['suggest_alternatives', 'partial_order', 'cancel']
      });

      // Handle based on AI guidance...
    }

    // 4. Process payment via provider (pure API wrapper)
    const payment = await this.paymentProvider.charge({
      customerId: params.customerId,
      amount: this.calculateTotal(params.items),
      paymentMethod: params.paymentMethod
    });

    // 5. Ask AI to generate confirmation message
    const confirmation = await this.consultAI({
      context: `Generate order confirmation for ${params.items.length} items`,
      options: ['send_email', 'send_sms', 'both']
    });

    return {
      success: true,
      orderId: payment.transactionId,
      message: confirmation.content
    };
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI order processing assistant.
Available actions: ${options.join(', ')}
Always prioritize customer satisfaction and handle errors gracefully.`;
  }
}
```

---

## Summary

### What Changes

1. **Providers become PURE** - Only wrap external APIs, no business logic
2. **Processors added** - AI-driven orchestration layer between services and providers
3. **Services simplified** - Delegate orchestration to processors
4. **AI more involved** - Makes decisions at every step, not just text generation

### What Stays the Same

1. **Public API** - Resources (calls, sms, email) work the same way for users
2. **Agent system** - Six-pillar architecture unchanged
3. **Tool system** - Tools still work, just delegate differently
4. **Provider pattern** - Still use provider registry and lazy loading

### Benefits

- ✅ Cleaner architecture with better separation of concerns
- ✅ AI-driven decision making throughout the system
- ✅ Easier to test (mock processors independently)
- ✅ More flexible (change behavior by adjusting AI prompts)
- ✅ Consistent pattern across all providers
- ✅ Easier to add new providers (just implement interface)

### Trade-offs

- ⚠️ More complexity (additional processor layer)
- ⚠️ More AI API calls (processor consults AI frequently)
- ⚠️ Breaking changes (requires code migration)
- ⚠️ Higher latency (AI involved in more decisions)

---

**Next Steps**: Begin implementation starting with Phase 1 (Foundation).

