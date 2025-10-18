# Agent System Guide

Complete guide to defining AI agents, building their personality/identity, and adding tools.

---

## Table of Contents
1. [What is an Agent?](#what-is-an-agent)
2. [Agent Personality & Identity](#agent-personality--identity)
3. [System Prompt Building](#system-prompt-building)
4. [Adding Tools to Agents](#adding-tools-to-agents)
5. [Complete Examples](#complete-examples)

---

## What is an Agent?

In this SDK, **an agent is NOT a separate class**. Instead, each `AIReceptionist` instance **represents one AI agent**.

```typescript
// Each instance = one agent with its own personality and tools
const sarah = new AIReceptionist({ agent: { name: 'Sarah', ... } });
const bob = new AIReceptionist({ agent: { name: 'Bob', ... } });
```

### Agent Architecture

```
AIReceptionist Instance = Agent
├── AgentConfig (personality, role, voice)
├── AIProvider (OpenAI, OpenRouter, etc.)
├── ToolRegistry (available tools)
├── ConversationService (memory)
└── Resources (calls, sms, email)
```

---

## Agent Personality & Identity

Agents are defined through the `AgentConfig` interface:

```typescript
export interface AgentConfig {
  name: string;              // Agent's name (required)
  role: string;              // Agent's role (required)
  personality?: string;      // Personality traits
  systemPrompt?: string;     // Custom system prompt (overrides auto-generation)
  instructions?: string;     // Specific instructions/guidelines
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  voice?: VoiceConfig;       // Voice settings for calls
}
```

### Basic Agent Definition

```typescript
const agent = new AIReceptionist({
  agent: {
    name: 'Sarah',
    role: 'Sales Representative',
    personality: 'friendly and enthusiastic',
  },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' },
  providers: { /* ... */ }
});
```

### Advanced Agent Definition

```typescript
const agent = new AIReceptionist({
  agent: {
    name: 'Dr. Alex Thompson',
    role: 'Medical Appointment Scheduler',
    personality: 'professional, empathetic, and patient',
    instructions: `
      - Always verify patient information before booking
      - Explain all insurance requirements clearly
      - Offer alternative appointment times if preferred slot is unavailable
      - Follow HIPAA compliance guidelines
    `,
    tone: 'professional',
    voice: {
      provider: 'elevenlabs',
      voiceId: 'professional-female-1',
      stability: 0.75,
      similarityBoost: 0.8
    }
  },
  model: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7
  },
  providers: { /* ... */ }
});
```

---

## System Prompt Building

The SDK automatically builds a system prompt from your agent configuration. You have two options:

### Option 1: Auto-Generated System Prompt (Recommended)

The SDK automatically combines `name`, `role`, `personality`, and `instructions`:

```typescript
agent: {
  name: 'Sarah',
  role: 'Sales Representative',
  personality: 'friendly and enthusiastic',
  instructions: 'Always ask qualifying questions before scheduling demos'
}
```

**Generates this system prompt:**
```
You are Sarah, a Sales Representative. friendly and enthusiastic

Always ask qualifying questions before scheduling demos
```

**Implementation** ([openai.provider.ts:87](../src/providers/ai/openai.provider.ts#L87)):
```typescript
content: this.agentConfig.systemPrompt ||
  `You are ${this.agentConfig.name}, a ${this.agentConfig.role}. ${this.agentConfig.personality || ''}\n\n${this.agentConfig.instructions || ''}`
```

### Option 2: Custom System Prompt (Full Control)

Provide your own complete system prompt:

```typescript
agent: {
  name: 'Sarah',
  role: 'Sales Representative',
  systemPrompt: `You are Sarah, an expert sales representative at TechCorp.

IDENTITY:
- You have 10 years of experience in B2B SaaS sales
- You specialize in enterprise solutions
- Your communication style is consultative, not pushy

RESPONSIBILITIES:
- Qualify leads using BANT framework (Budget, Authority, Need, Timeline)
- Schedule product demonstrations
- Answer technical questions about our platform
- Escalate complex questions to senior sales engineers

GUIDELINES:
- Always be professional and courteous
- Listen actively to customer needs
- Ask open-ended questions
- Never make promises about features not yet released
- Follow up on all commitments

TONE:
- Professional but warm
- Confident but humble
- Solution-focused`
}
```

When `systemPrompt` is provided, it **completely overrides** the auto-generated prompt.

### System Prompt Best Practices

1. **Be Specific**: Define exactly who the agent is and what they do
2. **Set Boundaries**: Clearly state what the agent should/shouldn't do
3. **Include Context**: Provide relevant background and constraints
4. **Define Tone**: Specify communication style explicitly
5. **Add Examples**: Include example responses for complex scenarios

```typescript
systemPrompt: `You are Dr. Alex, a medical appointment scheduler.

CORE FUNCTION:
Schedule patient appointments while maintaining HIPAA compliance.

REQUIRED WORKFLOW:
1. Greet patient warmly and ask for their full name
2. Verify date of birth for security
3. Ask about appointment reason
4. Check available time slots
5. Confirm insurance information
6. Book appointment and send confirmation

CONSTRAINTS:
- NEVER discuss medical diagnoses or give medical advice
- NEVER share patient information with unauthorized parties
- ALWAYS verify identity before accessing records
- ALWAYS offer at least 2 appointment time options

ESCALATION TRIGGERS:
- Emergency medical situations → direct to 911
- Complex medical questions → transfer to nurse line
- Billing disputes → transfer to billing department

TONE: Professional, empathetic, and reassuring`
```

---

## Adding Tools to Agents

Tools are added during agent initialization. There are three ways to add tools:

### Method 1: Standard Tools (Pre-built)

Use built-in tools from the SDK:

```typescript
const agent = new AIReceptionist({
  agent: { name: 'Sarah', role: 'Scheduler' },
  model: { /* ... */ },
  tools: {
    defaults: ['calendar', 'booking', 'crm']  // Built-in tools
  },
  providers: { /* ... */ }
});
```

**Available standard tools:**
- `'calendar'` - Google Calendar integration
- `'booking'` - Appointment booking system
- `'crm'` - CRM integration (Salesforce, HubSpot, etc.)

### Method 2: Custom Tools (Inline)

Create custom tools using the `Tools` helper:

```typescript
import { Tools } from '@loctelli/ai-receptionist';

const agent = new AIReceptionist({
  agent: { name: 'Sarah', role: 'Sales Rep' },
  model: { /* ... */ },
  tools: {
    custom: [
      // Simple custom tool
      Tools.custom({
        name: 'check_inventory',
        description: 'Check product inventory levels',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product SKU or ID' },
            location: { type: 'string', description: 'Warehouse location' }
          },
          required: ['productId']
        },
        handler: async (params, context) => {
          // Your custom logic
          const stock = await checkInventoryAPI(params.productId, params.location);

          return {
            success: true,
            data: { stock },
            response: {
              speak: `We have ${stock} units in stock.`,
              message: `Stock: ${stock} units`,
              text: `Product ${params.productId}: ${stock} units available`
            }
          };
        }
      })
    ]
  },
  providers: { /* ... */ }
});
```

### Method 3: Advanced Tools with Channel-Specific Handlers

Use the `ToolBuilder` for tools that behave differently per channel:

```typescript
import { ToolBuilder } from '@loctelli/ai-receptionist';

const bookAppointmentTool = new ToolBuilder()
  .withName('book_appointment')
  .withDescription('Book an appointment with a customer')
  .withParameters({
    type: 'object',
    properties: {
      customerName: { type: 'string' },
      date: { type: 'string', description: 'ISO 8601 date' },
      time: { type: 'string', description: 'HH:MM format' },
      reason: { type: 'string' }
    },
    required: ['customerName', 'date', 'time']
  })
  // Handler for voice calls
  .onCall(async (params, context) => {
    const result = await bookAppointment(params);
    return {
      success: true,
      data: result,
      response: {
        speak: `Perfect! I've booked your appointment for ${params.date} at ${params.time}. You'll receive a confirmation call 24 hours before.`
      }
    };
  })
  // Handler for SMS
  .onSMS(async (params, context) => {
    const result = await bookAppointment(params);
    return {
      success: true,
      data: result,
      response: {
        message: `Appointment booked for ${params.date} at ${params.time}. Reply CANCEL to cancel.`
      }
    };
  })
  // Handler for email
  .onEmail(async (params, context) => {
    const result = await bookAppointment(params);
    return {
      success: true,
      data: result,
      response: {
        html: `<h2>Appointment Confirmed</h2>
               <p>Date: ${params.date}</p>
               <p>Time: ${params.time}</p>
               <p>Reason: ${params.reason}</p>
               <a href="https://example.com/cancel/${result.id}">Cancel Appointment</a>`,
        text: `Appointment confirmed for ${params.date} at ${params.time}`
      }
    };
  })
  // Fallback handler (required)
  .default(async (params, context) => {
    const result = await bookAppointment(params);
    return {
      success: true,
      data: result,
      response: {
        text: `Appointment booked for ${params.date} at ${params.time}`
      }
    };
  })
  .build();

const agent = new AIReceptionist({
  agent: { name: 'Sarah', role: 'Scheduler' },
  model: { /* ... */ },
  tools: {
    custom: [bookAppointmentTool]
  },
  providers: { /* ... */ }
});
```

### Method 4: Runtime Tool Registration

Add tools after initialization:

```typescript
const agent = new AIReceptionist({ /* ... */ });
await agent.initialize();

// Get the tool registry
const registry = agent.getToolRegistry();

// Add a new tool at runtime
registry.register(
  Tools.custom({
    name: 'send_urgent_alert',
    description: 'Send urgent alert to on-call team',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
      },
      required: ['message', 'severity']
    },
    handler: async (params, context) => {
      await sendAlert(params.message, params.severity);
      return {
        success: true,
        response: {
          speak: 'Alert sent to the on-call team.',
          message: 'Alert sent successfully.'
        }
      };
    }
  })
);

// Remove a tool
registry.unregister('old_tool_name');

// List all tools
const tools = registry.getAll();
console.log('Available tools:', tools.map(t => t.name));
```

---

## Complete Examples

### Example 1: Sales Agent with Custom Tools

```typescript
import { AIReceptionist, Tools } from '@loctelli/ai-receptionist';

const salesAgent = new AIReceptionist({
  agent: {
    name: 'Sarah Chen',
    role: 'Senior Sales Representative',
    personality: 'professional, consultative, and results-driven',
    instructions: `
      SALES PROCESS:
      1. Build rapport and understand customer needs
      2. Qualify using BANT framework
      3. Present relevant solutions
      4. Handle objections professionally
      5. Schedule next steps

      KEY RULES:
      - Never discount without manager approval
      - Always ask open-ended questions
      - Focus on value, not price
      - Follow up within 24 hours
    `,
    tone: 'professional'
  },

  model: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7
  },

  tools: {
    defaults: ['calendar', 'crm'],
    custom: [
      // Check product pricing
      Tools.custom({
        name: 'get_pricing',
        description: 'Get current pricing for a product or plan',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'number' },
            term: { type: 'string', enum: ['monthly', 'annual'] }
          },
          required: ['productId']
        },
        handler: async (params) => {
          const pricing = await getPricingAPI(params);
          return {
            success: true,
            data: pricing,
            response: {
              speak: `The ${params.term || 'monthly'} price is $${pricing.amount} for ${params.quantity || 1} licenses.`,
              message: `Price: $${pricing.amount}/${params.term || 'monthly'}`
            }
          };
        }
      }),

      // Generate quote
      Tools.custom({
        name: 'generate_quote',
        description: 'Generate a formal price quote for customer',
        parameters: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'number' }
                }
              }
            }
          },
          required: ['customerId', 'items']
        },
        handler: async (params) => {
          const quote = await generateQuoteAPI(params);
          return {
            success: true,
            data: quote,
            response: {
              speak: `I've generated quote ${quote.id} for ${quote.total}. I'm sending it to your email now.`,
              message: `Quote ${quote.id}: $${quote.total}`,
              html: `<a href="${quote.url}">View Quote</a>`
            }
          };
        }
      })
    ]
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
        calendarId: 'sales@company.com'
      }
    }
  }
});

await salesAgent.initialize();

// Use the agent
await salesAgent.calls.make({ to: '+1234567890' });
```

### Example 2: Multi-Agent System with Clone Pattern

```typescript
// Create master agent
const masterAgent = new AIReceptionist({
  agent: {
    name: 'Master Agent',
    role: 'Base Configuration'
  },
  model: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-3.5-sonnet'
  },
  providers: {
    communication: {
      twilio: { /* shared config */ }
    }
  }
});

await masterAgent.initialize();

// Clone for sales team
const salesAgent = masterAgent.clone({
  agent: {
    name: 'Sarah',
    role: 'Sales Representative',
    personality: 'enthusiastic and persuasive'
  },
  tools: {
    defaults: ['calendar', 'crm'],
    custom: [salesTools]
  }
});

// Clone for support team
const supportAgent = masterAgent.clone({
  agent: {
    name: 'Alex',
    role: 'Support Specialist',
    personality: 'patient and helpful'
  },
  tools: {
    defaults: ['ticketing'],
    custom: [supportTools]
  }
});

// Clone for different AI model
const experimentalAgent = masterAgent.clone({
  model: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'google/gemini-pro-1.5'  // Different model
  }
});

await salesAgent.initialize();
await supportAgent.initialize();
await experimentalAgent.initialize();
```

### Example 3: Medical Scheduler with HIPAA Compliance

```typescript
const medicalScheduler = new AIReceptionist({
  agent: {
    name: 'Dr. Assistant',
    role: 'Medical Appointment Scheduler',
    systemPrompt: `You are a HIPAA-compliant medical appointment scheduler.

IDENTITY & ROLE:
- You schedule appointments for Dr. Johnson's practice
- You verify patient identity before accessing records
- You follow strict medical privacy guidelines

REQUIRED WORKFLOW:
1. Greet patient professionally
2. Ask for full name and date of birth
3. Verify identity against records
4. Ask about appointment reason (general terms only)
5. Offer available time slots
6. Confirm insurance coverage
7. Book appointment and provide confirmation number

STRICT RULES - HIPAA COMPLIANCE:
- NEVER discuss medical conditions in detail
- NEVER share patient information
- NEVER give medical advice
- ALWAYS verify identity before booking
- ALWAYS use secure systems for data storage

EMERGENCY PROTOCOL:
- If patient describes emergency symptoms → Direct to 911 immediately
- If patient requests urgent care → Provide urgent care clinic info
- If patient is in crisis → Provide crisis hotline number

TONE: Professional, empathetic, reassuring, and respectful`
  },

  model: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.6  // Lower for more consistent, professional responses
  },

  tools: {
    defaults: ['calendar'],
    custom: [
      Tools.custom({
        name: 'verify_patient',
        description: 'Verify patient identity using name and date of birth',
        parameters: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            dateOfBirth: { type: 'string', description: 'YYYY-MM-DD format' }
          },
          required: ['fullName', 'dateOfBirth']
        },
        handler: async (params) => {
          const patient = await verifyPatientIdentity(params);
          if (patient) {
            return {
              success: true,
              data: { patientId: patient.id },
              response: {
                speak: 'Thank you for verifying your identity. How can I help you today?'
              }
            };
          } else {
            return {
              success: false,
              error: 'Patient not found',
              response: {
                speak: 'I could not verify your identity. Please ensure your name and date of birth are correct, or contact our office directly.'
              }
            };
          }
        }
      }),

      Tools.custom({
        name: 'book_medical_appointment',
        description: 'Book a medical appointment after verifying patient identity',
        parameters: {
          type: 'object',
          properties: {
            patientId: { type: 'string' },
            appointmentType: { type: 'string' },
            preferredDate: { type: 'string' },
            preferredTime: { type: 'string' }
          },
          required: ['patientId', 'appointmentType']
        },
        handler: async (params, context) => {
          const appointment = await bookMedicalAppointment(params);
          return {
            success: true,
            data: appointment,
            response: {
              speak: `Your appointment is confirmed for ${appointment.date} at ${appointment.time}. Your confirmation number is ${appointment.confirmationCode}. Please arrive 15 minutes early.`,
              message: `Confirmed: ${appointment.date} ${appointment.time}. Confirmation: ${appointment.confirmationCode}`
            }
          };
        }
      })
    ]
  },

  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.MEDICAL_OFFICE_PHONE!
      }
    },
    calendar: {
      google: {
        apiKey: process.env.GOOGLE_API_KEY!,
        calendarId: 'appointments@drjohnson.com'
      }
    }
  }
});

await medicalScheduler.initialize();
```

---

## Summary

### Agent Definition
- **Agent = AIReceptionist instance** (not a separate class)
- Each instance has its own personality, tools, and configuration
- Use `clone()` to create multiple agents sharing infrastructure

### Personality & Identity
- Define via `AgentConfig`: `name`, `role`, `personality`, `instructions`, `tone`
- Auto-generated system prompt OR custom `systemPrompt`
- System prompt is sent as first message in every conversation

### Adding Tools
1. **Standard tools**: `tools.defaults: ['calendar', 'booking']`
2. **Custom tools**: `tools.custom: [Tools.custom({ ... })]`
3. **Advanced tools**: Use `ToolBuilder` for channel-specific handlers
4. **Runtime**: `agent.getToolRegistry().register(tool)`

### Best Practices
- Be specific in system prompts (who, what, how, constraints)
- Use `instructions` for guidelines and workflows
- Create channel-specific handlers when tool behavior differs
- Clone agents to create teams with shared providers
- Use lower temperature (0.6-0.7) for professional agents
- Always include error handling in custom tools

---

## See Also
- [README.md](../README.md) - Main SDK documentation
- [OPENROUTER.md](./OPENROUTER.md) - Dynamic model switching
- [examples/](../examples/) - Complete usage examples
