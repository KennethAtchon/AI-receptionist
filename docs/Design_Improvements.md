# Design Improvements - AI Receptionist SDK

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [Key Design Patterns](#key-design-patterns)
5. [Implementation Details](#implementation-details)
6. [Migration Path](#migration-path)
7. [Code Examples](#code-examples)
8. [Open Questions](#open-questions)

---

## Executive Summary

### Your Vision
Build an **agent-centric SDK** where an AI agent can communicate through multiple channels (calls, SMS, email) and leverage a flexible, extensible tool system to perform actions like booking calendars, managing CRM, etc.

### Key Insights from Discussion
- **Scenario**: One AI agent with unified personality across all channels (Scenario 2)
- **Tool behavior**: Channel-specific implementations (Option 2)
- **Conceptual model**: AI agent that can communicate multiple ways (Model B)
- **Architecture flow**: `Resource → Service → Provider → External API`

### Recommended Changes
1. **Rename** "Orchestrators" → "**Providers**" (bridges to external APIs)
2. **Introduce** Service layer for business logic and tool management
3. **Create** Tool Registry system with channel-specific handlers
4. **Refactor** to agent-centric architecture (agent is primary, channels are secondary)
5. **Implement** Builder pattern for tool configuration

---

## Current Architecture Analysis

### Current Structure

```
AIReceptionist (Client)
  ├─ CallsResource
  │   └─ TwilioOrchestrator → Twilio API
  ├─ SMSResource
  │   └─ TwilioOrchestrator → Twilio API (shared)
  └─ EmailResource
      └─ EmailOrchestrator → Email API
```

**Current Flow:**
```
CallsResource.make() → TwilioOrchestrator.makeOutboundCall() → Twilio API
```

### Issues with Current Approach

#### 1. **Naming Confusion**
- "Orchestrator" implies coordination of multiple things
- Actually just wraps external APIs (better named "Provider" or "Adapter")

#### 2. **Tight Coupling**
- Resources directly coupled to specific orchestrators
- No abstraction layer for business logic
- Hard to add cross-cutting concerns (logging, analytics, tool execution)

#### 3. **No Tool System**
- AI configuration is basic (just model + agent personality)
- No way to configure what actions the AI can perform
- No registry for managing available tools

#### 4. **Channel-Centric vs Agent-Centric**
- Current: Channels are primary, agent config is duplicated
- Desired: Agent is primary, channels are communication methods

#### 5. **Missing Service Layer**
- Business logic mixed with resource classes
- No place for tool registry, conversation management, etc.

---

## Proposed Architecture

### New Structure

```
AIAgent (Primary Entity)
  ├─ Configuration
  │   ├─ Personality (name, role, tone)
  │   ├─ Model (OpenAI, Anthropic, etc.)
  │   └─ Tool Registry
  │
  ├─ Communication Channels
  │   ├─ Calls (via TwilioProvider)
  │   ├─ SMS (via TwilioProvider)
  │   └─ Email (via SendGridProvider)
  │
  ├─ Services
  │   ├─ ConversationService
  │   ├─ ToolExecutionService
  │   └─ ContextService
  │
  └─ Providers (External API Bridges)
      ├─ TwilioProvider
      ├─ OpenAIProvider
      ├─ GoogleCalendarProvider
      └─ Custom Providers
```

### New Flow

```
User Action
  ↓
Resource (Channel API)
  ↓
Service (Business Logic + Tool Management)
  ↓
Provider (External API Adapter)
  ↓
External API
```

**Example Call Flow:**
```
client.calls.make({ to: '+123' })
  ↓
CallsResource.make()
  ↓
CallService.initiateCall()
  ↓
ConversationService.start() + ToolExecutionService.prepare()
  ↓
TwilioProvider.makeCall() + OpenAIProvider.chat()
  ↓
Twilio API + OpenAI API
```

---

## Key Design Patterns

### 1. **Agent-Centric Design**

**Core Principle:** The AI agent is the primary entity with a unified identity across all channels.

```typescript
// Agent is configured once
const agent = {
  name: 'Sarah',
  role: 'Sales Representative',
  personality: 'friendly and professional',
  systemPrompt: 'You are Sarah, a helpful sales rep...',
};

// Channels are just communication methods for the same agent
client.calls.make({ to: '+123' }); // Sarah speaks on the phone
client.sms.send({ to: '+123', body: '...' }); // Sarah types a text
client.email.send({ to: 'user@example.com' }); // Sarah writes an email
```

### 2. **Provider Pattern (Adapter)**

**Purpose:** Abstract external API implementations

```typescript
interface IProvider {
  readonly name: string;
  readonly type: 'communication' | 'ai' | 'calendar' | 'custom';
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

interface ICommunicationProvider extends IProvider {
  sendMessage(to: string, content: string): Promise<string>;
  makeCall(to: string, config: CallConfig): Promise<string>;
}

class TwilioProvider implements ICommunicationProvider {
  readonly name = 'twilio';
  readonly type = 'communication';

  private client: Twilio.Client;

  constructor(private config: TwilioConfig) {}

  async initialize(): Promise<void> {
    this.client = new Twilio.Client(this.config);
  }

  async makeCall(to: string, config: CallConfig): Promise<string> {
    return this.client.calls.create({ to, from: this.config.phoneNumber, ...config });
  }

  async sendMessage(to: string, content: string): Promise<string> {
    return this.client.messages.create({ to, from: this.config.phoneNumber, body: content });
  }

  async dispose(): Promise<void> {
    // Cleanup
  }
}
```

### 3. **Tool Registry Pattern**

**Purpose:** Centralized management of AI capabilities

```typescript
interface ITool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handlers: {
    onCall?: ToolHandler;
    onSMS?: ToolHandler;
    onEmail?: ToolHandler;
    default: ToolHandler;
  };
}

type ToolHandler = (params: any, context: ExecutionContext) => Promise<ToolResult>;

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  // Channel-specific response
  response: {
    speak?: string;      // For calls
    message?: string;    // For SMS
    html?: string;       // For email
    attachments?: any[]; // For email
  };
}

class ToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(toolName: string): void {
    this.tools.delete(toolName);
  }

  get(toolName: string): ITool | undefined {
    return this.tools.get(toolName);
  }

  listAvailable(channel?: 'call' | 'sms' | 'email'): ITool[] {
    const allTools = Array.from(this.tools.values());

    if (!channel) return allTools;

    // Filter tools that have handlers for this channel
    return allTools.filter(tool => {
      const handler = `on${channel.charAt(0).toUpperCase() + channel.slice(1)}`;
      return tool.handlers[handler] || tool.handlers.default;
    });
  }

  async execute(
    toolName: string,
    params: any,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in registry`);
    }

    // Get channel-specific handler or fall back to default
    const handlerKey = `on${context.channel.charAt(0).toUpperCase() + context.channel.slice(1)}`;
    const handler = tool.handlers[handlerKey] || tool.handlers.default;

    return handler(params, context);
  }
}
```

### 4. **Builder Pattern for Tools**

**Purpose:** Make tool creation intuitive and flexible

```typescript
class ToolBuilder {
  private tool: Partial<ITool> = {
    handlers: {} as any
  };

  withName(name: string): this {
    this.tool.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.tool.description = description;
    return this;
  }

  withParameters(schema: JSONSchema): this {
    this.tool.parameters = schema;
    return this;
  }

  onCall(handler: ToolHandler): this {
    this.tool.handlers!.onCall = handler;
    return this;
  }

  onSMS(handler: ToolHandler): this {
    this.tool.handlers!.onSMS = handler;
    return this;
  }

  onEmail(handler: ToolHandler): this {
    this.tool.handlers!.onEmail = handler;
    return this;
  }

  default(handler: ToolHandler): this {
    this.tool.handlers!.default = handler;
    return this;
  }

  build(): ITool {
    if (!this.tool.name || !this.tool.description || !this.tool.handlers!.default) {
      throw new Error('Tool must have name, description, and default handler');
    }
    return this.tool as ITool;
  }
}

// Usage
const calendarTool = new ToolBuilder()
  .withName('check_availability')
  .withDescription('Check calendar availability for booking')
  .withParameters({
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date' },
      duration: { type: 'number' }
    },
    required: ['date']
  })
  .onCall(async (params, ctx) => {
    const slots = await calendarService.getAvailableSlots(params.date);
    return {
      success: true,
      data: slots,
      response: {
        speak: `I see you have slots available at ${slots.join(', ')}. Which time works for you?`
      }
    };
  })
  .onSMS(async (params, ctx) => {
    const slots = await calendarService.getAvailableSlots(params.date);
    return {
      success: true,
      data: slots,
      response: {
        message: `Available times for ${params.date}:\n${slots.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nReply with a number.`
      }
    };
  })
  .onEmail(async (params, ctx) => {
    const slots = await calendarService.getAvailableSlots(params.date);
    return {
      success: true,
      data: slots,
      response: {
        html: `<h3>Available Times</h3><ul>${slots.map(s => `<li>${s}</li>`).join('')}</ul>`,
        message: `Available times: ${slots.join(', ')}`
      }
    };
  })
  .default(async (params, ctx) => {
    const slots = await calendarService.getAvailableSlots(params.date);
    return {
      success: true,
      data: slots,
      response: { message: `Available: ${slots.join(', ')}` }
    };
  })
  .build();
```

### 5. **Service Layer Pattern**

**Purpose:** Separate business logic from resource/provider concerns

```typescript
// Service handles business logic and orchestrates providers
class CallService {
  constructor(
    private twilioProvider: TwilioProvider,
    private aiProvider: OpenAIProvider,
    private toolExecutor: ToolExecutionService,
    private conversationService: ConversationService
  ) {}

  async initiateCall(options: MakeCallOptions): Promise<CallSession> {
    // 1. Start conversation context
    const conversation = await this.conversationService.create({
      channel: 'call',
      metadata: options.metadata
    });

    // 2. Prepare AI with available tools
    const availableTools = this.toolExecutor.getToolsForChannel('call');
    const aiConfig = this.aiProvider.prepareConfig({
      tools: availableTools,
      context: conversation
    });

    // 3. Make the call via provider
    const callSid = await this.twilioProvider.makeCall(options.to, {
      aiConfig,
      webhookUrl: `/webhooks/calls/${conversation.id}`
    });

    // 4. Track the session
    return {
      id: callSid,
      conversationId: conversation.id,
      to: options.to,
      status: 'initiated',
      startedAt: new Date()
    };
  }

  async handleIncomingVoice(callSid: string, userSpeech: string): Promise<string> {
    // 1. Get conversation context
    const conversation = await this.conversationService.getByCallId(callSid);

    // 2. Process with AI
    const aiResponse = await this.aiProvider.chat({
      messages: conversation.messages,
      newMessage: userSpeech,
      tools: this.toolExecutor.getToolsForChannel('call')
    });

    // 3. If AI wants to use a tool, execute it
    if (aiResponse.toolCall) {
      const toolResult = await this.toolExecutor.execute(
        aiResponse.toolCall.name,
        aiResponse.toolCall.parameters,
        {
          channel: 'call',
          conversationId: conversation.id,
          callSid
        }
      );

      // 4. Feed tool result back to AI
      const finalResponse = await this.aiProvider.chat({
        messages: [...conversation.messages, aiResponse, toolResult],
        tools: this.toolExecutor.getToolsForChannel('call')
      });

      return finalResponse.response.speak || finalResponse.content;
    }

    return aiResponse.response.speak || aiResponse.content;
  }
}
```

### 6. **Standardized Tool Library + Custom Tools**

**Purpose:** Provide common tools out-of-the-box, allow customization

```typescript
// Standardized tools
export const Tools = {
  calendar(config: CalendarToolConfig): ITool {
    return new ToolBuilder()
      .withName('calendar')
      .withDescription('Check calendar availability and book appointments')
      .withParameters({
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['check', 'book', 'cancel'] },
          date: { type: 'string' },
          time: { type: 'string' }
        }
      })
      .onCall(async (params, ctx) => {
        // Call-specific implementation
      })
      .onSMS(async (params, ctx) => {
        // SMS-specific implementation
      })
      .default(async (params, ctx) => {
        // Fallback
      })
      .build();
  },

  booking(config: BookingToolConfig): ITool {
    // Similar structure
  },

  crm(config: CRMToolConfig): ITool {
    // Similar structure
  },

  // Custom tool wrapper
  custom(toolConfig: CustomToolConfig): ITool {
    return new ToolBuilder()
      .withName(toolConfig.name)
      .withDescription(toolConfig.description)
      .withParameters(toolConfig.parameters)
      .default(toolConfig.handler)
      .build();
  }
};

// Usage
const client = new AIReceptionist({
  agent: { /* ... */ },
  tools: [
    Tools.calendar({ provider: 'google', apiKey: '...' }),
    Tools.booking({ url: 'https://...' }),
    Tools.custom({
      name: 'inventory-check',
      description: 'Check product inventory',
      parameters: { /* ... */ },
      handler: async (params, ctx) => {
        // User's custom logic
      }
    })
  ]
});
```

---

## Implementation Details

### Folder Structure

```
ai-receptionist/
  src/
    core/
      client.ts              # Main AIReceptionist client
      config.types.ts        # Configuration interfaces
      config.validator.ts    # Validation logic

    agent/
      agent.ts               # AI Agent core entity
      personality.ts         # Personality configuration
      context.ts             # Conversation context management

    resources/               # Channel-specific APIs (user-facing)
      calls.resource.ts
      sms.resource.ts
      email.resource.ts
      base.resource.ts       # Shared resource logic

    services/                # Business logic layer
      call.service.ts        # Call-specific business logic
      conversation.service.ts # Conversation management
      tool-execution.service.ts # Tool registry and execution
      context.service.ts     # Context/memory management

    providers/               # External API adapters (renamed from orchestrators)
      communication/
        twilio.provider.ts
        sendgrid.provider.ts
      ai/
        openai.provider.ts
        anthropic.provider.ts
      calendar/
        google-calendar.provider.ts
      base.provider.ts       # Provider interface

    tools/
      registry.ts            # Tool registry
      builder.ts             # Tool builder
      standard/              # Standard tool library
        calendar.tool.ts
        booking.tool.ts
        crm.tool.ts
      types.ts               # Tool interfaces

    types/
      index.ts               # All TypeScript types

    index.ts                 # Public API exports
```

### Key Interfaces

```typescript
// Agent Configuration
interface AgentConfig {
  name: string;
  role: string;
  personality?: string;
  systemPrompt?: string;
  instructions?: string;
  voice?: VoiceConfig;      // For calls
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
}

// Tool Configuration
interface ToolConfig {
  // Standard tools (with sensible defaults)
  defaults?: ('calendar' | 'booking' | 'crm')[];

  // Custom tools
  custom?: ITool[];

  // Configure standard tools
  calendar?: CalendarToolConfig;
  booking?: BookingToolConfig;
  crm?: CRMToolConfig;
}

// Main SDK Configuration
interface AIReceptionistConfig {
  // AI Agent (primary entity)
  agent: AgentConfig;

  // AI Model
  model: {
    provider: 'openai' | 'anthropic' | 'google';
    apiKey: string;
    model: string;
    temperature?: number;
  };

  // Tools (hybrid: defaults + custom)
  tools?: ToolConfig;

  // Providers (infrastructure)
  providers: {
    communication?: {
      twilio?: TwilioConfig;
      sendgrid?: SendGridConfig;
    };
    calendar?: {
      google?: GoogleCalendarConfig;
    };
    // Allow custom providers
    custom?: IProvider[];
  };

  // Optional features
  notifications?: NotificationConfig;
  analytics?: AnalyticsConfig;
  debug?: boolean;
}

// Execution Context (passed to tool handlers)
interface ExecutionContext {
  channel: 'call' | 'sms' | 'email';
  conversationId: string;
  callSid?: string;
  messageSid?: string;
  metadata?: Record<string, any>;
  agent: AgentConfig;
}
```

---

## Migration Path

### Phase 1: Rename and Reorganize (Non-Breaking)

**Goal:** Rename orchestrators to providers, introduce service layer

**Changes:**
1. Create `src/providers/` folder
2. Copy orchestrators to providers with new names
3. Create `src/services/` folder
4. Implement basic service classes
5. Keep old orchestrator exports for backwards compatibility

**Timeline:** 1-2 days

### Phase 2: Introduce Tool System (Additive)

**Goal:** Add tool registry without breaking existing functionality

**Changes:**
1. Create `src/tools/` folder structure
2. Implement `ToolRegistry` and `ToolBuilder`
3. Create standard tools (calendar, booking, crm)
4. Add `tools` option to config (optional, defaults to empty)
5. Integrate tool execution in `ConversationService`

**Timeline:** 3-5 days

### Phase 3: Refactor to Agent-Centric (Breaking but with Migration Guide)

**Goal:** Make agent the primary entity

**Changes:**
1. Update `AIReceptionist` client to emphasize agent config
2. Refactor resources to use services
3. Update examples and documentation
4. Provide migration guide for existing users

**Timeline:** 2-3 days

### Phase 4: Advanced Features (Future)

**Goal:** Add advanced capabilities

**Features:**
- Multi-agent support (multiple AIs in one client)
- Tool marketplace/plugins
- Advanced conversation memory
- Real-time tool execution monitoring
- Webhook management for tool callbacks

**Timeline:** Ongoing

---

## Code Examples

### Example 1: Basic Setup (Proposed API)

```typescript
import { AIReceptionist, Tools } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({
  // AI Agent configuration
  agent: {
    name: 'Sarah',
    role: 'Sales Representative',
    personality: 'friendly and professional',
    instructions: 'Help customers book appointments and answer product questions.',
    tone: 'friendly'
  },

  // AI Model
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    temperature: 0.7
  },

  // Tools (hybrid approach)
  tools: {
    // Use standard tools with defaults
    defaults: ['calendar', 'booking'],

    // Configure standard tools
    calendar: {
      provider: 'google',
      apiKey: process.env.GOOGLE_API_KEY!,
      calendarId: 'primary'
    },

    booking: {
      apiUrl: 'https://api.bookingservice.com',
      apiKey: process.env.BOOKING_API_KEY!
    },

    // Add custom tools
    custom: [
      Tools.custom({
        name: 'check_inventory',
        description: 'Check product inventory levels',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            location: { type: 'string' }
          },
          required: ['productId']
        },
        handler: async (params, ctx) => {
          const inventory = await inventoryDB.check(params.productId);

          return {
            success: true,
            data: inventory,
            response: {
              speak: `We have ${inventory.quantity} units in stock at ${params.location || 'main warehouse'}.`,
              message: `Stock: ${inventory.quantity} units`,
              html: `<p><strong>${inventory.product}</strong>: ${inventory.quantity} units available</p>`
            }
          };
        }
      })
    ]
  },

  // Providers (infrastructure)
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      }
    }
  },

  debug: true
});

// Use the agent across different channels
await client.calls.make({ to: '+1234567890' });
await client.sms.send({ to: '+1234567890', body: 'Hello from Sarah!' });
```

### Example 2: Channel-Specific Tool Behavior

```typescript
// Define a tool with different behavior per channel
const appointmentTool = new ToolBuilder()
  .withName('book_appointment')
  .withDescription('Book an appointment with the user')
  .withParameters({
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date' },
      time: { type: 'string', format: 'time' },
      service: { type: 'string' }
    },
    required: ['date', 'time', 'service']
  })

  // Voice call: Conversational confirmation
  .onCall(async (params, ctx) => {
    const booking = await bookingService.create(params);
    return {
      success: true,
      data: booking,
      response: {
        speak: `Perfect! I've booked your ${params.service} for ${params.date} at ${params.time}. You'll receive a confirmation text shortly. Is there anything else I can help you with?`
      }
    };
  })

  // SMS: Brief confirmation with details
  .onSMS(async (params, ctx) => {
    const booking = await bookingService.create(params);
    return {
      success: true,
      data: booking,
      response: {
        message: `✓ Appointment booked!\n${params.service}\n${params.date} at ${params.time}\nConfirmation: ${booking.id}\nReply CANCEL to cancel.`
      }
    };
  })

  // Email: Formal confirmation with calendar invite
  .onEmail(async (params, ctx) => {
    const booking = await bookingService.create(params);
    const calendarInvite = await createICalInvite(booking);

    return {
      success: true,
      data: booking,
      response: {
        html: `
          <h2>Appointment Confirmation</h2>
          <p>Dear Customer,</p>
          <p>Your appointment has been confirmed:</p>
          <ul>
            <li><strong>Service:</strong> ${params.service}</li>
            <li><strong>Date:</strong> ${params.date}</li>
            <li><strong>Time:</strong> ${params.time}</li>
            <li><strong>Confirmation #:</strong> ${booking.id}</li>
          </ul>
          <p>Please find the calendar invite attached.</p>
          <p>Best regards,<br>Sarah</p>
        `,
        attachments: [calendarInvite]
      }
    };
  })

  // Fallback for any other channel
  .default(async (params, ctx) => {
    const booking = await bookingService.create(params);
    return {
      success: true,
      data: booking,
      response: {
        message: `Appointment booked: ${params.service} on ${params.date} at ${params.time}`
      }
    };
  })
  .build();
```

### Example 3: Runtime Tool Management

```typescript
import { AIReceptionist, Tools, ToolRegistry } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({ /* config */ });

// Access tool registry
const toolRegistry = client.getToolRegistry();

// Add tool at runtime
const urgentTool = Tools.custom({
  name: 'escalate_to_human',
  description: 'Escalate conversation to a human agent',
  parameters: {
    type: 'object',
    properties: {
      reason: { type: 'string' }
    }
  },
  handler: async (params, ctx) => {
    await notifyHumanAgent(ctx.conversationId, params.reason);
    return {
      success: true,
      response: {
        speak: 'Let me connect you with one of our team members who can better assist you.',
        message: 'Transferring to human agent...'
      }
    };
  }
});

toolRegistry.register(urgentTool);

// Remove tool at runtime
toolRegistry.unregister('check_inventory');

// List available tools for a specific channel
const callTools = toolRegistry.listAvailable('call');
console.log('Available tools for calls:', callTools.map(t => t.name));
```

### Example 4: Service Layer Usage (Internal)

```typescript
// Inside CallsResource
export class CallsResource {
  constructor(
    private callService: CallService,
    private config: CallsResourceConfig
  ) {}

  async make(options: MakeCallOptions): Promise<CallSession> {
    // Resource just delegates to service
    return this.callService.initiateCall(options);
  }
}

// CallService handles the complexity
export class CallService {
  constructor(
    private twilioProvider: TwilioProvider,
    private aiProvider: OpenAIProvider,
    private toolExecutor: ToolExecutionService,
    private conversationService: ConversationService
  ) {}

  async initiateCall(options: MakeCallOptions): Promise<CallSession> {
    // 1. Setup conversation context
    const conversation = await this.conversationService.create({
      channel: 'call',
      agentConfig: this.aiProvider.agentConfig,
      metadata: options.metadata
    });

    // 2. Get tools available for this call
    const tools = this.toolExecutor.getToolsForChannel('call');

    // 3. Configure AI with tools
    const aiConfig = this.aiProvider.prepareConfig({
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      })),
      conversationId: conversation.id
    });

    // 4. Initiate call via provider
    const callSid = await this.twilioProvider.makeCall(options.to, {
      aiConfig,
      webhookUrl: `/webhooks/calls/${conversation.id}`,
      statusCallback: `/webhooks/call-status/${conversation.id}`
    });

    // 5. Return session info
    return {
      id: callSid,
      conversationId: conversation.id,
      to: options.to,
      status: 'initiated',
      startedAt: new Date()
    };
  }

  async handleWebhook(callSid: string, event: CallEvent): Promise<WebhookResponse> {
    if (event.type === 'speech') {
      // User spoke during call
      const response = await this.handleUserSpeech(callSid, event.transcription);
      return { twiml: this.generateTwiML(response) };
    }

    if (event.type === 'dtmf') {
      // User pressed a key
      const response = await this.handleUserInput(callSid, event.digits);
      return { twiml: this.generateTwiML(response) };
    }

    return { twiml: '<Response></Response>' };
  }

  private async handleUserSpeech(callSid: string, speech: string): Promise<string> {
    // Get conversation
    const conversation = await this.conversationService.getByCallId(callSid);

    // Process with AI
    const aiResponse = await this.aiProvider.chat({
      conversationId: conversation.id,
      userMessage: speech,
      availableTools: this.toolExecutor.getToolsForChannel('call')
    });

    // Check if AI wants to use a tool
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      // Execute tools
      const toolResults = await Promise.all(
        aiResponse.toolCalls.map(tc =>
          this.toolExecutor.execute(tc.name, tc.parameters, {
            channel: 'call',
            conversationId: conversation.id,
            callSid
          })
        )
      );

      // Feed results back to AI
      const finalResponse = await this.aiProvider.chat({
        conversationId: conversation.id,
        toolResults
      });

      return finalResponse.content;
    }

    return aiResponse.content;
  }
}
```

### Example 5: Provider Interface

```typescript
// Base provider interface
export interface IProvider {
  readonly name: string;
  readonly type: 'communication' | 'ai' | 'calendar' | 'crm' | 'custom';
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// Communication provider (Twilio)
export class TwilioProvider implements IProvider {
  readonly name = 'twilio';
  readonly type = 'communication' as const;

  private client: Twilio.Client | null = null;

  constructor(private config: TwilioConfig) {}

  async initialize(): Promise<void> {
    this.client = new Twilio.Client(
      this.config.accountSid,
      this.config.authToken
    );
  }

  async makeCall(to: string, options: CallOptions): Promise<string> {
    if (!this.client) throw new Error('Provider not initialized');

    const call = await this.client.calls.create({
      to,
      from: this.config.phoneNumber,
      url: options.webhookUrl,
      statusCallback: options.statusCallback,
      statusCallbackMethod: 'POST'
    });

    return call.sid;
  }

  async sendSMS(to: string, body: string): Promise<string> {
    if (!this.client) throw new Error('Provider not initialized');

    const message = await this.client.messages.create({
      to,
      from: this.config.phoneNumber,
      body
    });

    return message.sid;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
  }
}

// AI provider (OpenAI)
export class OpenAIProvider implements IProvider {
  readonly name = 'openai';
  readonly type = 'ai' as const;

  private client: OpenAI | null = null;
  private agentConfig: AgentConfig;

  constructor(
    private config: OpenAIConfig,
    agentConfig: AgentConfig
  ) {
    this.agentConfig = agentConfig;
  }

  async initialize(): Promise<void> {
    this.client = new OpenAI({
      apiKey: this.config.apiKey
    });
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    if (!this.client) throw new Error('Provider not initialized');

    const messages = this.buildMessages(options);
    const tools = this.buildToolDefinitions(options.availableTools);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      temperature: this.config.temperature || 0.7
    });

    return this.parseResponse(response);
  }

  private buildMessages(options: ChatOptions): ChatMessage[] {
    const systemMessage = {
      role: 'system' as const,
      content: this.agentConfig.systemPrompt ||
        `You are ${this.agentConfig.name}, a ${this.agentConfig.role}. ${this.agentConfig.personality}`
    };

    return [systemMessage, ...options.conversationHistory, {
      role: 'user' as const,
      content: options.userMessage
    }];
  }

  private buildToolDefinitions(tools: ITool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  private parseResponse(response: ChatCompletion): AIResponse {
    const message = response.choices[0].message;

    if (message.tool_calls) {
      return {
        content: message.content || '',
        toolCalls: message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments)
        }))
      };
    }

    return {
      content: message.content || ''
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
  }
}
```

---

## Open Questions & Decisions

### 1. Multi-Agent Support? ✅ **DECIDED**

**Decision:** NO multi-agent support within a single `AIReceptionist` instance. Each instance = one agent.

**Rationale:** Keep SDK simple and focused. If users need multiple agents, they create multiple instances.

**Implementation:** Use **Clone Pattern** for easy multi-agent setup:

```typescript
// Base configuration
const baseConfig = {
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
};

// Create Sarah (Sales Agent)
const sarah = new AIReceptionist({
  ...baseConfig,
  agent: {
    name: 'Sarah',
    role: 'Sales Representative',
    personality: 'friendly and enthusiastic'
  },
  tools: {
    defaults: ['calendar', 'booking', 'crm']
  }
});

// Clone for Bob (Support Agent) - shares providers but different agent config
const bob = sarah.clone({
  agent: {
    name: 'Bob',
    role: 'Support Specialist',
    personality: 'patient and helpful'
  },
  tools: {
    defaults: ['ticketing', 'knowledgeBase']
  }
});

// Each instance is independent
await sarah.calls.make({ to: '+123' }); // Sarah handles this call
await bob.calls.make({ to: '+456' });   // Bob handles this call
```

**Clone Pattern Benefits:**
- Reuses providers (Twilio, OpenAI) for efficiency
- Each agent has own tool registry and personality
- Simple API - no complex routing logic
- Clear separation of concerns

**Implementation Details:**
```typescript
export class AIReceptionist {
  // ... existing code ...

  /**
   * Clone this instance with different agent/tool configuration
   * Providers are shared for efficiency
   */
  clone(overrides: Partial<AIReceptionistConfig>): AIReceptionist {
    const clonedConfig = {
      ...this.config,
      ...overrides,
      // Merge agent config
      agent: {
        ...this.config.agent,
        ...overrides.agent
      },
      // Merge tool config
      tools: overrides.tools || this.config.tools,
      // Reuse providers (shared resources)
      providers: this.config.providers
    };

    return new AIReceptionist(clonedConfig);
  }
}
```

### 2. Tool Marketplace/Plugins? 🤔 **MAYBE**

**Decision:** Consider for future, not v1 priority

**Rationale:**
- Focus on core SDK first
- Tool system is extensible enough for custom tools
- Marketplace adds complexity (versioning, compatibility, security)

**If implemented later:**
- Separate npm packages: `@loctelli/tool-{name}`
- Standard interface that tools must implement
- Verification/security review process

**For now:** Users can create custom tools easily with `Tools.custom()`

### 3. Conversation Memory/Context? ✅ **DECIDED**

**Decision:** Configurable storage adapter with in-memory default

**Rationale:**
- Default to simple (in-memory) for quick setup
- Allow users to provide persistent storage for production
- Follows SDK best practice: sensible defaults + flexibility

**Implementation:**

```typescript
// Storage adapter interface
export interface IConversationStore {
  save(conversation: Conversation): Promise<void>;
  get(conversationId: string): Promise<Conversation | null>;
  getByCallId(callSid: string): Promise<Conversation | null>;
  getByMessageId(messageSid: string): Promise<Conversation | null>;
  update(conversationId: string, updates: Partial<Conversation>): Promise<void>;
  delete(conversationId: string): Promise<void>;
  list(filters?: ConversationFilters): Promise<Conversation[]>;
}

// Default: In-memory store
export class InMemoryConversationStore implements IConversationStore {
  private conversations = new Map<string, Conversation>();

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
  }

  async get(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  // ... other methods
}

// User can provide custom store
export class DatabaseConversationStore implements IConversationStore {
  constructor(private db: Database) {}

  async save(conversation: Conversation): Promise<void> {
    await this.db.conversations.create(conversation);
  }

  async get(conversationId: string): Promise<Conversation | null> {
    return this.db.conversations.findById(conversationId);
  }

  // ... other methods
}

// SDK Configuration
interface AIReceptionistConfig {
  // ... other config

  // Optional: provide custom conversation store
  conversationStore?: IConversationStore;
}

// Usage
const client = new AIReceptionist({
  agent: { /* ... */ },
  // Default: in-memory (good for dev/testing)
  // conversationStore: new InMemoryConversationStore()
});

// Production: use database
const productionClient = new AIReceptionist({
  agent: { /* ... */ },
  conversationStore: new DatabaseConversationStore(db)
});
```

**Benefits:**
- **Development**: Fast startup with in-memory store
- **Production**: Persistent storage with custom adapter
- **Testing**: Easy to mock for unit tests
- **Flexibility**: Users can implement Redis, MongoDB, PostgreSQL, etc.

### 4. Real-time Tool Monitoring? 🤔 **MAYBE**

**Decision:** Consider for v1, depends on complexity

**Rationale:**
- Useful for debugging and observability
- Event-driven architecture adds complexity
- Could be added incrementally

**Simplified approach for v1:**
```typescript
// Simple callback-based monitoring
const client = new AIReceptionist({
  agent: { /* ... */ },
  onToolExecute: (event: ToolExecutionEvent) => {
    console.log(`Tool executed: ${event.toolName} in ${event.duration}ms`);
  },
  onToolError: (event: ToolErrorEvent) => {
    console.error(`Tool failed: ${event.toolName}`, event.error);
  }
});
```

**Full event-driven architecture (v2+):**
```typescript
client.on('tool:execute', handler);
client.on('tool:error', handler);
client.on('conversation:start', handler);
client.on('conversation:end', handler);
```

### 5. Webhooks for Long-Running Tools? 📋 **TODO**

**Status:** Needs more discussion

**Questions to answer:**
- How do we handle tool execution that takes >30 seconds?
- Should AI tell user "I'm processing this" then callback?
- How do webhook URLs get configured?
- Security for webhook endpoints?

**Potential approach:**
```typescript
const emailTool = new ToolBuilder()
  .withName('send_bulk_email')
  .async(true) // Mark as async
  .default(async (params, ctx) => {
    // Start async job
    const jobId = await emailService.sendAsync(params);

    // Return immediately with pending status
    return {
      success: true,
      pending: true,
      jobId,
      response: {
        speak: "I'm sending those emails now. I'll let you know when it's done.",
        message: "Sending emails... You'll be notified when complete."
      }
    };
  })
  .onComplete(async (jobId, result, ctx) => {
    // Callback when job completes
    // How does SDK know to call this? Need webhook infrastructure
  })
  .build();
```

**Deferred to later:** Complex feature requiring webhook infrastructure

### 6. Tool Permissions/Authorization? 📋 **TODO**

**Status:** Needs more discussion

**Questions to answer:**
- Should SDK handle auth, or leave to tool implementations?
- How do we identify users (authenticated vs anonymous)?
- Role-based access control (RBAC)?

**Option A: Leave to user (simpler)**
```typescript
const calendarTool = Tools.custom({
  name: 'book_appointment',
  handler: async (params, ctx) => {
    // User implements their own auth check
    if (!ctx.metadata?.userId) {
      throw new Error('Authentication required');
    }

    // Check permissions
    const user = await getUserById(ctx.metadata.userId);
    if (!user.canBook) {
      throw new Error('Permission denied');
    }

    // Proceed with booking
  }
});
```

**Option B: Built-in auth framework (complex)**
```typescript
const calendarTool = Tools.calendar({
  permissions: {
    check: 'public',      // Anyone can check
    book: 'authenticated', // Must be logged in
    cancel: 'admin'       // Admin only
  },
  authorize: async (action, ctx) => {
    // SDK calls this before executing tool
    // Returns true/false
  }
});
```

**Decision:** Lean towards Option A for v1 (simpler, more flexible)

---

## Summary & Next Steps

### What We've Designed

1. **Agent-centric architecture** - AI agent is the primary entity
2. **Provider pattern** - Clean abstraction for external APIs
3. **Tool registry system** - Flexible, extensible tool management
4. **Channel-specific handlers** - Tools behave differently per channel
5. **Service layer** - Separation of concerns for business logic
6. **Hybrid configuration** - Sensible defaults + full customization

### Architectural Benefits

- **Scalability**: Easy to add new channels, tools, providers
- **Maintainability**: Clear separation of concerns
- **Testability**: Each layer can be tested independently
- **Extensibility**: Users can add custom tools and providers
- **Developer Experience**: Intuitive API with great TypeScript support

### Implementation Priority

**Phase 1 (Foundation):**
1. Rename orchestrators → providers
2. Introduce service layer
3. Basic tool registry

**Phase 2 (Core Features):**
1. Tool builder pattern
2. Standard tools (calendar, booking, crm)
3. Channel-specific handlers

**Phase 3 (Polish):**
1. Update documentation
2. Migration guide
3. Examples and tutorials

**Phase 4 (Advanced):**
1. Multi-agent support (if needed)
2. Tool marketplace (if needed)
3. Advanced observability

### Questions for You

1. **Timeline**: What's your target timeline for Phase 1?
2. **Breaking Changes**: Are you okay with breaking changes for v2.0, or need backwards compatibility?
3. **Open Questions**: Which of the open questions above are important for v1?
4. **Priorities**: What features are must-have vs nice-to-have?

Let's discuss these points and I can help you start implementing! 🚀
