# Pillar Updates - Runtime Agent Configuration

This guide explains how to update your AI agent's configuration at runtime using the PillarManager.

## Overview

The AI Receptionist SDK is built on a **Six-Pillar Architecture**:

1. **Identity** - Who the agent is
2. **Personality** - How the agent behaves
3. **Knowledge** - What the agent knows
4. **Capabilities** - What the agent can do
5. **Memory** - What the agent remembers
6. **Goals** - What the agent aims to achieve

All pillar updates automatically propagate to **all channels** (text, email, calls, etc.) by rebuilding the system prompt.

## Basic Usage

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

const sarah = new AIReceptionist({
  agent: {
    identity: {
      name: 'Sarah',
      role: 'Sales Representative'
    }
  },
  model: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  }
});

await sarah.initialize();

// Access the pillar manager
const pillars = sarah.pillars;
```

## Personality Pillar

### Add Personality Traits

```typescript
// Simple trait (string)
await sarah.pillars.addPersonalityTrait('enthusiastic');

// Detailed trait (object)
await sarah.pillars.addPersonalityTrait({
  name: 'technical',
  description: 'Uses technical terminology appropriately',
  weight: 0.8 // 0-1, importance of this trait
});
```

### Remove Personality Traits

```typescript
await sarah.pillars.removePersonalityTrait('enthusiastic');
```

### Update Communication Style

```typescript
await sarah.pillars.updateCommunicationStyle({
  primary: 'empathetic',    // 'consultative' | 'assertive' | 'empathetic' | 'analytical' | 'casual'
  tone: 'friendly',         // 'formal' | 'friendly' | 'professional' | 'casual'
  formalityLevel: 5         // 1-10 (1=very casual, 10=very formal)
});
```

### Set Formality Level

```typescript
// More formal (good for business settings)
await sarah.pillars.setFormalityLevel(8);

// More casual (good for friendly interactions)
await sarah.pillars.setFormalityLevel(3);
```

### Batch Update Personality

```typescript
await sarah.pillars.updatePersonality({
  traits: [
    'professional',
    'helpful',
    { name: 'patient', description: 'Takes time to explain complex topics', weight: 0.9 }
  ],
  communicationStyle: {
    primary: 'consultative',
    formalityLevel: 7
  },
  formalityLevel: 7 // Can also set directly
});
```

## Real-World Examples

### Example 1: Adjust Based on Customer Feedback

```typescript
// Customer feedback: "The agent was too formal"
await sarah.pillars.setFormalityLevel(4);
await sarah.pillars.addPersonalityTrait('warm');

// Next interaction will be more casual and warm
const response = await sarah.text.generate({
  prompt: 'Hello! How can I help you today?'
});
```

### Example 2: Switch Contexts During Conversation

```typescript
// Start with standard sales personality
await sarah.pillars.updatePersonality({
  traits: ['professional', 'enthusiastic'],
  communicationStyle: { primary: 'consultative', formalityLevel: 6 }
});

// Customer becomes upset - switch to empathetic mode
await sarah.pillars.updatePersonality({
  traits: ['empathetic', 'patient', 'understanding'],
  communicationStyle: { primary: 'empathetic', formalityLevel: 5 }
});

// Technical question - become more analytical
await sarah.pillars.updatePersonality({
  traits: ['analytical', 'precise', 'technical'],
  communicationStyle: { primary: 'analytical', formalityLevel: 7 }
});
```

### Example 3: A/B Testing Different Personalities

```typescript
// Version A: Friendly and casual
const versionA = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah A', role: 'Sales' },
    personality: {
      traits: ['friendly', 'casual'],
      communicationStyle: { primary: 'casual', formalityLevel: 3 }
    }
  },
  model: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' }
});

// Version B: Professional and consultative
const versionB = new AIReceptionist({
  agent: {
    identity: { name: 'Sarah B', role: 'Sales' },
    personality: {
      traits: ['professional', 'consultative'],
      communicationStyle: { primary: 'consultative', formalityLevel: 7 }
    }
  },
  model: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' }
});

await versionA.initialize();
await versionB.initialize();

// Use different versions for different customers
// Track conversion rates to see which personality performs better
```

### Example 4: Progressive Personality Adjustment

```typescript
// Start professional
await sarah.pillars.setFormalityLevel(7);

// As relationship builds, become more casual
setTimeout(async () => {
  await sarah.pillars.setFormalityLevel(5);
  await sarah.pillars.addPersonalityTrait('friendly');
}, 5 * 60 * 1000); // After 5 minutes

// Long-term customer - very casual
setTimeout(async () => {
  await sarah.pillars.setFormalityLevel(3);
  await sarah.pillars.addPersonalityTrait('personal');
}, 30 * 60 * 1000); // After 30 minutes
```

## Future Pillar Updates (Coming Soon)

The PillarManager will support updating all six pillars:

### Knowledge Pillar (Planned)
```typescript
await sarah.pillars.addExpertise('cloud architecture');
await sarah.pillars.addLanguage('Spanish', 'conversational');
await sarah.pillars.updateDomain('Software Engineering');
```

### Goals Pillar (Planned)
```typescript
await sarah.pillars.setPrimaryGoal('Qualify leads and book demos');
await sarah.pillars.addSecondaryGoal('Gather customer feedback');
```

### Identity Pillar (Planned)
```typescript
await sarah.pillars.updateRole('Senior Sales Engineer');
await sarah.pillars.setAuthorityLevel('high');
```

### Memory Pillar (Planned)
```typescript
await sarah.pillars.clearShortTermMemory();
await sarah.pillars.updateMemoryConfig({ contextWindow: 30 });
```

### Capabilities Pillar
```typescript
// Already available via tool registry
const tools = sarah.getToolRegistry();
tools.register(myCustomTool);
tools.unregister('old-tool');
```

## How It Works

1. **Update Method Called**: You call a pillar update method (e.g., `addPersonalityTrait()`)
2. **Pillar Updated**: The PillarManager updates the specific pillar
3. **System Prompt Rebuilt**: The system prompt is automatically rebuilt with the new configuration
4. **Propagation**: The next interaction on **any channel** (text, call, email, SMS) uses the updated personality

This ensures **consistent behavior** across all communication channels.

## Best Practices

1. **Be Intentional**: Don't change personality too frequently - it can feel inconsistent
2. **Test Changes**: Use the text resource to test personality changes before using in production
3. **Track Context**: Store why you made changes (customer feedback, A/B testing, etc.)
4. **Gradual Adjustments**: Make small, incremental changes rather than dramatic shifts
5. **Channel Awareness**: Remember that changes apply to ALL channels

## TypeScript Support

All pillar update methods are fully typed:

```typescript
import type { PersonalityTrait, CommunicationStyleConfig } from '@loctelli/ai-receptionist';

const trait: PersonalityTrait = {
  name: 'empathetic',
  description: 'Shows understanding and care',
  weight: 0.9
};

const style: Partial<CommunicationStyleConfig> = {
  primary: 'empathetic',
  tone: 'friendly',
  formalityLevel: 5
};

await sarah.pillars.addPersonalityTrait(trait);
await sarah.pillars.updateCommunicationStyle(style);
```

## Debugging

Check the system prompt after updates:

```typescript
await sarah.pillars.setFormalityLevel(8);

// Manually rebuild (automatic in normal usage)
await sarah.pillars.rebuildSystemPrompt();

// Get the current agent state to see the changes
const agent = sarah.getAgent();
const state = agent.getState();
console.log('Current personality:', state.identity);
```

## Summary

The PillarManager provides a clean, type-safe API for updating your agent's behavior at runtime. All changes propagate automatically to all communication channels, ensuring consistent agent behavior across your entire application.
