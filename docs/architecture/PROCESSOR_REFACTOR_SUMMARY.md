# Processor Layer Refactor - Quick Reference

## 🎯 Goal

Transform providers into **PURE AI wrappers** and introduce a **Processor layer** that uses AI to intelligently orchestrate API calls.

---

## 📊 Current vs Target Architecture

### Current (Problem)
```
Service → Provider (with business logic ❌)
         → AI Provider (pure ✅)
```

**Issues:**
- Mixed responsibilities in providers
- Hardcoded orchestration in services
- No AI-driven decision making

### Target (Solution)
```
Service → Processor (AI-driven orchestration ★)
         → Provider (pure API wrapper only ✅)
         → AI Provider (consults for decisions ✅)
```

**Benefits:**
- All providers are pure wrappers
- Processors orchestrate using AI
- Services are thin and simple
- AI makes decisions at every step

---

## 🔑 Key Concepts

### What is a Processor?

A **Processor** is an AI-driven orchestrator that:
1. **Receives** high-level requests from services
2. **Consults AI** to decide what to do
3. **Executes** provider methods based on AI guidance
4. **Handles** errors and retries using AI
5. **Returns** results to services

### The Three Processor Types

| Processor | Purpose | Uses Providers |
|-----------|---------|----------------|
| **CallProcessor** | Orchestrate voice calls | TwilioProvider (communication) |
| **CalendarProcessor** | Manage calendar operations | GoogleProvider (calendar) |
| **MessagingProcessor** | Handle SMS/email | TwilioProvider (communication) |

---

## 📁 Major File Changes

### New Files (Create)

```
src/processors/
├── index.ts
├── base.processor.ts           ← Base class for all processors
├── call.processor.ts           ← Voice call orchestration
├── calendar.processor.ts       ← Calendar booking orchestration
└── messaging.processor.ts      ← SMS/email orchestration

src/types/processors/
├── index.ts
└── processor.types.ts          ← Processor interfaces

src/types/providers/
├── index.ts
├── communication.provider.ts   ← ICommunicationProvider interface
└── calendar.provider.ts        ← ICalendarProvider interface

src/services/
├── calendar.service.ts         ← NEW: Calendar service using processor
└── messaging.service.ts        ← NEW: Messaging service using processor
```

### Modified Files

```
src/client.ts                   ← Create processors, wire to services
src/services/call.service.ts    ← Simplify, delegate to CallProcessor
src/providers/communication/    ← Rename from core/, ensure pure
└── twilio.provider.ts
src/providers/calendar/         ← New directory
└── google.provider.ts          ← Remove business logic, make pure
src/tools/standard/index.ts     ← Use services instead of providers
```

---

## 🚨 Breaking Changes

### 1. GoogleProvider API

```typescript
// ❌ REMOVED (use CalendarService instead)
googleProvider.getAvailableSlots(...)

// ✅ NEW
calendarService.findAvailableSlots(...)
```

### 2. Provider Registry Keys

```typescript
// ❌ OLD
registry.get('google-calendar')

// ✅ NEW
registry.get('google')
```

### 3. Service Constructors

```typescript
// ❌ OLD
new CallService(twilioProvider, aiProvider, ...)

// ✅ NEW
new CallService(conversationService, callProcessor)
```

### 4. File Locations

```typescript
// ❌ OLD
import { GoogleProvider } from './providers/core/google-calendar.provider'

// ✅ NEW
import { GoogleProvider } from './providers/calendar/google.provider'
```

---

## 🛠️ Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create processor types and base class
- [ ] Create provider interfaces
- [ ] Update type exports

### Phase 2: Pure Providers (Week 2)
- [ ] Refactor GoogleProvider to be pure
- [ ] Ensure TwilioProvider is pure
- [ ] Update provider registry

### Phase 3: Processors (Week 3-4)
- [ ] Implement CallProcessor
- [ ] Implement CalendarProcessor
- [ ] Implement MessagingProcessor

### Phase 4: Services Refactor (Week 5)
- [ ] Refactor CallService
- [ ] Create CalendarService
- [ ] Create MessagingService

### Phase 5: Client Integration (Week 6)
- [ ] Wire processors in AIReceptionist
- [ ] Update standard tools
- [ ] Update resources

### Phase 6: Documentation (Week 7)
- [ ] Update architecture docs
- [ ] Create migration guide
- [ ] Update examples

---

## 💡 Code Examples

### Before: Direct Provider Use (BAD)

```typescript
// Service directly uses provider with hardcoded logic
export class CallService {
  constructor(private twilioProvider: TwilioProvider) {}
  
  async handleSpeech(speech: string) {
    // ❌ Hardcoded: Get AI response
    const response = await this.aiProvider.chat(...);
    
    // ❌ Hardcoded: Execute tools in loop
    if (response.toolCalls) {
      for (const tool of response.toolCalls) {
        await this.toolExecutor.execute(...);
      }
      // ❌ Hardcoded: Call AI again
      const final = await this.aiProvider.chat(...);
    }
  }
}
```

### After: Processor Orchestration (GOOD)

```typescript
// Service delegates to processor
export class CallService {
  constructor(private callProcessor: CallProcessor) {}
  
  async handleSpeech(speech: string) {
    // ✅ Delegate to processor - it handles everything!
    const response = await this.callProcessor.processUserSpeech({
      userSpeech: speech,
      conversationHistory: [...],
      availableTools: [...]
    });
    return response.content;
  }
}

// Processor uses AI to orchestrate
export class CallProcessor {
  async processUserSpeech(params) {
    // 1. Ask AI what to do
    const decision = await this.consultAI({
      context: params.userSpeech,
      options: ['respond', 'use_tools', 'end_call']
    });
    
    // 2. Execute based on AI decision
    if (decision.content.includes('use_tools')) {
      // Execute tools
      const results = await this.executeTools(...);
      
      // 3. Ask AI again for final response
      const final = await this.consultAI({
        context: `Tool results: ${results}`,
        options: ['respond', 'use_more_tools']
      });
    }
    
    // AI-driven at every step!
  }
}
```

### Pure Provider Example

```typescript
// ✅ GOOD: Pure wrapper - no business logic
export class GoogleProvider implements ICalendarProvider {
  // Just wraps Google Calendar API
  async listFreeBusy(params) {
    const response = await this.calendar.freebusy.query({...});
    return response.data.calendars[params.calendarId].busy;
  }
  
  // Just wraps Google Calendar API
  async createEvent(params) {
    const response = await this.calendar.events.insert({...});
    return { id: response.data.id };
  }
  
  // ❌ NO business logic like:
  // - getAvailableSlots()
  // - findBestSlot()
  // - computeWorkingHours()
  // Those belong in CalendarProcessor!
}
```

---

## 📝 Checklist for Each Component

### Making a Provider PURE ✅

- [ ] Remove all business logic methods
- [ ] Keep only methods that directly wrap external APIs
- [ ] Implement provider interface (ICalendarProvider, ICommunicationProvider)
- [ ] No loops, no complex logic, no decision-making
- [ ] Just: receive params → call API → return results

### Creating a Processor ⚙️

- [ ] Extend BaseProcessor
- [ ] Receive AI provider in constructor
- [ ] Receive relevant domain providers (Twilio, Google, etc.)
- [ ] Use `consultAI()` to make decisions
- [ ] Call provider methods based on AI guidance
- [ ] Handle errors by consulting AI
- [ ] Return structured results to service

### Updating a Service 🔧

- [ ] Remove direct provider access
- [ ] Inject processor instead
- [ ] Delegate orchestration to processor
- [ ] Keep only high-level business validation
- [ ] Simplify methods (they should be thin)

---

## 🎓 Mental Model

Think of it as a restaurant:

- **Service** = Waiter (takes order from customer, delegates to kitchen)
- **Processor** = Head Chef (uses expertise to decide how to prepare food)
- **Provider** = Kitchen Equipment (just executes: oven bakes, knife cuts)
- **AI** = Recipe Book (chef consults for guidance)

The waiter doesn't cook (service doesn't orchestrate).  
The chef doesn't take orders from customers (processor only serves the service).  
The oven doesn't decide temperature (provider just executes).  
The chef reads recipes to decide what to do (processor consults AI).

---

## 🚀 Quick Start

1. **Read full document**: `docs/architecture/PROCESSOR_LAYER_REFACTOR.md`
2. **Start with Phase 1**: Create base classes and interfaces
3. **Follow phases sequentially**: Don't skip ahead
4. **Test at each phase**: Ensure nothing breaks
5. **Update docs as you go**: Keep architecture docs in sync

---

## 📚 Related Documents

- **Full Refactor Plan**: `docs/architecture/PROCESSOR_LAYER_REFACTOR.md`
- **Current Architecture**: `docs/architecture/root.md`
- **Calendar Service Plan**: `docs/architecture/CALENDAR_SERVICE_REFACTOR.md`

---

## ❓ FAQ

**Q: Why not just keep the current architecture?**  
A: Current architecture mixes responsibilities. Providers have business logic, services have hardcoded orchestration. This makes testing difficult and changes risky.

**Q: Won't processors make too many AI calls?**  
A: Yes, processors will call AI more frequently. This is a trade-off for flexibility and intelligence. We can optimize later with caching or batching.

**Q: Can I still access providers directly?**  
A: Technically yes (they're still in the registry), but you shouldn't. Always go through processors or services.

**Q: What if I need custom orchestration logic?**  
A: Create a custom processor! Extend `BaseProcessor` and implement your own orchestration using AI guidance.

**Q: How do I migrate existing code?**  
A: Follow the breaking changes section. Main changes:
1. Replace provider calls with service calls
2. Update imports (providers moved to subdirectories)
3. Update registry keys
4. Pass services to tools instead of configs

---

**Ready to start?** Begin with Phase 1 in the full refactor document! 🚀

