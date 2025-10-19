# Integration Plan: New Agent System into AIReceptionist Client

**Date**: 2025-10-18
**Status**: Planning

## Objective

Integrate the new six-pillar Agent system into the existing AIReceptionist client while maintaining **100% backward compatibility** with existing code.

## Current State

### Old Agent Configuration (Simple)
```typescript
interface AgentConfig {
  name: string;
  role: string;
  personality?: string;
  systemPrompt?: string;
  instructions?: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  voice?: VoiceConfig;
}
```

### New Agent Configuration (Six Pillars)
```typescript
interface AgentConfiguration {
  identity: IdentityConfig;
  personality?: PersonalityConfig;
  knowledge?: KnowledgeConfig;
  capabilities?: string[] | CapabilityConfig[];
  memory?: MemoryConfig;
  goals?: GoalConfig;
  tools?: any[];
  aiProvider: any;
  observability?: ObservabilityConfig;
}
```

## Integration Strategy

### Phase 1: Backward Compatibility Layer ✅

Create a migration layer that converts old `AgentConfig` to new `AgentConfiguration`:

```typescript
function migrateAgentConfig(oldConfig: AgentConfig): AgentConfiguration {
  return {
    identity: {
      name: oldConfig.name,
      role: oldConfig.role,
      title: oldConfig.role,
      authorityLevel: 'medium'
    },
    personality: {
      traits: oldConfig.personality ?
        [{ name: 'primary', description: oldConfig.personality }] :
        undefined,
      communicationStyle: {
        primary: mapToneToStyle(oldConfig.tone),
        tone: oldConfig.tone || 'professional'
      }
    },
    knowledge: {
      domain: 'general'
    },
    goals: {
      primary: `Act as ${oldConfig.role} and assist users`
    },
    memory: {
      type: 'simple',
      contextWindow: 20
    }
  };
}
```

### Phase 2: Update AIReceptionist Class

Two approaches:

#### Option A: Dual Configuration Support (Recommended)
Support both old and new config formats:

```typescript
export interface AIReceptionistConfig {
  // OLD: Simple agent config (deprecated but supported)
  agent?: AgentConfig;

  // NEW: Advanced agent config (preferred)
  agentAdvanced?: AgentConfiguration;

  // ... rest of config
}
```

#### Option B: Automatic Migration (More Breaking)
Always use new Agent internally, migrate old config automatically:

```typescript
export class AIReceptionist {
  private agent!: Agent; // New Agent class

  constructor(config: AIReceptionistConfig) {
    // Migrate old config to new if needed
    const agentConfig = config.agentAdvanced ||
                       migrateAgentConfig(config.agent);
    // Use new Agent class
  }
}
```

### Phase 3: Deprecation Path

1. **v1.x** - Current (simple AgentConfig only)
2. **v2.0** - Add new Agent system with backward compatibility
3. **v2.1-2.9** - Deprecation warnings for old config
4. **v3.0** - Remove old config support (breaking change)

## Implementation Steps

### Step 1: Create Migration Utilities ✅
- [ ] Create `agent/migration/` directory
- [ ] Implement `migrateAgentConfig()`
- [ ] Implement `isOldConfig()` type guard
- [ ] Add tests for migration

### Step 2: Update Types ✅
- [ ] Add `agentAdvanced?: AgentConfiguration` to `AIReceptionistConfig`
- [ ] Mark `agent?: AgentConfig` as deprecated with JSDoc
- [ ] Export new agent types from main package

### Step 3: Update AIReceptionist Class ✅
- [ ] Add private `agentInstance: Agent` property
- [ ] Update `initialize()` to create Agent instance
- [ ] Update AI provider integration to use Agent
- [ ] Maintain existing behavior for backward compat

### Step 4: Update Resources ✅
- [ ] Update `CallsResource` to work with new Agent
- [ ] Update `SMSResource` to work with new Agent
- [ ] Update `EmailResource` to work with new Agent
- [ ] Ensure channel-specific prompts work

### Step 5: Documentation ✅
- [ ] Update README with new usage examples
- [ ] Create migration guide for v1 → v2
- [ ] Add examples for advanced agent configuration
- [ ] Document deprecation timeline

### Step 6: Testing ✅
- [ ] Unit tests for migration utilities
- [ ] Integration tests for backward compatibility
- [ ] E2E tests with both old and new config
- [ ] Performance benchmarking

## Backward Compatibility Guarantees

✅ **100% Compatible**:
- All existing code using `AgentConfig` continues to work
- No breaking changes to public API
- Same behavior as before (unless explicitly using new features)

✅ **Migration Path**:
- Clear documentation for upgrading
- Deprecation warnings (not errors)
- Side-by-side examples

✅ **New Features Opt-In**:
- Advanced features only available with `agentAdvanced`
- Old config gets sensible defaults for new features
- No forced migration

## Example: Before & After

### Before (v1.x - Still Works in v2.0)
```typescript
const receptionist = new AIReceptionist({
  agent: {
    name: 'Sarah',
    role: 'Receptionist',
    personality: 'friendly and professional'
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  }
});
```

### After (v2.0 - New Recommended Way)
```typescript
const receptionist = new AIReceptionist({
  agentAdvanced: {
    identity: {
      name: 'Sarah',
      role: 'Receptionist',
      title: 'Virtual Receptionist',
      backstory: 'Experienced receptionist with 5 years in healthcare',
      authorityLevel: 'medium'
    },
    personality: {
      traits: [
        { name: 'friendly', description: 'Warm and welcoming' },
        { name: 'professional', description: 'Maintains professionalism' }
      ],
      communicationStyle: {
        primary: 'empathetic',
        tone: 'friendly',
        formalityLevel: 6
      }
    },
    knowledge: {
      domain: 'Healthcare Reception',
      expertise: ['appointment scheduling', 'patient intake']
    },
    goals: {
      primary: 'Provide excellent patient experience',
      constraints: ['HIPAA compliance', 'Verify patient identity']
    },
    memory: {
      type: 'vector',
      contextWindow: 30,
      longTermEnabled: true
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  }
});
```

## Migration Helper

Provide a CLI tool or helper function:

```typescript
import { migrateToAdvancedAgent } from '@ai-receptionist/sdk';

const oldConfig = { /* ... */ };
const newConfig = migrateToAdvancedAgent(oldConfig);

console.log(JSON.stringify(newConfig, null, 2));
```

## Risks & Mitigation

### Risk 1: Breaking Existing Code
**Mitigation**: Strict backward compatibility, comprehensive testing

### Risk 2: Confusion Between Two Configs
**Mitigation**: Clear documentation, deprecation warnings, migration guide

### Risk 3: Performance Regression
**Mitigation**: Benchmarking, optimization, lazy loading

### Risk 4: Increased Complexity
**Mitigation**: Sensible defaults, helper functions, examples

## Timeline

- **Week 1**: Implement migration layer & update types
- **Week 2**: Update AIReceptionist class & resources
- **Week 3**: Testing & documentation
- **Week 4**: Beta release & user feedback
- **Week 5**: Stable v2.0 release

## Success Criteria

✅ All existing tests pass without modification
✅ New integration tests for Agent system pass
✅ Documentation complete with migration guide
✅ No performance regression (< 5% slowdown acceptable)
✅ Zero breaking changes to existing API

## Next Actions

1. ✅ Review this plan with team
2. ⏳ Create migration utilities
3. ⏳ Update AIReceptionist class
4. ⏳ Write comprehensive tests
5. ⏳ Update documentation

---

**Status**: Ready for implementation
**Last Updated**: 2025-10-18
