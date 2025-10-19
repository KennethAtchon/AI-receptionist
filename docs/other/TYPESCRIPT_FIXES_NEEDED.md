# TypeScript Fixes Needed

**Date**: 2025-10-18
**Status**: ⚠️ Type errors need fixing

## Summary

After integrating the six-pillar Agent system, there are TypeScript errors that need to be resolved. Most are straightforward fixes.

## Categorized Errors

### 1. AgentStatus Import Issues (Agent.ts) - CRITICAL
**Error**: `'AgentStatus' cannot be used as a value because it was imported using 'import type'`
**Location**: `src/agent/core/Agent.ts` (multiple lines)

**Fix**: Change the import in Agent.ts from:
```typescript
import type { ...AgentStatus... } from '../types';
```

To:
```typescript
import type { ... } from '../types';
import { AgentStatus } from '../types';
```

**Files affected**: 1

### 2. AgentConfig Removed (Old References) - MEDIUM
**Error**: `Module has no exported member 'AgentConfig'`
**Locations**:
- `src/__tests__/fixtures/agents.ts`
- `src/providers/ai/openai.provider.ts`
- `src/providers/ai/openrouter.provider.ts`
- `src/services/call.service.ts`
- `src/services/conversation.service.ts`

**Fix**: Remove references to old `AgentConfig` (no longer exists - replaced with six-pillar system)
- AI providers should not need agent config anymore (they just need model config)
- Call service and conversation service should reference agent via ID or the Agent instance

**Files affected**: 5

### 3. AgentLogger Constructor Signature - MEDIUM
**Error**: `Expected 2-3 arguments, but got 1`
**Locations**:
- `src/agent/core/Agent.ts:94`
- `src/client.ts:112`
- Various providers

**Current code**:
```typescript
this.logger = new AgentLogger(this.identity.name);
```

**Expected signature** (check AgentLogger.ts):
```typescript
constructor(agentId: string, agentName: string, options?: {...})
```

**Fix**: Update all AgentLogger instantiations to provide both agentId and agentName

**Files affected**: ~8

### 4. InteractionTracer Method Signatures - MEDIUM
**Error**: `Expected 2 arguments, but got 3`
**Locations**:
- `src/agent/core/Agent.ts:158` - `tracer.log(interactionId, 'memory_retrieval', memoryContext)`
- `src/agent/core/Agent.ts:173` - `tracer.log(interactionId, 'response', response)`

**Current signature**:
```typescript
tracer.log(interactionId: string, step: string, data: any)
```

**Expected signature** (check InteractionTracer.ts):
```typescript
log(step: string, data: any): void
```

**Fix**: InteractionTracer.log() should NOT take interactionId (it uses the active trace)
```typescript
// Wrong:
this.tracer.log(interactionId, 'memory_retrieval', memoryContext);

// Correct:
this.tracer.log('memory_retrieval', memoryContext);
```

**Files affected**: 1

### 5. endInteraction Signature - MEDIUM
**Error**: `Expected 0 arguments, but got 1`
**Location**: `src/agent/core/Agent.ts:200`

**Fix**: `endInteraction()` takes no arguments (it uses the active trace)
```typescript
// Wrong:
this.tracer.endInteraction(interactionId);

// Correct:
this.tracer.endInteraction();
```

**Files affected**: 1

### 6. Capability.toJSON Missing - LOW
**Error**: `Property 'toJSON' does not exist on type 'Capability'`
**Location**: `src/agent/capabilities/CapabilityManager.ts:178`

**Fix**: Add `toJSON()` method to Capability interface or class

**Files affected**: 1

### 7. Duplicate LogContext Export - LOW
**Error**: `Duplicate identifier 'LogContext'`
**Location**: `src/index.ts:72` and `src/index.ts:131`

**Fix**: LogContext is exported both from `utils/logger` and from `agent/types`. Remove one or rename.

**Files affected**: 1

### 8. PersonalityEngine Type Mismatches - LOW
**Error**: Type mismatches in PersonalityEngine
**Locations**:
- `src/agent/personality/PersonalityEngine.ts:104` - 'professional' not in union type
- `src/agent/personality/PersonalityEngine.ts:113` - string not assignable to tone type

**Fix**: Update CommunicationStyleConfig to include 'professional' or fix the default values

**Files affected**: 1

### 9. Example Files - LOW PRIORITY
**Errors**: Various errors in example files
**Locations**:
- `src/agent/examples/basic-agent-example.ts` - Capability constructor, method names
- `src/agent/examples/prompt-builder-example.ts` - Identity import

**Fix**: Update examples to match actual implementation

**Files affected**: 2

### 10. Error Type Issues - LOW
**Error**: `Argument of type 'unknown' is not assignable to parameter of type 'Error | undefined'`
**Locations**: Various providers

**Fix**: Cast or type check errors in catch blocks
```typescript
catch (error) {
  // Add type assertion
  this.logger.error('Message', { error: error as Error });
}
```

**Files affected**: ~7

## Priority Fix Order

1. **CRITICAL** - Fix AgentStatus import (Agent.ts won't work)
2. **HIGH** - Fix AgentLogger constructor calls
3. **HIGH** - Fix InteractionTracer method signatures
4. **MEDIUM** - Remove AgentConfig references from providers
5. **MEDIUM** - Fix Capability.toJSON
6. **LOW** - Fix PersonalityEngine types
7. **LOW** - Fix duplicate LogContext
8. **LOW** - Fix error type assertions
9. **LOWEST** - Fix example files

## Estimated Time

- Critical fixes: 15 minutes
- High priority: 20 minutes
- Medium priority: 30 minutes
- Low priority: 20 minutes
- **Total**: ~1.5 hours

## Quick Fix Script

Due to the number of files, we could:
1. Fix critical issues first to get basic compilation
2. Fix high-priority issues to get core functionality working
3. Leave low-priority for later or create separate tickets

## Notes

- Most errors are due to signature mismatches and old references
- No architectural issues - just integration cleanup
- Once fixed, the system should work as designed

---

**Next Steps**: Start with Critical and High priority fixes
