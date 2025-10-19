# Agent System Examples

This directory contains comprehensive examples demonstrating how to use the new agent system with its six-pillar architecture.

## Overview

The agent system is built around **six core pillars**:

1. **Identity** - Who the agent is (name, role, backstory, authority)
2. **Personality** - How the agent behaves (traits, communication style, emotional intelligence)
3. **Knowledge** - What the agent knows (domain expertise, limitations, knowledge base)
4. **Capabilities** - What the agent can do (skills, tools, actions)
5. **Memory** - What the agent remembers (short-term, long-term, semantic)
6. **Goals** - What the agent aims to achieve (primary/secondary goals, constraints, metrics)

## Example Files

### 1. [basic-agent-example.ts](./basic-agent-example.ts)

Demonstrates how to create and use agents with the builder pattern.

**What you'll learn:**
- Creating a basic receptionist agent
- Using the fluent builder API
- Defining capabilities and skills
- Processing agent requests
- Creating specialized agents (sales agent example)

**Run it:**
```bash
npm run example:basic-agent
```

### 2. [prompt-builder-example.ts](./prompt-builder-example.ts)

Shows how the SystemPromptBuilder creates optimized prompts from the six pillars.

**What you'll learn:**
- Building system prompts from agent pillars
- Prompt optimization and validation
- Handling prompt size limits
- Chat history compression
- Getting prompt statistics

**Run it:**
```bash
npm run example:prompts
```

### 3. [observability-example.ts](./observability-example.ts)

Demonstrates logging and tracing capabilities for monitoring agent behavior.

**What you'll learn:**
- Structured logging with AgentLogger
- Sensitive data sanitization
- Child loggers with context
- Interaction tracing
- Performance metrics and reporting
- Finding slow interactions
- Exporting traces for debugging

**Run it:**
```bash
npm run example:observability
```

## Quick Start

### Creating Your First Agent

```typescript
import { AgentBuilder } from '../core/AgentBuilder';

const agent = AgentBuilder.create()
  .withIdentity({
    name: 'Sarah',
    role: 'Receptionist',
    title: 'Virtual Receptionist'
  })
  .withPersonality({
    traits: [{ name: 'friendly', description: 'Warm and welcoming' }],
    communicationStyle: { primary: 'empathetic', tone: 'friendly' }
  })
  .withKnowledge({
    domain: 'Customer Service',
    expertise: ['appointment scheduling']
  })
  .withGoals({
    primary: 'Provide excellent customer service'
  })
  .build();

await agent.initialize();

// Use the agent
const response = await agent.process({
  id: 'REQ-001',
  input: 'I need to schedule an appointment',
  channel: 'call',
  context: { conversationId: 'CONV-001' }
});

console.log(response.content);
```

### Building System Prompts

```typescript
import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';

const builder = new SystemPromptBuilder();
const prompt = await builder.build({
  identity,
  personality,
  knowledge,
  goals,
  capabilities: ['scheduling'],
  channel: 'call'
});
```

### Logging and Tracing

```typescript
import { AgentLogger } from '../observability/AgentLogger';
import { InteractionTracer } from '../observability/InteractionTracer';

// Create logger
const logger = new AgentLogger('agent-001', 'Sarah');
logger.info('Agent initialized', { version: '1.0.0' });

// Create tracer
const tracer = new InteractionTracer();
tracer.startInteraction('INT-001');
tracer.log('memory_retrieval', { count: 5 });
tracer.log('ai_response', { tokens: 150 });
const trace = tracer.endInteraction();
```

## Key Concepts

### The Builder Pattern

Agents are created using a fluent builder pattern that ensures type safety and discoverability:

```typescript
AgentBuilder.create()
  .withIdentity({ ... })
  .withPersonality({ ... })
  .withKnowledge({ ... })
  .withCapabilities([...])
  .withMemory({ ... })
  .withGoals({ ... })
  .build();
```

### Capabilities and Skills

Capabilities are high-level features (e.g., "scheduling") that contain multiple skills:

```typescript
const schedulingCapability = new Capability(
  'scheduling',
  'Schedule and manage appointments',
  [
    new Skill('schedule-appointment', 'Schedule a new appointment', async (params) => { ... }),
    new Skill('check-availability', 'Check if a time slot is available', async (params) => { ... })
  ],
  [], // tools
  ['call', 'sms', 'email'] // supported channels
);
```

### Memory System

The memory system has three tiers:

1. **Short-term** - Recent conversation context (working memory)
2. **Long-term** - Persistent facts and important information
3. **Vector** - Semantic search for similar past interactions

### System Prompts

System prompts are built dynamically from the six pillars and optimized for token efficiency:

- Hierarchical structure with priority-based sections
- Channel-specific communication guidelines
- Error handling instructions
- Decision-making principles
- Relevant memory context

## Best Practices

1. **Always initialize agents** before using them:
   ```typescript
   await agent.initialize();
   ```

2. **Dispose of agents** when done:
   ```typescript
   await agent.dispose();
   ```

3. **Use appropriate log levels**:
   - `DEBUG` - Detailed diagnostic information
   - `INFO` - General informational messages
   - `WARN` - Warning messages
   - `ERROR` - Error conditions

4. **Define clear goals and constraints** for your agents to ensure they stay on track

5. **Use capabilities** to organize related skills and tools

6. **Enable tracing** in development for debugging and performance analysis

## Architecture Diagram

```
Agent
├── Identity (Who am I?)
├── Personality (How do I behave?)
├── Knowledge (What do I know?)
├── Capabilities (What can I do?)
│   ├── Skill 1
│   ├── Skill 2
│   └── Skill 3
├── Memory (What do I remember?)
│   ├── Short-term
│   ├── Long-term
│   └── Vector
└── Goals (What am I trying to achieve?)
    ├── Primary Goal
    └── Secondary Goals
```

## Next Steps

1. Review the examples in this directory
2. Read the main [AGENT_DESIGN_IMPROVEMENTS.md](../../../docs/AGENT_DESIGN_IMPROVEMENTS.md) document
3. Check out the SDK development guide in [CLAUDE.md](../../../../CLAUDE.md)
4. Start building your own specialized agents!

## Support

For questions or issues:
- Review the documentation
- Check existing examples
- Examine the source code with detailed JSDoc comments
- Create an issue in the repository

## Contributing

When adding new examples:
1. Follow the existing pattern
2. Add comprehensive comments
3. Update this README
4. Ensure examples run without errors
5. Follow the SDK development principles in CLAUDE.md
