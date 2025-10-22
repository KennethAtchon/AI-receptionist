# Tools + Processor Integration

## Overview

Tools now leverage processors for their provider operations, creating a cleaner separation of concerns and better maintainability.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Tools      │    │   Processors    │    │   Providers     │
│                 │    │                 │    │                 │
│ • initiate_call │◄──►│ • CallProcessor │◄──►│ • TwilioProvider│
│ • send_sms      │    │ • MessagingProc │    │ • GoogleProvider│
│ • calendar      │    │ • CalendarProc  │    │ • SendGridProv  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Agent      │    │    Services     │    │   External APIs │
│                 │    │                 │    │                 │
│ • AI decisions  │    │ • Business logic│    │ • Twilio API    │
│ • Tool calls    │    │ • Coordination  │    │ • Google API    │
│ • Orchestration │    │ • Error handling│    │ • SendGrid API  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Changes

### 1. Tools → Processor Integration

**Before**: Tools directly accessed providers
**After**: Tools use processors for provider operations

```typescript
// OLD: Direct provider access
export function buildInitiateCallTool(config: CallToolsConfig): ITool {
  return new ToolBuilder()
    .default(async (params, ctx) => {
      const twilio = await config.twilioProvider.getClient();
      const call = await twilio.calls.create({...});
      return { success: true, data: { callSid: call.sid } };
    })
    .build();
}

// NEW: Processor integration
export function buildInitiateCallTool(config?: CallToolsConfig): ITool {
  return new ToolBuilder()
    .default(async (params, ctx) => {
      if (!config?.callProcessor) {
        return { success: true, data: { callSid: 'MOCK_CALL_123' } };
      }
      
      const result = await config.callProcessor.initiateCall({
        to: params.to,
        conversationId: ctx.conversationId || `call-${Date.now()}`,
        greeting: params.greeting
      });
      
      return { success: true, data: { callSid: result.callSid } };
    })
    .build();
}
```

### 2. Configuration Updates

**Before**: Tools received provider instances
**After**: Tools receive processor instances

```typescript
// OLD: Provider-based config
export interface CallToolsConfig {
  twilioProvider: TwilioProvider;
}

// NEW: Processor-based config
export interface CallToolsConfig {
  callProcessor?: CallProcessor;
}
```

### 3. Registration Updates

**Before**: Tools registered with providers
**After**: Tools registered with processors

```typescript
// OLD: Provider registration
await setupCallTools(this.toolRegistry, { twilioProvider });

// NEW: Processor registration
await setupCallTools(this.toolRegistry, { callProcessor: this.callProcessor });
```

## Benefits

### 1. **Cleaner Separation**
- Tools focus on AI orchestration logic
- Processors handle provider operations
- Clear boundaries between layers

### 2. **Better Error Handling**
- Processors handle provider-specific errors
- Tools can focus on AI response formatting
- Consistent error handling across tools

### 3. **Improved Testability**
- Tools can be tested with mock processors
- Processors can be tested independently
- Easier to mock provider operations

### 4. **Enhanced Maintainability**
- Provider changes only affect processors
- Tool logic is independent of provider details
- Easier to add new providers

## Tool Examples

### Call Tools
```typescript
// initiate_call tool
- Uses CallProcessor.initiateCall()
- Handles Twilio API calls
- Returns structured response

// end_call tool  
- Uses CallProcessor.endCall()
- Manages call termination
- Provides status feedback
```

### Messaging Tools
```typescript
// send_sms tool
- Uses MessagingProcessor.sendSMS()
- Handles Twilio SMS API
- Validates phone numbers

// send_email tool
- Uses MessagingProcessor.sendEmail()
- Handles email provider API
- Validates email addresses
```

### Calendar Tools
```typescript
// calendar tool
- Uses CalendarProcessor.getFreeBusy()
- Uses CalendarProcessor.createEvent()
- Uses CalendarProcessor.deleteEvent()
- Handles Google Calendar API
```

## Flow Examples

### Call Initiation
1. **Agent**: Receives user request
2. **Tool**: `initiate_call` tool called
3. **Processor**: `CallProcessor.initiateCall()`
4. **Provider**: Twilio API call
5. **Response**: Call SID returned to Agent

### SMS Sending
1. **Agent**: Decides to send SMS
2. **Tool**: `send_sms` tool called
3. **Processor**: `MessagingProcessor.sendSMS()`
4. **Provider**: Twilio SMS API
5. **Response**: Message SID returned to Agent

### Calendar Booking
1. **Agent**: User wants to book appointment
2. **Tool**: `calendar` tool called with 'book' action
3. **Processor**: `CalendarProcessor.createEvent()`
4. **Provider**: Google Calendar API
5. **Response**: Event ID returned to Agent

## Migration Guide

### For New Tools
1. Create tool in `src/tools/standard/`
2. Accept processor in config interface
3. Use processor methods for provider operations
4. Register with processor instance

### For New Processors
1. Create processor in `src/processors/`
2. Implement provider operations
3. Return structured results
4. Handle errors gracefully

### For Tool Updates
1. Change config interface to use processor
2. Update tool logic to call processor methods
3. Update registration to pass processor
4. Test with mock processors

## Conclusion

This integration creates a clean, maintainable architecture where:
- **Tools** handle AI orchestration and response formatting
- **Processors** handle provider operations and error handling
- **Providers** focus on external API communication

The result is better separation of concerns, improved testability, and easier maintenance.
