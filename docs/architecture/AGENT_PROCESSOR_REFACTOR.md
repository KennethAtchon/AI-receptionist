# Agent + Processor Refactor

## Overview

This refactor clarifies the roles of Agent and Processors in the AI Receptionist system:

- **Agent**: AI-driven decision maker and orchestrator
- **Processors**: Thin administrative wrappers for provider operations
- **Services**: Use both Agent (for AI decisions) and Processors (for admin operations)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Services     │    │      Agent      │    │   Processors    │
│                 │    │                 │    │                 │
│ • CallService   │◄──►│ • AI decisions  │    │ • CallProcessor │
│ • MessagingSvc  │    │ • Tool calls    │    │ • MessagingProc │
│ • CalendarSvc   │    │ • Orchestration │    │ • CalendarProc  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Resources    │    │      Tools      │    │   Providers     │
│                 │    │                 │    │                 │
│ • CallsResource │    │ • initiate_call │    │ • TwilioProvider│
│ • SMSResource   │    │ • send_sms      │    │ • GoogleProvider│
│ • EmailResource │    │ • calendar      │    │ • SendGridProv  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Changes

### 1. Processors → Administrative Helpers

**Before**: Processors consulted AI and orchestrated complex operations
**After**: Processors are thin wrappers around provider operations

```typescript
// OLD: CallProcessor with AI orchestration
class CallProcessor extends BaseProcessor {
  async processUserSpeech(params) {
    const aiResponse = await this.consultAI({...});
    // Complex AI orchestration logic
  }
}

// NEW: CallProcessor as admin helper
class CallProcessor {
  async initiateCall(params) {
    const client = this.ensureTwilioClient();
    return await client.calls.create({...});
  }
  
  async endCall(params) {
    const client = this.ensureTwilioClient();
    return await client.calls(params.callSid).update({...});
  }
}
```

### 2. Services → Agent + Processor

**Before**: Services used only Agent for everything
**After**: Services use Agent for AI decisions, Processors for admin operations

```typescript
// OLD: Service with only Agent
class CallService {
  constructor(private agent: Agent) {}
  
  async initiateCall(options) {
    // Delegate everything to Agent
    const agentRequest = {...};
    return await this.agent.process(agentRequest);
  }
}

// NEW: Service with Agent + Processor
class CallService {
  constructor(
    private agent: Agent,
    private callProcessor: CallProcessor
  ) {}
  
  async initiateCall(options) {
    // Use processor for admin operation
    return await this.callProcessor.initiateCall({...});
  }
  
  async handleUserSpeech(callSid, speech) {
    // Use agent for AI decisions
    const agentRequest = {...};
    return await this.agent.process(agentRequest);
  }
}
```

### 3. Clear Separation of Concerns

| Component | Role | Responsibilities |
|-----------|------|------------------|
| **Agent** | AI Decision Maker | • Consult AI provider<br>• Execute tools<br>• Orchestrate complex flows<br>• Generate responses |
| **Processors** | Admin Helpers | • Wrap provider operations<br>• Handle technical details<br>• Validate inputs<br>• Manage connections |
| **Services** | Business Logic | • Coordinate Agent + Processors<br>• Handle business rules<br>• Manage state<br>• Error handling |
| **Tools** | AI Actions | • Define AI capabilities<br>• Execute side effects<br>• Return structured data |

## Benefits

### 1. **Clearer Responsibilities**
- Agent: Pure AI orchestration
- Processors: Pure provider operations
- Services: Business logic coordination

### 2. **Better Testability**
- Processors can be tested independently
- Agent can be mocked for service tests
- Clear separation makes unit testing easier

### 3. **Improved Maintainability**
- No AI logic scattered across processors
- Provider changes only affect processors
- AI changes only affect agent and tools

### 4. **Simplified Debugging**
- AI decisions are centralized in Agent
- Provider issues are isolated in Processors
- Business logic is clear in Services

## Migration Guide

### For New Tools
1. Create tool in `src/tools/standard/`
2. Register in `client.ts`
3. No processor changes needed

### For New Processors
1. Create thin wrapper in `src/processors/`
2. Focus on provider operations only
3. No AI consultation

### For New Services
1. Inject both Agent and relevant Processors
2. Use Agent for AI decisions
3. Use Processors for admin operations

## Example Flow

### Call Initiation
1. **Service**: `CallService.initiateCall()`
2. **Processor**: `CallProcessor.initiateCall()` → Twilio API
3. **Result**: Call SID returned

### User Speech Handling
1. **Service**: `CallService.handleUserSpeech()`
2. **Agent**: `Agent.process()` → AI consultation
3. **Tools**: Execute `initiate_call`, `send_sms`, etc.
4. **Response**: Natural language response

### Calendar Booking
1. **Service**: `CalendarService.bookAppointment()`
2. **Processor**: `CalendarProcessor.createEvent()` → Google API
3. **Result**: Event ID returned

## Conclusion

This refactor creates a clean separation between AI orchestration (Agent) and administrative operations (Processors), making the system more maintainable, testable, and easier to understand.
