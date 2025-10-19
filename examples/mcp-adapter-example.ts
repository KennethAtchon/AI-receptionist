/**
 * MCP Adapter Example
 *
 * This example demonstrates how to use the Model Context Protocol (MCP)
 * adapter to expose AI Receptionist tools through the MCP protocol.
 */

import { AIReceptionist, MCPServer, ToolBuilder } from '@loctelli/ai-receptionist';

async function main() {
  console.log('=== MCP Adapter Example ===\n');

  // 1. Create and initialize the AI Receptionist
  const client = new AIReceptionist({
    agent: {
      identity: {
        name: 'Sarah',
        role: 'Sales Representative',
        title: 'Senior Sales Specialist'
      },
      personality: {
        traits: [
          { name: 'friendly', description: 'Warm and welcoming' },
          { name: 'professional', description: 'Maintains professional demeanor' }
        ],
        communicationStyle: { primary: 'consultative' }
      },
      knowledge: {
        domain: 'B2B Sales',
        expertise: ['product knowledge', 'sales techniques']
      },
      goals: {
        primary: 'Convert leads into customers'
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
  console.log('✓ AI Receptionist initialized\n');

  // 2. Register custom tools
  const weatherTool = new ToolBuilder()
    .withName('get_weather')
    .withDescription('Get current weather for a location')
    .withParameters({
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or zip code'
        },
        units: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature units'
        }
      },
      required: ['location']
    })
    .default(async (params) => {
      // Simulate API call
      const weather = {
        location: params.location,
        temperature: 72,
        condition: 'sunny',
        humidity: 45
      };

      return {
        success: true,
        data: weather,
        response: {
          text: `The weather in ${params.location} is ${weather.temperature}°F and ${weather.condition}`,
          speak: `It's currently ${weather.temperature} degrees and ${weather.condition} in ${params.location}`
        }
      };
    })
    .build();

  client.getToolRegistry().register(weatherTool);
  console.log('✓ Custom tools registered\n');

  // 3. Access the MCP adapter
  const mcpAdapter = client.mcp;
  console.log('✓ MCP adapter accessed\n');

  // 4. List available tools via MCP
  console.log('--- Listing Tools via MCP ---');
  const toolsList = await mcpAdapter.handleToolsList();
  console.log(`Found ${toolsList.tools.length} tools:\n`);

  toolsList.tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   Description: ${tool.description}`);
    console.log(`   Parameters: ${JSON.stringify(tool.inputSchema.properties || {}, null, 2)}`);
    console.log('');
  });

  // 5. Call a tool via MCP
  console.log('--- Calling Tool via MCP ---');
  const callResult = await mcpAdapter.handleToolCall({
    name: 'get_weather',
    arguments: {
      location: 'San Francisco',
      units: 'fahrenheit'
    }
  });

  console.log('Tool call result:');
  console.log(JSON.stringify(callResult, null, 2));
  console.log('');

  // 6. Get specific tool information
  console.log('--- Get Specific Tool ---');
  const weatherToolInfo = await mcpAdapter.getTool('get_weather');
  if (weatherToolInfo) {
    console.log('Weather tool info:');
    console.log(JSON.stringify(weatherToolInfo, null, 2));
    console.log('');
  }

  // 7. Get adapter statistics
  console.log('--- Adapter Statistics ---');
  const stats = mcpAdapter.getStats();
  console.log(`Tool count: ${stats.toolCount}`);
  console.log(`Default channel: ${stats.defaultChannel}`);
  console.log(`Metadata: ${JSON.stringify(stats.metadata, null, 2)}`);
  console.log('');

  // 8. Optional: Start MCP HTTP Server
  if (process.env.START_MCP_SERVER === 'true') {
    console.log('--- Starting MCP HTTP Server ---');

    const mcpServer = new MCPServer(mcpAdapter, {
      port: 3000,
      apiKey: process.env.MCP_API_KEY,
      cors: {
        enabled: true,
        origins: ['*'] // In production, specify allowed origins
      }
    });

    await mcpServer.start();
    console.log('✓ MCP server started on http://localhost:3000\n');

    console.log('Available endpoints:');
    console.log('  GET  /mcp/tools          - List all tools');
    console.log('  POST /mcp/tools/call     - Execute a tool');
    console.log('  GET  /mcp/tools/:name    - Get specific tool');
    console.log('  GET  /health             - Health check');
    console.log('');

    console.log('Example curl commands:');
    console.log('  # List tools');
    console.log('  curl http://localhost:3000/mcp/tools\n');
    console.log('  # Call a tool');
    console.log('  curl -X POST http://localhost:3000/mcp/tools/call \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"name": "get_weather", "arguments": {"location": "New York"}}\'\n');

    // Keep server running
    console.log('Server is running. Press Ctrl+C to stop.\n');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await mcpServer.stop();
      await client.dispose();
      process.exit(0);
    });
  } else {
    // Cleanup
    await client.dispose();
    console.log('✓ Client disposed');
  }
}

// Run the example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

/**
 * Usage:
 *
 * # Basic example (no server)
 * npm run build && node dist/examples/mcp-adapter-example.js
 *
 * # With MCP HTTP server
 * START_MCP_SERVER=true MCP_API_KEY=your-secret-key npm run build && node dist/examples/mcp-adapter-example.js
 *
 * # Test the server
 * curl http://localhost:3000/mcp/tools
 * curl -X POST http://localhost:3000/mcp/tools/call \
 *   -H "Authorization: Bearer your-secret-key" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "get_weather", "arguments": {"location": "Boston"}}'
 */
