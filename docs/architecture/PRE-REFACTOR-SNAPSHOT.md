# Pre-Refactor Architecture Snapshot

**Date**: 2025-10-24
**Purpose**: Document the current architecture before services layer removal

## Current Architecture Overview

```
Client (AIReceptionist)
  ↓
Resources (User-facing APIs)
  ↓
Services (Orchestration Layer) ← TO BE REMOVED
  ↓
Processors (Administrative Wrappers)
  ↓
Providers (External API Integrations)
  ↓
External Services (Twilio, Google, OpenAI, etc.)
```

## Directory Structure (Before Refactor)

```
src/
  ├── agent/                    # Six-pillar agent system
  │   ├── core/
  │   │   ├── Agent.ts
  │   │   └── AgentBuilder.ts
  │   ├── memory/
  │   ├── identity/
  │   ├── personality/
  │   ├── knowledge/
  │   ├── goals/
  │   └── storage/
  ├── providers/                # External service integrations
  │   ├── ai/
  │   │   ├── openai.provider.ts
  │   │   └── openrouter.provider.ts
  │   ├── api/
  │   │   ├── twilio.provider.ts
  │   │   └── google.provider.ts
  │   ├── email/
  │   │   ├── resend.provider.ts
  │   │   ├── sendgrid.provider.ts
  │   │   └── smtp.provider.ts
  │   └── core/
  │       ├── provider-registry.ts
  │       └── provider-proxy.ts
  ├── processors/               # Administrative wrappers
  │   ├── call.processor.ts
  │   ├── messaging.processor.ts
  │   ├── calendar.processor.ts
  │   └── email.processor.ts
  ├── services/                 # ⚠️ LAYER TO BE REMOVED
  │   ├── call.service.ts
  │   ├── messaging.service.ts
  │   ├── calendar.service.ts
  │   └── conversation.service.ts
  ├── resources/                # User-facing APIs
  │   ├── calls.resource.ts
  │   ├── sms.resource.ts
  │   ├── email.resource.ts
  │   └── text.resource.ts
  ├── tools/                    # Agent tools
  │   ├── standard/
  │   │   ├── call-tools.ts
  │   │   ├── calendar-tools.ts
  │   │   ├── messaging-tools.ts
  │   │   └── email-tools.ts
  │   ├── registry.ts
  │   └── tool-store.ts
  └── client.ts                 # Main SDK entry point
```

## Current Data Flow (Calls Example)

### Outbound Call Flow

```
1. User Code
   sdk.calls.make({ to: '+1234567890' })

2. CallsResource (resources/calls.resource.ts)
   ↓ Creates CallService internally
   ↓ Delegates to callService.initiateCall()

3. CallService (services/call.service.ts) ← UNNECESSARY LAYER
   ↓ Creates conversation via ConversationService
   ↓ Delegates to callProcessor.initiateCall()

4. CallProcessor (processors/call.processor.ts)
   ↓ Uses TwilioProvider to get client
   ↓ Makes API call: client.calls.create()

5. TwilioProvider (providers/api/twilio.provider.ts)
   ↓ Provides Twilio client
   ↓ Returns authenticated SDK instance

6. Twilio API
   ✓ Call initiated
```

### Inbound Call Speech Handling

```
1. Webhook Handler
   POST /webhooks/calls/:conversationId/speech

2. CallsResource (hypothetical)
   ↓ handleSpeech(callSid, userSpeech)

3. CallService ← UNNECESSARY LAYER
   ↓ Get conversation from ConversationService
   ↓ Add user message to conversation
   ↓ Delegate to Agent.process()
   ↓ Add assistant response to conversation
   ↓ Check for end_call tool usage

4. Agent
   ↓ Process request through Six-Pillar system
   ✓ Return AI response
```

## Services Layer Analysis

### CallService (services/call.service.ts)
**Lines of code**: 118
**Dependencies**: ConversationService, Agent, CallProcessor
**Actual business logic**: None - pure orchestration

**Key observations**:
- Just passes through to `callProcessor.initiateCall()`
- Wraps conversation creation (which Agent already handles via memory)
- `handleUserSpeech()` is pure orchestration: get conversation → agent.process() → save response
- No validation, transformation, or business rules

### MessagingService (services/messaging.service.ts)
**Lines of code**: 160
**Dependencies**: Agent, MessagingProcessor
**Actual business logic**: Phone/email validation (trivial regex)

**Key observations**:
- `sendTemplatedSMS()` builds AgentRequest and calls `agent.process()` - unnecessary wrapper
- `sendSMS()` just calls `messagingProcessor.sendSMS()` with validation
- `sendEmail()` just calls `messagingProcessor.sendEmail()` with validation
- Validation could be in processor or resource

### CalendarService (services/calendar.service.ts)
**Lines of code**: 169
**Dependencies**: Agent, CalendarProcessor
**Actual business logic**: Slot-finding algorithm

**Key observations**:
- `findAvailableSlots()` has actual algorithm (find free slots from busy times)
- `bookAppointment()` just validates and calls `calendarProcessor.createEvent()`
- Slot algorithm should be in processor or separate utility

### ConversationService (services/conversation.service.ts)
**Lines of code**: 219
**Dependencies**: Agent (via setAgent pattern)
**Actual business logic**: Conversation lifecycle management

**Key observations**:
- Wrapper around Agent memory system
- All methods just call `agent.getMemory().*`
- `create()` → `agent.getMemory().startSession()`
- `addMessage()` → `agent.getMemory().store()`
- `complete()` → `agent.getMemory().endSession()`
- Provides conversation-centric API over memory API

## Problems with Current Architecture

### 1. Unnecessary Indirection
Resources → Services → Processors → Providers is 4 layers.
Should be: Resources → Processors → Providers (3 layers) or Resources → Providers (2 layers)

### 2. Confused Responsibilities
- **CallService**: No clear purpose - just orchestration
- **MessagingService**: Trivial validation only
- **CalendarService**: Has business logic (slot finding) that should be elsewhere
- **ConversationService**: Wrapper around Agent memory

### 3. Inconsistent Patterns
- Resources create Services internally (Factory pattern)
- Services call Processors (Delegation)
- Tools call Processors directly (bypassing Services!)
- Agent uses memory directly (bypassing ConversationService)

### 4. Violates Architecture Docs
The `tools.md` architecture shows:
```
Tool Handler → Processor → Provider
```

But the reality is:
```
Resource → Service → Processor → Provider  (calls)
Tool → Processor → Provider                (tools, bypassing services)
```

### 5. Against SDK Best Practices (CLAUDE.md)
- "Avoid god objects with too many responsibilities" - Services have unclear responsibility
- "Single Responsibility Principle" - Services orchestrate, validate, AND delegate
- "Prefer composition over inheritance" - Services add inheritance hierarchy for no benefit

## Correct Architecture (Per Docs)

According to `providers.md` (lines 94-101):

```
1. Client Layer: AIReceptionist initializes and manages providers
2. Registry Layer: ProviderRegistry manages provider lifecycle with lazy loading
3. Proxy Layer: ProviderProxy handles lazy instantiation and validation
4. Provider Layer: Actual provider implementations (OpenAI, Twilio, Google)
5. Processor Layer: Administrative wrappers that use providers
6. Service Layer: High-level business logic using processors ← DOES NOT EXIST IN TOOLS!
```

**But** `tools.md` (line 85-92) shows:
```
1. Agent Layer: AI agent decides when to use tools
2. Registry Layer: ToolRegistry manages tool lifecycle
3. Builder Layer: ToolBuilder provides fluent API
4. Handler Layer: Channel-specific handlers
5. Processor Layer: Administrative wrappers that use providers
6. Provider Layer: Actual service integrations
```

**Notice**: Tools skip the "Service Layer" entirely!

## What Should Be Kept from Services

### ConversationService Functionality
The conversation lifecycle management is valuable but should be:
- Either: Built into Agent memory API directly
- Or: Kept as a utility but not a "service"

### CalendarService Business Logic
The slot-finding algorithm is real business logic:
- Should be moved to `CalendarProcessor` or separate utility class
- Not lost during refactor

### Validation Logic
Phone/email validation in MessagingService:
- Should be in `MessagingProcessor.sendSMS()` and `MessagingProcessor.sendEmail()`
- Or in a shared validation utility

## Dependencies Analysis

### Files Importing from services/
```bash
grep -r "from.*services" src/
```

**Results**:
- `client.ts`: Imports `ConversationService`
- `resources/calls.resource.ts`: Imports `CallService`
- `resources/initialization.ts`: Imports `ConversationService`
- `tools/standard/*.ts`: May import services (need to check)

### Files that would need refactoring:
1. `client.ts` - Remove ConversationService, use Agent memory directly
2. `resources/calls.resource.ts` - Call processors directly
3. `resources/sms.resource.ts` - Call processors directly
4. `resources/email.resource.ts` - Call processors directly
5. `resources/initialization.ts` - Remove service dependencies
6. Any tool files importing services

## Metrics

### Code to be deleted:
- `services/call.service.ts` - 118 lines
- `services/messaging.service.ts` - 160 lines
- `services/calendar.service.ts` - 169 lines
- `services/conversation.service.ts` - 219 lines
- `services/index.ts` - 9 lines
- **Total**: ~675 lines

### Code to be created/modified:
- Agent memory enhancements for conversation lifecycle
- Processor enhancements for validation and business logic
- Resource files need refactoring
- Client.ts needs refactoring

### Estimated net change: -400 to -500 lines of code

## Risks

### Low Risk
- Resources directly calling Processors (already done in tools)
- Removing CallService, MessagingService (pure pass-through)

### Medium Risk
- Moving ConversationService logic to Agent memory
- Ensuring all conversation lifecycle hooks are preserved
- Refactoring client.ts initialization

### High Risk
- CalendarService slot-finding algorithm - must be preserved correctly
- Any external code depending on services/ exports
- Breaking changes for users (but we're deleting without compatibility)

## Testing Requirements

After refactor, must verify:
1. Outbound calls still work
2. Inbound call webhooks still work
3. SMS sending/receiving works
4. Email sending works
5. Calendar operations work
6. Text channel works
7. Tool execution works
8. Agent memory/conversation lifecycle works

## Next Steps

1. Create detailed refactor plan
2. Execute refactor in phases:
   - Phase 1: Move business logic from services to processors
   - Phase 2: Refactor resources to call processors directly
   - Phase 3: Refactor client.ts to remove ConversationService
   - Phase 4: Delete services/ directory
   - Phase 5: Update exports and documentation

---

**Snapshot Complete**: Ready for refactor planning
