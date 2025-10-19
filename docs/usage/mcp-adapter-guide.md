# MCP Adapter Guide

> Expose AI Receptionist tools via Model Context Protocol

## Overview

The **MCP Adapter** provides a thin translation layer that exposes your AI Receptionist tools through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). This allows external MCP clients, AI models, and applications to discover and execute your tools without any modifications to your existing tool system.

### Key Features

- **Zero Breaking Changes** - Works with existing tools without modification
- **Protocol Agnostic** - MCP is just another consumer of your tools
- **Single Source of Truth** - Tools remain function calls, period
- **Channel Aware** - Supports channel-specific tool filtering
- **HTTP Server** - Optional server for remote access
- **Type Safe** - Full TypeScript support with comprehensive types

## Architecture

The MCP adapter follows a **clean adapter pattern**:

```
┌─────────────────────────────────────────────┐
│     External Consumers (MCP Clients)        │
└─────────────────────────────────────────────┘
                    │
                    │ MCP Protocol
                    ▼
┌─────────────────────────────────────────────┐
│          MCP Adapter (Translation Layer)     │
│  - handleToolsList() → MCP format           │
│  - handleToolCall() → execute & format      │
└─────────────────────────────────────────────┘
                    │
                    │ Function Calls
                    ▼
┌─────────────────────────────────────────────┐
│         Existing Tool System                │
│  - ToolRegistry                             │
│  - Tool Execution                           │
│  - Channel Handlers                         │
└─────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

// 1. Create and initialize your AI Receptionist
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
  providers: { /* ... */ }
});

await client.initialize();

// 2. Access the MCP adapter
const mcpAdapter = client.mcp;

// 3. List tools in MCP format
const tools = await mcpAdapter.handleToolsList();
console.log('Available tools:', tools.tools);

// 4. Execute a tool via MCP
const result = await mcpAdapter.handleToolCall({
  name: 'check_availability',
  arguments: {
    date: '2025-10-19',
    duration: 60
  }
});

console.log('Result:', result);
```

### With HTTP Server

```typescript
import { AIReceptionist, MCPServer } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({ /* ... */ });
await client.initialize();

// Create MCP HTTP server
const mcpServer = new MCPServer(client.mcp, {
  port: 3000,
  apiKey: process.env.MCP_API_KEY,
  cors: {
    enabled: true,
    origins: ['https://your-app.com']
  }
});

await mcpServer.start();
console.log('MCP server running on http://localhost:3000');

// Available endpoints:
// GET  /mcp/tools          - List all tools
// POST /mcp/tools/call     - Execute a tool
// GET  /mcp/tools/:name    - Get specific tool
// GET  /health             - Health check
```

## API Reference

### MCPAdapter

The main adapter class that translates between MCP protocol and SDK tools.

#### Constructor

```typescript
new MCPAdapter(toolRegistry: ToolRegistry, options?: MCPAdapterOptions)
```

**Options:**
- `defaultChannel` - Default channel for MCP calls (`'call' | 'sms' | 'email'`)
- `metadata` - Additional metadata to include in execution context

#### Methods

##### `handleToolsList(channel?)`

List all available tools in MCP format.

```typescript
const tools = await adapter.handleToolsList();
// Or filter by channel
const callTools = await adapter.handleToolsList('call');
```

**Returns:** `MCPToolListResponse`

```typescript
{
  tools: [
    {
      name: 'check_availability',
      description: 'Check calendar availability',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          duration: { type: 'number', description: 'Duration in minutes' }
        },
        required: ['date']
      }
    }
  ]
}
```

##### `handleToolCall(request, contextOverrides?)`

Execute a tool through MCP protocol.

```typescript
const result = await adapter.handleToolCall({
  name: 'check_availability',
  arguments: {
    date: '2025-10-19',
    duration: 60
  }
});
```

**Parameters:**
- `request` - MCP tool call request
  - `name` - Tool name
  - `arguments` - Tool arguments object
- `contextOverrides` - Optional execution context overrides
  - `channel` - Override default channel
  - `conversationId` - Custom conversation ID
  - `metadata` - Additional metadata

**Returns:** `MCPToolCallResponse`

Success:
```typescript
{
  content: [{
    type: 'text',
    text: '{"success": true, "data": {...}, "response": {...}}'
  }]
}
```

Error:
```typescript
{
  content: [{
    type: 'text',
    text: '{"success": false, "error": "Error message"}'
  }],
  isError: true
}
```

##### `getTool(toolName)`

Get a specific tool definition in MCP format.

```typescript
const tool = await adapter.getTool('check_availability');
```

**Returns:** `MCPTool | null`

##### `getToolCount()`

Get the number of registered tools.

```typescript
const count = adapter.getToolCount();
```

**Returns:** `number`

##### `getStats()`

Get adapter statistics.

```typescript
const stats = adapter.getStats();
// {
//   toolCount: 5,
//   defaultChannel: 'call',
//   metadata: { protocol: 'mcp', sdk: 'ai-receptionist' }
// }
```

### MCPServer

HTTP server that exposes the MCP adapter over HTTP.

#### Constructor

```typescript
new MCPServer(adapter: MCPAdapter, config?: MCPServerConfig)
```

**Config:**
- `port` - Server port (default: 3000)
- `apiKey` - Optional API key for authentication
- `cors` - CORS configuration
  - `enabled` - Enable CORS
  - `origins` - Allowed origins (default: ['*'])

#### Methods

##### `start()`

Start the HTTP server.

```typescript
await server.start();
```

##### `stop()`

Stop the HTTP server.

```typescript
await server.stop();
```

##### `getApp()`

Get the Express app instance for custom middleware.

```typescript
const app = server.getApp();
app.use('/custom', customMiddleware);
```

##### `isRunning()`

Check if server is running.

```typescript
if (server.isRunning()) {
  console.log('Server is running');
}
```

## HTTP Endpoints

When using `MCPServer`, the following endpoints are available:

### `GET /mcp/tools`

List all available tools.

**Query Parameters:**
- `channel` - Optional filter (`call`, `sms`, or `email`)

**Response:**
```json
{
  "tools": [
    {
      "name": "check_availability",
      "description": "Check calendar availability",
      "inputSchema": {
        "type": "object",
        "properties": { ... },
        "required": [ ... ]
      }
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/mcp/tools?channel=call
```

### `POST /mcp/tools/call`

Execute a tool.

**Request Body:**
```json
{
  "name": "check_availability",
  "arguments": {
    "date": "2025-10-19",
    "duration": 60
  }
}
```

**Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "{\"success\": true, \"data\": {...}}"
  }]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "name": "get_weather",
    "arguments": {"location": "San Francisco"}
  }'
```

### `GET /mcp/tools/:name`

Get a specific tool definition.

**Response:**
```json
{
  "name": "check_availability",
  "description": "Check calendar availability",
  "inputSchema": { ... }
}
```

**Example:**
```bash
curl http://localhost:3000/mcp/tools/check_availability
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "server": "mcp",
  "toolCount": 5,
  "defaultChannel": "call",
  "metadata": { ... }
}
```

## Custom Tools with MCP

All tools registered in the SDK automatically work with MCP. No changes needed!

```typescript
import { ToolBuilder } from '@loctelli/ai-receptionist';

// Define a custom tool (standard way)
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
    const weather = await fetchWeather(params.location);
    return {
      success: true,
      data: weather,
      response: {
        text: `Weather in ${params.location}: ${weather.temp}°F, ${weather.condition}`,
        speak: `It's ${weather.temp} degrees and ${weather.condition}`
      }
    };
  })
  .build();

// Register tool
client.getToolRegistry().register(weatherTool);

// Tool is now available via:
// 1. OpenAI function calling ✓
// 2. Direct calls ✓
// 3. MCP protocol ✓ (NEW!)
```

## Channel-Specific Handling

MCP adapter respects channel-specific handlers:

```typescript
const notificationTool = new ToolBuilder()
  .withName('send_notification')
  .withDescription('Send a notification')
  .withParameters({ ... })
  .onCall(async (params, context) => {
    // Voice channel - speak the notification
    return {
      success: true,
      data: {},
      response: { speak: params.message }
    };
  })
  .onSMS(async (params, context) => {
    // SMS channel - send as text message
    return {
      success: true,
      data: {},
      response: { message: params.message }
    };
  })
  .onEmail(async (params, context) => {
    // Email channel - send as HTML email
    return {
      success: true,
      data: {},
      response: { html: `<p>${params.message}</p>` }
    };
  })
  .build();

// When called via MCP, uses default channel or override
const result = await adapter.handleToolCall(
  { name: 'send_notification', arguments: { message: 'Hello' } },
  { channel: 'sms' } // Override to use SMS handler
);
```

## Authentication

For production deployments, always use authentication:

```typescript
const server = new MCPServer(adapter, {
  port: 3000,
  apiKey: process.env.MCP_API_KEY // Required!
});
```

Clients must include the API key in requests:

```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/mcp/tools
```

## Error Handling

MCP responses clearly indicate errors:

```typescript
const result = await adapter.handleToolCall({
  name: 'invalid_tool',
  arguments: {}
});

if (result.isError) {
  const error = JSON.parse(result.content[0].text);
  console.error('Tool call failed:', error.error);
}
```

## Best Practices

### 1. Use Appropriate Default Channel

```typescript
// For voice-first applications
const adapter = new MCPAdapter(registry, {
  defaultChannel: 'call'
});

// For messaging applications
const adapter = new MCPAdapter(registry, {
  defaultChannel: 'sms'
});
```

### 2. Add Metadata for Tracking

```typescript
const adapter = new MCPAdapter(registry, {
  metadata: {
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    region: 'us-west-2'
  }
});
```

### 3. Monitor MCP Usage

```typescript
const client = new AIReceptionist({
  // ... config ...
  onToolExecute: (event) => {
    if (event.context?.metadata?.mcpRequest) {
      console.log('Tool called via MCP:', event.toolName);
      analytics.track('mcp_tool_call', {
        tool: event.toolName,
        duration: event.duration
      });
    }
  }
});
```

### 4. Filter Tools by Channel

```typescript
// Only expose call-specific tools
const callTools = await adapter.handleToolsList('call');
```

### 5. Secure Your Server

```typescript
const server = new MCPServer(adapter, {
  apiKey: process.env.MCP_API_KEY,
  cors: {
    enabled: true,
    origins: ['https://your-app.com'] // Specific origins only
  }
});
```

## Examples

See [examples/mcp-adapter-example.ts](../examples/mcp-adapter-example.ts) for a complete working example.

## FAQ

**Q: Do I need to modify my existing tools to use MCP?**
A: No! All existing tools automatically work with MCP through the adapter.

**Q: Can I use both OpenAI function calling and MCP?**
A: Yes! Tools work with both simultaneously. MCP is just another consumer.

**Q: How does the adapter handle tool errors?**
A: Tool errors are caught and returned in MCP format with `isError: true`.

**Q: Can I filter which tools are exposed via MCP?**
A: Yes, use the `channel` parameter in `handleToolsList()` to filter tools.

**Q: Is the MCP server production-ready?**
A: Yes, with proper authentication and CORS configuration.

## Troubleshooting

### Tools not appearing in list

Check that tools are registered before accessing the adapter:

```typescript
await client.initialize(); // Registers standard tools
client.getToolRegistry().register(customTool); // Register custom tools
const adapter = client.mcp; // Now access adapter
```

### Authentication errors

Ensure API key is included in requests:

```bash
curl -H "Authorization: Bearer your-key" http://localhost:3000/mcp/tools
```

### CORS errors

Configure CORS properly for your domain:

```typescript
const server = new MCPServer(adapter, {
  cors: {
    enabled: true,
    origins: ['https://your-domain.com']
  }
});
```

## Learn More

- [MCP Specification](https://modelcontextprotocol.io/)
- [Tool System Guide](./tools-guide.md)
- [Architecture Document](./architecture/mcp-adapter-architecture.md)
- [API Reference](./api-reference.md)

## Support

For issues or questions:
- GitHub Issues: [github.com/loctelli/ai-receptionist/issues](https://github.com/loctelli/ai-receptionist/issues)
- Documentation: [docs.loctelli.com](https://docs.loctelli.com)
