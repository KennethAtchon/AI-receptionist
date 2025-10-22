## Tools Development Guide

This guide shows how to create, register, and use tools so the AI can invoke them via function-calling.

### 1) Define a tool using ToolBuilder

```ts
import { ToolBuilder } from '../../src/tools/builder';
import type { ITool } from '../../src/types';

export function buildWeatherTool(): ITool {
  return new ToolBuilder()
    .withName('get_weather')
    .withDescription('Get current weather information for a city')
    .withParameters({
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g., San Francisco' }
      },
      required: ['city']
    })
    .default(async (params, ctx) => {
      // Integrate with your weather API here
      const data = { city: params.city, temperatureC: 21 };
      return {
        success: true,
        data,
        response: { text: `It is ${data.temperatureC}°C in ${data.city}.` }
      };
    })
    .build();
}
```

### 2) Register the tool

```ts
import { ToolRegistry } from '../../src/tools/registry';
import { buildWeatherTool } from './weather-tool';

const registry = new ToolRegistry();
registry.register(buildWeatherTool());
```

### 3) Expose tools to the AI

- Agent orchestration: Agent fetches `availableTools` from `ToolRegistry` and passes them to `aiProvider.chat(...)`.
- Processor orchestration: Processor must also pass `availableTools` into `aiProvider.chat(...)` if it is the orchestrator.

### 4) Execution loop pattern

```ts
const aiResp = await aiProvider.chat({
  conversationId,
  userMessage,
  availableTools
});

if (aiResp.toolCalls?.length) {
  const results = await toolExecutor.executeAll(aiResp.toolCalls, context);
  const final = await aiProvider.chat({
    conversationId,
    userMessage: `Tool results: ${JSON.stringify(results)}`,
    availableTools
  });
  return final.content;
}

return aiResp.content;
```

### Best Practices

- Keep tools deterministic and idempotent; put orchestration in the AI loop, not in tools.
- Prefer one tool per domain action (e.g., `calendar_check_availability`, `calendar_book`).
- Validate input via explicit JSON Schema.
- Log successes and failures for observability.


