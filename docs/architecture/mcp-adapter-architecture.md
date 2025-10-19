# MCP Adapter Architecture

> **Adding Model Context Protocol Support via Adapter Layer**
>
> Version: 2.0.0
> Last Updated: October 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Verification](#current-architecture-verification)
3. [The MCP Adapter Approach](#the-mcp-adapter-approach)
4. [Architecture Design](#architecture-design)
5. [Implementation Guide](#implementation-guide)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)

---

## Executive Summary

This document describes how to extend the AI Receptionist SDK with **Model Context Protocol (MCP)** support through a clean adapter layer, without modifying the existing tool architecture.

### Core Philosophy

**Tools are function calls. MCP is just another protocol that consumes them.**

The SDK's current tool system is already well-designed for function calling (as used by OpenAI, Anthropic, etc.). Instead of redesigning tools to be "hybrid," we add a thin **MCP adapter** that translates MCP protocol requests into standard function calls.

### Benefits

✅ **Zero Breaking Changes** - Current tool system remains unchanged
✅ **Single Source of Truth** - Tools are function calls, period
✅ **Protocol Agnostic** - MCP is just another consumer
✅ **Simpler Mental Model** - No dual-nature tools
✅ **Provider Compatible** - Already works with OpenAI/Anthropic
✅ **Extensible** - Easy to add other protocols (GraphQL, REST, gRPC)

---

## Current Architecture Verification

### 1. Tool System: Function Calls

The current tool system is based on **function calls with channel-specific handlers**:

```typescript
// Current tool definition (src/types/index.ts:104-116)
export interface ITool {
  name: string;
  description: string;
  parameters: JSONSchema;  // Already JSON Schema!
  handlers: ToolHandlers;
}

export interface ToolHandlers {
  onCall?: ToolHandler;    // Voice-specific
  onSMS?: ToolHandler;     // SMS-specific
  onEmail?: ToolHandler;   // Email-specific
  default: ToolHandler;    // Fallback for all channels
}

export type ToolHandler = (params: any, context: ExecutionContext) => Promise<ToolResult>;
```

**Key Observation**: Tools already use JSON Schema for parameters - perfect for MCP!

### 2. Provider Integration: OpenAI Function Calling

Both OpenAI and OpenRouter providers convert tools to function calling format:

```typescript
// From openai.provider.ts:114-123
private buildToolDefinitions(tools: ITool[]): ChatCompletionTool[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters  // JSON Schema → OpenAI format
    }
  }));
}
```

**Verification ✅**: Tools are designed for function calling and work perfectly with AI providers.

### 3. Tool Execution: ToolRegistry + ToolExecutionService

Tools are executed through a registry:

```typescript
// From registry.ts:60-90
async execute(
  toolName: string,
  parameters: any,
  context: ExecutionContext
): Promise<ToolResult> {
  const tool = this.tools.get(toolName);

  // Get channel-specific handler or default
  const handlerKey = `on${this.capitalizeFirst(context.channel)}`;
  const handler = tool.handlers[handlerKey] || tool.handlers.default;

  const result = await handler(parameters, context);
  return result;
}
```

**Verification ✅**: Execution is clean and protocol-agnostic. Context determines which handler runs.

### 4. Agent Integration: Tools Passed to AI Provider

The Agent passes tools to the AI provider:

```typescript
// From Agent.ts:216-222
const aiResponse = await this.aiProvider.chat({
  conversationId: request.context.conversationId,
  userMessage: request.input,
  conversationHistory: memoryContext.shortTerm || [],
  availableTools: this.capabilities.getTools(request.channel),  // Tools filtered by channel
  systemPrompt: systemPrompt
});
```

**Verification ✅**: Tools flow naturally from registry → agent → provider.

---

## The MCP Adapter Approach

### Concept

Instead of making tools "hybrid" (MCP + function call), we add an **MCP Adapter** that:

1. Exposes tools via MCP protocol
2. Translates MCP requests → function calls
3. Returns MCP-formatted responses

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                      External Consumers                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ MCP Client   │  │  User Code   │  │  AI Agent    │          │
│  │ (external)   │  │  (direct)    │  │  (OpenAI)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ MCP Protocol       │ Direct Call        │ Function Call
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADAPTER LAYER (NEW)                         │
│                                                                   │
│  ┌──────────────────────┐                                        │
│  │   MCP Adapter        │  Translates:                           │
│  │                      │  - MCP tools/list → registry.list()   │
│  │  - handleToolsList() │  - MCP tools/call → registry.execute()│
│  │  - handleToolCall()  │                                        │
│  │  - handleToolsDescr()│                                        │
│  └──────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXISTING TOOL SYSTEM                           │
│                   (No Changes Required!)                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ToolRegistry                                                ││
│  │  - register(tool)                                            ││
│  │  - listAvailable(channel?)                                   ││
│  │  - execute(name, params, context)                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Tools (ITool)                                               ││
│  │  {                                                            ││
│  │    name: 'check_availability',                               ││
│  │    description: '...',                                       ││
│  │    parameters: { type: 'object', ... },  ← JSON Schema!     ││
│  │    handlers: {                                               ││
│  │      default: async (params, ctx) => { ... }                ││
│  │    }                                                          ││
│  │  }                                                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Tools already use JSON Schema** - compatible with MCP out of the box
2. **ToolRegistry is protocol-agnostic** - doesn't care who calls it
3. **ExecutionContext is flexible** - can represent MCP calls
4. **No business logic changes** - tools work the same way

---

## Architecture Design

### Component Overview

```typescript
/**
 * MCP Adapter - New component
 *
 * Location: src/adapters/mcp/mcp-adapter.ts
 *
 * Responsibilities:
 * 1. Implement MCP protocol endpoints (tools/list, tools/call)
 * 2. Translate MCP requests to ToolRegistry calls
 * 3. Format responses according to MCP spec
 */

/**
 * MCP Server - Optional component
 *
 * Location: src/adapters/mcp/mcp-server.ts
 *
 * Responsibilities:
 * 1. Expose MCP adapter over HTTP or stdio
 * 2. Handle MCP authentication
 * 3. Route MCP requests to adapter
 */
```

### Data Flow

#### MCP Tool Discovery

```
MCP Client                 MCP Adapter              ToolRegistry
    │                          │                        │
    │  1. tools/list           │                        │
    ├─────────────────────────>│                        │
    │                          │  2. listAvailable()    │
    │                          ├───────────────────────>│
    │                          │                        │
    │                          │  3. ITool[]            │
    │                          │<───────────────────────┤
    │                          │                        │
    │  4. MCP tools response   │                        │
    │<─────────────────────────┤                        │
    │  [{                      │                        │
    │    name: "...",          │                        │
    │    description: "...",   │                        │
    │    inputSchema: {...}    │                        │
    │  }]                      │                        │
```

#### MCP Tool Execution

```
MCP Client                 MCP Adapter              ToolRegistry              Tool Handler
    │                          │                        │                        │
    │  1. tools/call           │                        │                        │
    │  {                       │                        │                        │
    │    name: "check_avail",  │                        │                        │
    │    arguments: {...}      │                        │                        │
    │  }                       │                        │                        │
    ├─────────────────────────>│                        │                        │
    │                          │  2. execute()          │                        │
    │                          ├───────────────────────>│                        │
    │                          │                        │  3. handler(params)    │
    │                          │                        ├───────────────────────>│
    │                          │                        │                        │
    │                          │                        │  4. ToolResult         │
    │                          │                        │<───────────────────────┤
    │                          │  5. ToolResult         │                        │
    │                          │<───────────────────────┤                        │
    │                          │                        │                        │
    │  6. MCP response         │                        │                        │
    │<─────────────────────────┤                        │                        │
    │  {                       │                        │                        │
    │    content: [{           │                        │                        │
    │      type: "text",       │                        │                        │
    │      text: "..."         │                        │                        │
    │    }]                    │                        │                        │
    │  }                       │                        │                        │
```

---

## Implementation Guide

### Step 1: Define MCP Types

```typescript
// src/adapters/mcp/types.ts

/**
 * MCP Protocol Types
 * Based on Model Context Protocol specification
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

export interface MCPToolListResponse {
  tools: MCPTool[];
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

### Step 2: Implement MCP Adapter

```typescript
// src/adapters/mcp/mcp-adapter.ts

import { ToolRegistry } from '../../tools/registry';
import { ExecutionContext } from '../../types';
import { logger } from '../../utils/logger';
import type {
  MCPToolListResponse,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPTool
} from './types';

/**
 * MCP Adapter
 *
 * Exposes the existing tool registry via Model Context Protocol
 */
export class MCPAdapter {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly defaultContext?: Partial<ExecutionContext>
  ) {}

  /**
   * Handle MCP tools/list request
   * Returns all tools in MCP format
   */
  async handleToolsList(channel?: 'call' | 'sms' | 'email'): Promise<MCPToolListResponse> {
    logger.info('[MCPAdapter] Handling tools/list request', { channel });

    const tools = this.toolRegistry.listAvailable(channel);

    return {
      tools: tools.map(tool => this.convertToMCPTool(tool))
    };
  }

  /**
   * Handle MCP tools/call request
   * Executes a tool and returns result in MCP format
   */
  async handleToolCall(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
    logger.info('[MCPAdapter] Handling tools/call request', {
      toolName: request.name,
      arguments: request.arguments
    });

    try {
      // Build execution context
      const context: ExecutionContext = {
        channel: this.defaultContext?.channel || 'call', // Default to call
        conversationId: this.defaultContext?.conversationId || `mcp-${Date.now()}`,
        metadata: {
          ...this.defaultContext?.metadata,
          protocol: 'mcp',
          timestamp: new Date().toISOString()
        }
      };

      // Execute tool through existing registry
      const result = await this.toolRegistry.execute(
        request.name,
        request.arguments,
        context
      );

      // Convert to MCP response format
      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: result.error,
              success: false
            })
          }],
          isError: true
        };
      }

      // Success response
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result.data,
            // Include channel response if available
            ...(result.response && { response: result.response })
          })
        }]
      };

    } catch (error) {
      logger.error('[MCPAdapter] Tool call failed', { error, request });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          })
        }],
        isError: true
      };
    }
  }

  /**
   * Convert ITool to MCP format
   */
  private convertToMCPTool(tool: any): MCPTool {
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        ...tool.parameters  // Already JSON Schema!
      }
    };
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.toolRegistry.count();
  }
}
```

### Step 3: Extend AIReceptionist with MCP Support

```typescript
// src/client.ts (additions)

import { MCPAdapter } from './adapters/mcp/mcp-adapter';

export class AIReceptionist {
  // ... existing code ...

  private mcpAdapter?: MCPAdapter;

  /**
   * Get MCP adapter
   * Enables MCP protocol access to tools
   */
  get mcp(): MCPAdapter {
    if (!this.mcpAdapter) {
      this.mcpAdapter = new MCPAdapter(this.toolRegistry, {
        // Default context for MCP calls
        channel: 'call',
        metadata: {
          sdk: 'ai-receptionist',
          version: '0.1.0'
        }
      });
    }
    return this.mcpAdapter;
  }
}
```

### Step 4: Optional HTTP Server

```typescript
// src/adapters/mcp/mcp-server.ts

import express from 'express';
import { MCPAdapter } from './mcp-adapter';
import { logger } from '../../utils/logger';

/**
 * MCP HTTP Server
 * Exposes MCP adapter over HTTP
 */
export class MCPServer {
  private app: express.Application;
  private server?: any;

  constructor(
    private readonly adapter: MCPAdapter,
    private readonly port: number = 3000,
    private readonly apiKey?: string
  ) {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Authentication middleware
    if (this.apiKey) {
      this.app.use((req, res, next) => {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${this.apiKey}`) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
    }

    // MCP tools/list endpoint
    this.app.get('/mcp/tools', async (req, res) => {
      try {
        const channel = req.query.channel as 'call' | 'sms' | 'email' | undefined;
        const response = await this.adapter.handleToolsList(channel);
        res.json(response);
      } catch (error) {
        logger.error('[MCPServer] tools/list failed', { error });
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // MCP tools/call endpoint
    this.app.post('/mcp/tools/call', async (req, res) => {
      try {
        const request = req.body;
        const response = await this.adapter.handleToolCall(request);
        res.json(response);
      } catch (error) {
        logger.error('[MCPServer] tools/call failed', { error });
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        toolCount: this.adapter.getToolCount()
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`[MCPServer] Started on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('[MCPServer] Stopped');
          resolve();
        });
      });
    }
  }
}
```

---

## Usage Examples

### Example 1: Basic MCP Integration

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({
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
  },
  providers: {
    communication: {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      }
    }
  }
});

await client.initialize();

// Access MCP adapter
const mcpAdapter = client.mcp;

// List available tools via MCP
const toolsList = await mcpAdapter.handleToolsList();
console.log('Available MCP tools:', toolsList.tools);

// Call a tool via MCP
const result = await mcpAdapter.handleToolCall({
  name: 'calendar_check_availability',
  arguments: {
    date: '2025-10-19',
    duration: 60
  }
});

console.log('Tool result:', result);
```

### Example 2: MCP HTTP Server

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';
import { MCPServer } from '@loctelli/ai-receptionist/adapters/mcp';

const client = new AIReceptionist({ /* ... */ });
await client.initialize();

// Create MCP server
const mcpServer = new MCPServer(
  client.mcp,
  3000,
  process.env.MCP_API_KEY
);

await mcpServer.start();
console.log('MCP server listening on http://localhost:3000');

// MCP clients can now access:
// GET  http://localhost:3000/mcp/tools
// POST http://localhost:3000/mcp/tools/call
```

### Example 3: MCP Client Usage

```typescript
// External MCP client calling your SDK

// 1. Discover tools
const toolsResponse = await fetch('http://localhost:3000/mcp/tools', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});

const { tools } = await toolsResponse.json();
console.log('Available tools:', tools);

// 2. Call a tool
const callResponse = await fetch('http://localhost:3000/mcp/tools/call', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'check_availability',
    arguments: {
      date: '2025-10-19'
    }
  })
});

const result = await callResponse.json();
console.log('Tool result:', result);
```

### Example 4: Custom Tools Work with MCP

```typescript
import { ToolBuilder } from '@loctelli/ai-receptionist';

// Create a custom tool (using existing API)
const weatherTool = new ToolBuilder()
  .withName('get_weather')
  .withDescription('Get current weather for a location')
  .withParameters({
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  })
  .default(async (params) => {
    const weather = await fetch(`https://api.weather.com?q=${params.location}`);
    const data = await weather.json();

    return {
      success: true,
      data: {
        temperature: data.temp,
        condition: data.condition
      },
      response: {
        speak: `The weather in ${params.location} is ${data.temp} degrees and ${data.condition}`
      }
    };
  })
  .build();

// Register tool
client.toolRegistry.register(weatherTool);

// Tool is now available via:
// 1. OpenAI function calling (already works)
// 2. Direct calls (already works)
// 3. MCP protocol (new!)

// Use via MCP
const result = await client.mcp.handleToolCall({
  name: 'get_weather',
  arguments: { location: 'San Francisco' }
});
```

---

## Best Practices

### 1. Channel Handling in MCP Context

When a tool is called via MCP, decide which channel handler to use:

```typescript
// Option A: Default to a specific channel (recommended)
const mcpAdapter = new MCPAdapter(toolRegistry, {
  channel: 'call'  // MCP calls use voice handlers by default
});

// Option B: Let user specify channel in metadata
const result = await mcpAdapter.handleToolCall({
  name: 'check_availability',
  arguments: { date: '2025-10-19' },
  metadata: { channel: 'sms' }  // Optional override
});
```

### 2. Error Handling

MCP responses should clearly indicate errors:

```typescript
// The adapter already handles this:
if (!result.success) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ error: result.error })
    }],
    isError: true  // MCP error flag
  };
}
```

### 3. Authentication for MCP Server

Always use authentication in production:

```typescript
// Use API keys
const mcpServer = new MCPServer(
  client.mcp,
  3000,
  process.env.MCP_API_KEY  // Required!
);

// Or implement custom auth middleware
mcpServer.app.use(async (req, res, next) => {
  const token = req.headers.authorization;
  const isValid = await validateToken(token);
  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### 4. Tool Filtering by Channel

When listing tools via MCP, you can filter by channel:

```typescript
// List all tools
const allTools = await mcpAdapter.handleToolsList();

// List only tools available for SMS
const smsTools = await mcpAdapter.handleToolsList('sms');
```

### 5. Monitoring MCP Usage

Use existing SDK callbacks to monitor MCP tool usage:

```typescript
const client = new AIReceptionist({
  // ... config ...
  onToolExecute: (event) => {
    if (event.context?.metadata?.protocol === 'mcp') {
      console.log('Tool called via MCP:', event.toolName);
      analytics.track('mcp_tool_call', {
        tool: event.toolName,
        duration: event.duration
      });
    }
  }
});
```

---

## Conclusion

The MCP Adapter approach provides MCP protocol support while maintaining the SDK's clean architecture:

### What Changed
✅ Added `MCPAdapter` class (new file)
✅ Added optional `MCPServer` for HTTP exposure (new file)
✅ Added `client.mcp` property for easy access

### What Stayed the Same
✅ Tool definitions (`ITool` interface)
✅ Tool registry (`ToolRegistry`)
✅ Tool execution (`ToolExecutionService`)
✅ Provider integrations (OpenAI, OpenRouter)
✅ Agent processing logic

### The Result
A **thin adapter layer** that exposes existing tools via MCP protocol, enabling:
- AI models to discover and call tools via MCP
- External MCP clients to access your tools
- Future protocol adapters (GraphQL, REST, gRPC)

All while maintaining the SDK's core principle: **Tools are function calls.**
