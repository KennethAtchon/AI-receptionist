# AI Receptionist SDK - Manual Testing Overview

This document outlines the manual testing journey for developers using the AI Receptionist SDK. Testing follows the natural developer workflow from initialization through channel-specific communication.

---

## Testing Philosophy

The SDK follows an **agent-centric design** where one agent can communicate across multiple channels (voice, SMS, email, text). Our testing validates:

1. **Agent Creation & Configuration** - Six-pillar architecture setup
2. **Tool System** - Standard and custom tool registration
3. **Channel-Specific Communication** - Voice calls, SMS, email, and text
4. **Developer Experience** - Intuitive APIs, clear error messages, sensible defaults

---

## Test Priority Order

### Phase 1: Core Agent & Text Resource (Simplest Channel)
Start with the **Text Resource** as it has no external dependencies and tests core agent functionality.

### Phase 2: Tool System
Test tool registration, execution, and channel-specific handlers.

### Phase 3: Communication Channels
Test each channel with real providers: Calls (Twilio), SMS (Twilio), Email (SendGrid).

---

## 1. Agent Creation & Initialization

### Test 1.1: Full Manual Agent Configuration

**Objective**: Verify developers can create agents with complete six-pillar configuration.

**Test Steps**:
```typescript
import { AIReceptionist, AgentBuilder } from '@loctelli/ai-receptionist';

// Create agent with all six pillars explicitly configured
const client = new AIReceptionist({
  agent: {
    // Pillar 1: Identity
    identity: {
      name: 'Sarah',
      role: 'Sales Representative',
      title: 'Senior Sales Rep',
      organization: 'Acme Corp',
      backstory: 'Experienced sales professional with 5 years in B2B'
    },

    // Pillar 2: Personality
    personality: {
      traits: ['friendly', 'enthusiastic', 'professional'],
      communicationStyle: {
        primary: 'conversational',
        adaptive: true
      },
      tone: {
        formality: 'casual',
        warmth: 'high',
        assertiveness: 'medium'
      }
    },

    // Pillar 3: Knowledge
    knowledge: {
      domain: 'Sales and Customer Success',
      expertise: ['product demos', 'pricing', 'customer onboarding'],
      facts: [
        { key: 'product_name', value: 'Acme Platform' },
        { key: 'pricing_tiers', value: 'Starter ($99), Pro ($299), Enterprise (Custom)' }
      ]
    },

    // Pillar 4: Capabilities (tools added later)
    capabilities: {
      tools: [] // Will be registered separately
    },

    // Pillar 5: Memory
    memory: {
      shortTerm: {
        enabled: true,
        maxSize: 50
      },
      longTerm: {
        enabled: true,
        strategy: 'vector' // or 'simple'
      }
    },

    // Pillar 6: Goals
    goals: {
      primary: {
        description: 'Schedule product demos with qualified leads',
        successCriteria: {
          metric: 'demos_scheduled',
          target: 10
        }
      },
      secondary: [
        {
          description: 'Qualify leads based on budget and need',
          successCriteria: { metric: 'leads_qualified', target: 50 }
        }
      ]
    }
  },

  // AI Provider Configuration
  aiProvider: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview'
  }
});

await client.initialize();
```

**Expected Results**:
- ✅ Agent initializes successfully
- ✅ All six pillars are configured
- ✅ Agent logger shows initialization steps
- ✅ No errors or warnings

**Validation**:
```typescript
// Verify agent state
console.log(client.agent.identity.summary()); // "Sarah, Senior Sales Rep at Acme Corp"
console.log(client.agent.capabilities.count()); // 0 (no tools yet)
console.log(client.agent.memory.getStats()); // { shortTerm: {...}, longTerm: {...} }
```

---

### Test 1.2: Auto-Populate Agent from Description (AI-Assisted)

**Objective**: Verify developers can create agents with minimal configuration using AI auto-population.

**Feature**: SDK uses the configured AI provider to auto-generate agent configuration from a single description.

**Test Steps**:
```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

// Minimal configuration - let AI populate the rest
const client = new AIReceptionist({
  agent: {
    autoPopulate: true,
    description: `
      Create a friendly sales agent named Sarah who works for Acme Corp.
      She should help schedule product demos, answer pricing questions,
      and qualify leads. She should be enthusiastic but professional.
    `
  },

  aiProvider: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview'
  }
});

await client.initialize();
```

**Expected Results**:
- ✅ SDK calls AI provider to generate six-pillar configuration
- ✅ Agent is fully configured from description
- ✅ Console logs show "Auto-populating agent configuration..."
- ✅ Developer can inspect generated configuration

**Validation**:
```typescript
// Inspect auto-generated configuration
console.log(client.agent.identity); // { name: 'Sarah', role: 'Sales Rep', ... }
console.log(client.agent.personality.traits); // ['friendly', 'enthusiastic', ...]
console.log(client.agent.goals.primary); // { description: '...', ... }
```

**Documentation Check**:
- [ ] README explains auto-populate feature
- [ ] JSDoc on `autoPopulate` option is clear
- [ ] Example in `examples/` directory

---

### Test 1.3: Agent Builder Pattern

**Objective**: Verify fluent builder API for agent creation.

**Test Steps**:
```typescript
import { AgentBuilder } from '@loctelli/ai-receptionist';

const agent = new AgentBuilder()
  .withIdentity({ name: 'Sarah', role: 'Sales Rep' })
  .withPersonality({ traits: ['friendly', 'professional'] })
  .withKnowledge({ domain: 'Sales' })
  .withMemory({ shortTerm: { enabled: true } })
  .withGoal({
    description: 'Schedule demos',
    successCriteria: { metric: 'demos_scheduled', target: 10 }
  })
  .build();

const client = new AIReceptionist({
  agent: agent,
  aiProvider: { type: 'openai', apiKey: process.env.OPENAI_API_KEY }
});
```

**Expected Results**:
- ✅ Fluent API allows method chaining
- ✅ TypeScript autocomplete works for each method
- ✅ Agent is built correctly

---

## 2. Tool System Testing

### Test 2.1: Register Standard Tools

**Objective**: Verify developers can register pre-built tools.

**Test Steps**:
```typescript
import { AIReceptionist, StandardTools } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ },

  // Register standard tools
  tools: [
    StandardTools.calendarCheckAvailability({
      provider: 'google',
      credentials: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
      }
    }),

    StandardTools.calendarBookAppointment({
      provider: 'google',
      credentials: { /* same as above */ }
    }),

    StandardTools.crmLookupCustomer({
      provider: 'hubspot', // or 'salesforce'
      credentials: {
        apiKey: process.env.HUBSPOT_API_KEY
      }
    })
  ]
});

await client.initialize();
```

**Expected Results**:
- ✅ Tools are registered in ToolRegistry
- ✅ Tools are available to agent
- ✅ Credentials are validated on initialization

**Validation**:
```typescript
console.log(client.agent.capabilities.list());
// ['calendar_check_availability', 'calendar_book_appointment', 'crm_lookup_customer']

console.log(client.agent.capabilities.getToolsForChannel('call'));
// Returns tools available for voice calls
```

---

### Test 2.2: Create and Register Custom Tools

**Objective**: Verify developers can create custom tools with ToolBuilder.

**Test Steps**:
```typescript
import { ToolBuilder } from '@loctelli/ai-receptionist';

const checkInventoryTool = new ToolBuilder()
  .withName('check_inventory')
  .withDescription('Check product inventory levels')
  .withParameters({
    type: 'object',
    properties: {
      productId: {
        type: 'string',
        description: 'Product SKU or ID'
      }
    },
    required: ['productId']
  })
  .onCall(async (params, context) => {
    // Custom implementation
    const inventory = await yourDatabase.query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [params.productId]
    );

    return {
      success: true,
      response: {
        speak: `We have ${inventory.quantity} units in stock`,
        data: inventory
      }
    };
  })
  .forChannels(['call', 'sms', 'text']) // Available on these channels
  .build();

// Register custom tool
const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ },
  tools: [checkInventoryTool]
});
```

**Expected Results**:
- ✅ Custom tool is registered
- ✅ Tool executes correctly when called by agent
- ✅ Response formats correctly for each channel

---

### Test 2.3: Tool Execution & Monitoring

**Objective**: Verify tool execution works and can be monitored.

**Test Steps**:
```typescript
const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ },
  tools: [/* ... */],

  // Event hooks for monitoring
  onToolExecute: (event) => {
    console.log(`Tool executed: ${event.toolName}`);
    console.log(`Duration: ${event.duration}ms`);
    console.log(`Success: ${event.success}`);
  },

  onToolError: (event) => {
    console.error(`Tool error: ${event.toolName}`);
    console.error(`Error: ${event.error.message}`);
  }
});

// Test tool execution via text resource
const response = await client.text.send({
  message: 'Can you check availability for product ABC123?'
});
```

**Expected Results**:
- ✅ Agent decides to use tool based on user input
- ✅ `onToolExecute` callback fires
- ✅ Tool result is incorporated into response
- ✅ Response is coherent and uses tool data

---

## 3. Text Resource Testing (No External Dependencies)

### Test 3.1: Basic Text Interaction

**Objective**: Test simplest communication channel without external APIs.

**Test Steps**:
```typescript
const client = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    personality: { traits: ['friendly'] }
  },
  aiProvider: {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  }
});

await client.initialize();

// Send text message
const response = await client.text.send({
  message: 'Hi, I need information about your pricing'
});

console.log(response.content); // Agent's response
```

**Expected Results**:
- ✅ Agent processes message through six-pillar system
- ✅ Response reflects agent's identity and personality
- ✅ Memory stores conversation
- ✅ Goals are tracked (if relevant)

---

### Test 3.2: Multi-Turn Conversation

**Objective**: Verify memory and context across multiple messages.

**Test Steps**:
```typescript
// First message
const response1 = await client.text.send({
  message: 'Hi, I need information about your pricing',
  conversationId: 'test-conv-1' // Track conversation
});

// Second message - should remember context
const response2 = await client.text.send({
  message: 'What about the Pro plan?',
  conversationId: 'test-conv-1'
});

// Third message - test memory retrieval
const response3 = await client.text.send({
  message: 'Can you remind me what we discussed?',
  conversationId: 'test-conv-1'
});
```

**Expected Results**:
- ✅ Agent remembers previous messages
- ✅ Responses build on conversation context
- ✅ Memory pillar stores and retrieves correctly

---

## 4. Voice Call Testing (Twilio Integration)

### Test 4.1: Outbound Call

**Objective**: Test making outbound calls with full agent capabilities.

**Test Steps**:
```typescript
const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ },

  // Twilio provider configuration
  communicationProviders: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    }
  },

  tools: [
    StandardTools.calendarCheckAvailability({ /* ... */ }),
    StandardTools.calendarBookAppointment({ /* ... */ })
  ]
});

await client.initialize();

// Make outbound call
const callSession = await client.calls.make({
  to: '+1234567890',
  greeting: 'Hi, this is Sarah from Acme Corp. Do you have a moment to discuss our platform?'
});

console.log(callSession.id); // Twilio Call SID
console.log(callSession.status); // 'initiated'
```

**Expected Results**:
- ✅ Call is initiated via Twilio
- ✅ Greeting is spoken when call connects
- ✅ Agent responds to user speech (transcribed by Twilio)
- ✅ Tools are available during call (e.g., book appointment)

---

### Test 4.2: Inbound Call (Webhook)

**Objective**: Test handling inbound calls via Twilio webhook.

**Setup**:
1. Configure Twilio webhook URL: `https://yourdomain.com/webhooks/twilio/voice`
2. SDK should expose webhook handler

**Test Steps**:
```typescript
import express from 'express';

const app = express();
const client = new AIReceptionist({ /* ... */ });
await client.initialize();

// Register webhook handler
app.post('/webhooks/twilio/voice', express.urlencoded({ extended: false }),
  client.webhooks.twilio.handleIncomingCall
);

app.listen(3000);
```

**Manual Test**:
1. Call Twilio number from phone
2. Verify agent answers with greeting
3. Speak to agent and verify responses
4. Test tool usage (e.g., "Can you check my appointment availability?")

**Expected Results**:
- ✅ Agent answers call
- ✅ Speech is transcribed and processed
- ✅ Agent responds naturally
- ✅ Tools execute during conversation

---

## 5. SMS Testing (Twilio Integration)

### Test 5.1: Send SMS

**Objective**: Test sending SMS with agent.

**Test Steps**:
```typescript
const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ },
  communicationProviders: {
    twilio: { /* ... */ }
  }
});

await client.initialize();

const smsSession = await client.sms.send({
  to: '+1234567890',
  message: 'Hi! This is Sarah from Acme Corp. I wanted to follow up on your demo request.'
});

console.log(smsSession.id); // Twilio Message SID
console.log(smsSession.status); // 'sent'
```

**Expected Results**:
- ✅ SMS is sent via Twilio
- ✅ Message reflects agent personality
- ✅ Conversation is tracked

---

### Test 5.2: Receive SMS (Webhook)

**Objective**: Test handling inbound SMS.

**Test Steps**:
```typescript
app.post('/webhooks/twilio/sms', express.urlencoded({ extended: false }),
  client.webhooks.twilio.handleIncomingSMS
);
```

**Manual Test**:
1. Text Twilio number from phone
2. Verify agent responds
3. Test multi-turn conversation
4. Test tool usage if applicable

---

## 6. Email Testing (SendGrid Integration)

### Test 6.1: Send Email

**Objective**: Test sending emails with agent.

**Test Steps**:
```typescript
const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ },
  communicationProviders: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: 'sarah@acmecorp.com',
      fromName: 'Sarah - Acme Corp'
    }
  }
});

await client.initialize();

const emailSession = await client.email.send({
  to: 'customer@example.com',
  subject: 'Follow up on your demo request',
  message: 'Thank you for your interest in Acme Platform. When would be a good time for a demo?'
});
```

**Expected Results**:
- ✅ Email is sent via SendGrid
- ✅ Content reflects agent personality
- ✅ Conversation is tracked

---

## 7. Cross-Channel Testing

### Test 7.1: Same Agent, Multiple Channels

**Objective**: Verify one agent works across all channels with consistent personality.

**Test Steps**:
```typescript
const client = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah', role: 'Sales Rep' },
    personality: { traits: ['friendly', 'enthusiastic'] }
  },
  aiProvider: { /* ... */ },
  communicationProviders: {
    twilio: { /* ... */ },
    sendgrid: { /* ... */ }
  }
});

// Same agent, different channels
await client.calls.make({ to: '+123' });
await client.sms.send({ to: '+123', message: 'Follow up' });
await client.email.send({ to: 'user@example.com', subject: 'Demo' });
const textResponse = await client.text.send({ message: 'Hello' });
```

**Expected Results**:
- ✅ Agent maintains consistent personality across channels
- ✅ Memory is shared across channels (if same conversation)
- ✅ Tools work on appropriate channels

---

## 8. Error Handling & Edge Cases

### Test 8.1: Missing Credentials

**Test Steps**:
```typescript
// Attempt to use calls without Twilio credentials
const client = new AIReceptionist({
  agent: { /* ... */ },
  aiProvider: { /* ... */ }
  // No communicationProviders
});

await client.initialize();

try {
  await client.calls.make({ to: '+123' });
} catch (error) {
  console.log(error.message); // Should be clear error message
}
```

**Expected Results**:
- ✅ Clear error message: "Twilio provider not configured. Please provide Twilio credentials."
- ✅ Error is caught gracefully
- ✅ No crash or undefined behavior

---

### Test 8.2: Tool Execution Failure

**Test Steps**:
```typescript
const flakyTool = new ToolBuilder()
  .withName('flaky_api')
  .onCall(async () => {
    throw new Error('API is down');
  })
  .build();

const client = new AIReceptionist({
  agent: { /* ... */ },
  tools: [flakyTool],
  onToolError: (event) => {
    console.log('Tool error caught:', event.error);
  }
});

// Trigger tool
await client.text.send({
  message: 'Use the flaky API',
  conversationId: 'test'
});
```

**Expected Results**:
- ✅ Tool error is caught
- ✅ `onToolError` callback fires
- ✅ Agent gracefully handles error in response
- ✅ Conversation continues

---

## 9. Developer Experience Validation

### Checklist for Each Test

- [ ] **Clear Error Messages**: Errors are actionable and specific
- [ ] **TypeScript Autocomplete**: IDE suggestions work correctly
- [ ] **Documentation**: JSDoc comments are helpful
- [ ] **Examples**: Examples directory has working code for each feature
- [ ] **Performance**: Operations complete in reasonable time (<2s for most)
- [ ] **Logging**: Debug mode provides useful information

---

## 10. One Standard Tool Per Channel (Minimum Viable)

### Goal
Fully implement and test **one standard tool for each channel** to validate the complete developer journey.

### Recommended Tools by Channel

| Channel | Tool | Reason |
|---------|------|--------|
| **Text** | `crm_lookup_customer` | No external calls, can mock data easily |
| **SMS** | `send_confirmation_code` | Simple, low-cost SMS operation |
| **Call** | `calendar_check_availability` | Common use case, demonstrates voice interaction |
| **Email** | `send_follow_up_email` | Validates email formatting and templates |

### Test 10.1: CRM Lookup (Text Channel)

**Implementation**:
```typescript
StandardTools.crmLookupCustomer({
  provider: 'hubspot',
  credentials: {
    apiKey: process.env.HUBSPOT_API_KEY
  }
})
```

**Test**:
```typescript
const response = await client.text.send({
  message: 'Look up customer with email john@example.com'
});

// Agent should use tool and respond with customer info
```

**Validation**:
- [ ] Tool registers correctly
- [ ] Agent decides to use tool based on user input
- [ ] HubSpot API is called with correct parameters
- [ ] Response includes customer data
- [ ] Error handling works (e.g., customer not found)

---

### Test 10.2: Confirmation Code (SMS Channel)

**Implementation**:
```typescript
StandardTools.sendConfirmationCode({
  provider: 'twilio',
  credentials: { /* ... */ }
})
```

**Test**:
```typescript
await client.sms.send({
  to: '+1234567890',
  message: 'Send me a confirmation code'
});

// Agent should use tool and send SMS with code
```

**Validation**:
- [ ] Tool is available on SMS channel only
- [ ] Agent generates and sends code
- [ ] Code is stored for verification
- [ ] SMS is delivered

---

### Test 10.3: Calendar Availability (Call Channel)

**Implementation**:
```typescript
StandardTools.calendarCheckAvailability({
  provider: 'google',
  credentials: { /* ... */ }
})
```

**Test**:
```typescript
// During a voice call
// User says: "What times are available this week?"
// Agent should check calendar and respond verbally
```

**Validation**:
- [ ] Tool is available on call channel
- [ ] Google Calendar API is queried
- [ ] Agent speaks available times naturally
- [ ] Response is formatted for voice (not text)

---

### Test 10.4: Follow-Up Email (Email Channel)

**Implementation**:
```typescript
StandardTools.sendFollowUpEmail({
  provider: 'sendgrid',
  credentials: { /* ... */ },
  template: 'demo_followup'
})
```

**Test**:
```typescript
await client.email.send({
  to: 'customer@example.com',
  message: 'Send a follow-up about our demo'
});

// Agent should use template and personalize email
```

**Validation**:
- [ ] Tool is available on email channel
- [ ] Template is loaded and populated
- [ ] Email is sent via SendGrid
- [ ] Personalization works (name, details)

---

## Summary: Developer Journey Testing Path

1. **Install SDK** → Test npm package installation
2. **Initialize Client** → Test agent configuration (manual + auto-populate)
3. **Register Tools** → Test standard tools + custom tools
4. **Test Text Channel** → Simplest, no external dependencies
5. **Test SMS Channel** → Requires Twilio setup
6. **Test Call Channel** → Requires Twilio + webhook setup
7. **Test Email Channel** → Requires SendGrid setup
8. **Test Cross-Channel** → Same agent, multiple channels
9. **Monitor & Debug** → Test logging, error handling, callbacks
10. **Deploy** → Production readiness checklist

---

## Documentation Requirements

Before considering testing complete:

- [ ] README has quick start guide for each channel
- [ ] Examples directory has working code for:
  - [ ] Agent creation (manual + auto-populate)
  - [ ] Tool registration (standard + custom)
  - [ ] Text communication
  - [ ] SMS communication
  - [ ] Voice calls
  - [ ] Email communication
  - [ ] Cross-channel usage
- [ ] API reference is auto-generated from JSDoc
- [ ] Migration guide for breaking changes (if applicable)
- [ ] Architecture docs are up to date

---

## Next Steps

1. Implement Test 1.1 (Manual Agent Configuration)
2. Implement Test 1.2 (Auto-Populate Feature)
3. Build out one standard tool per channel (Test 10.1-10.4)
4. Create examples for each test scenario
5. Run full test suite and document results
