# AI Receptionist SDK - Vision & Goals

## Core Vision

The AI Receptionist SDK is designed to provide developers with a unified, multi-channel communication platform where AI autonomously handles interactions across different communication channels using a consistent tool-based architecture.

## Fundamental Concept

The SDK follows a **unified resource pattern** where each communication channel (text, voice, email, SMS) operates as a distinct resource that:

1. Maintains continuous communication sessions
2. Leverages the same underlying tool system
3. Executes actions autonomously on behalf of the user
4. Provides a plug-and-play developer experience

## The Text Resource Blueprint

The **Text Resource** serves as the foundational model for all other resources:

### Current Text Resource Capabilities
- Developers integrate it into chat applications with minimal configuration
- AI autonomously sends emails via tool calls
- AI handles phone calls on the user's behalf via tool calls
- AI sends and responds to SMS messages via tool calls
- Tools are pre-configured and ready to use

### What Makes It Special
The Text Resource is "truly for devs" because it:
- Abstracts complexity behind a simple interface
- Handles the entire communication lifecycle
- Provides built-in tools that work out of the box
- Requires minimal setup code

## Multi-Channel Architecture

### The Pattern: One Resource = One Communication Channel

Each resource follows the same architectural pattern but operates on a different communication medium:

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Receptionist SDK                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Text Resource│  │Voice Resource│  │Email Resource│ ...  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  Shared Tools   │                        │
│                   │  - Send Email   │                        │
│                   │  - Make Calls   │                        │
│                   │  - Send SMS     │                        │
│                   │  - Custom Tools │                        │
│                   └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Resource-Specific Implementations

### Voice Resource
**Primary Channel:** Phone calls (inbound/outbound)

**Behavior:**
- Maintains active voice conversations
- Uses tools to send emails while on the call
- Uses tools to send SMS while on the call
- Uses tools to make additional calls while on the call
- Keeps the conversation flowing naturally

**Example Use Case:**
> AI receives a call asking about appointment availability. While on the call, it:
> 1. Checks calendar (tool call)
> 2. Confirms appointment verbally
> 3. Sends confirmation email (tool call)
> 4. Sends reminder SMS (tool call)
> 5. Continues conversation naturally

### Email Resource
**Primary Channel:** Email (inbound/outbound)

**Behavior:**
- Manages email threads and responses
- Uses tools to make phone calls when needed
- Uses tools to send SMS notifications
- Uses tools to send follow-up emails
- Maintains email context and thread continuity

**Example Use Case:**
> AI receives an email requesting urgent support. It:
> 1. Analyzes the email content
> 2. Makes a phone call to the user (tool call)
> 3. Sends SMS update during resolution (tool call)
> 4. Sends follow-up email with resolution (tool call)

### SMS Resource
**Primary Channel:** SMS/Text messaging

**Behavior:**
- Handles SMS conversations
- Uses tools to send emails when detailed info is needed
- Uses tools to initiate phone calls for complex issues
- Uses tools to send additional SMS messages
- Keeps SMS conversations contextual

**Example Use Case:**
> AI receives SMS asking for invoice. It:
> 1. Retrieves invoice from system (tool call)
> 2. Sends invoice via email (tool call)
> 3. Confirms via SMS
> 4. Follows up if needed

### Text Resource
**Primary Channel:** Chat/Messaging platforms

**Behavior:**
- Maintains chat conversations
- Uses tools to send emails
- Uses tools to make phone calls
- Uses tools to send SMS
- Provides real-time interactive responses

## Key Design Principles

### 1. Channel Independence
Each resource operates independently but shares the same tool ecosystem. The communication channel changes, but the capabilities remain consistent.

### 2. Tool-Driven Actions
All cross-channel actions are executed via tool calls. This ensures:
- Consistency across resources
- Extensibility for custom tools
- Traceable action logs
- Testable behavior

### 3. Continuous Session Management
Each resource maintains its primary communication channel while executing tool-based actions in the background.

### 4. Developer Experience First
The SDK is designed to be:
- **Plug-and-play:** Minimal configuration required
- **Intuitive:** Follows predictable patterns
- **Powerful:** Rich tool ecosystem out of the box
- **Flexible:** Easy to extend with custom tools

## Developer Usage Pattern

### Simplified Integration Example

```typescript
import { AIReceptionist } from '@ai-receptionist/sdk';

const receptionist = AIReceptionist.builder()
  .withApiKey(process.env.API_KEY)
  .withTools([
    // Tools are pre-configured
    'email.send',
    'call.make',
    'sms.send',
    // + custom tools
  ])
  .build();

// Text Resource
await receptionist.text.start();

// Voice Resource
await receptionist.voice.start();

// Email Resource
await receptionist.email.start();

// SMS Resource
await receptionist.sms.start();
```

## Success Criteria

The SDK achieves its vision when:

1. **Developers can integrate any resource with < 10 lines of code**
2. **All resources share the same tool ecosystem seamlessly**
3. **AI can execute cross-channel actions autonomously**
4. **Each resource maintains its primary channel while using tools**
5. **The pattern is consistent across all communication channels**

## Long-term Vision

### Extensibility
- Custom resource types (e.g., social media, video calls)
- Custom tool development framework
- Plugin ecosystem for third-party integrations

### Intelligence
- Context sharing across resources
- Learning from interaction patterns
- Predictive action suggestions

### Enterprise Features
- Multi-tenant support
- Advanced analytics and reporting
- Compliance and audit trails
- Custom workflow builders

---

## Summary

**The goal is simple:** Create a unified SDK where every communication channel (text, voice, email, SMS) operates as a resource that maintains its primary channel while having full access to a shared tool ecosystem. Developers get a plug-and-play experience, and AI gets autonomous cross-channel capabilities.

**The pattern:** One resource type per communication channel, one shared tool system, infinite possibilities.



Key Findings:
Most Critical Problems:
Resources don't share tools - Your resources (calls, email, sms) bypass the tool system entirely and call processors directly. This is the opposite of your vision where "all resources share the same tool ecosystem."
Missing continuous session management - Resources are one-shot API calls, not active session managers. Your vision describes resources maintaining ongoing conversations while using tools in the background.
Only TextResource uses the Agent - The other resources bypass the Agent completely, making them "dumb pipes" instead of intelligent channel managers.
Dual execution paths - The same functionality exists in both resources AND tools, creating duplication and inconsistency.
No VoiceResource - You have CallsResource with just make() and end() methods, but no real voice conversation management.
The Core Issue: Your current architecture is:
User → Resource → Processor → Provider (bypasses Agent & Tools)
Your vision requires:
User → Resource → Agent → Tools → Provider
The Good News: All the building blocks exist (excellent tool system with channel handlers, agent architecture, providers). They're just not connected according to your vision. This is a significant architectural refactor, but the pieces are already there - they just need to be reconnected properly.