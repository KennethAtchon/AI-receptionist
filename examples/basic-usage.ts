/**
 * Basic Usage Example
 * Demonstrates the agent-centric architecture with tools and multiple channels
 */

import { AIReceptionist, Tools, ToolBuilder } from '../src';

async function main() {
  // =========================================================================
  // Example 1: Basic Setup with Standard Tools
  // =========================================================================

  const sarah = new AIReceptionist({
    // Agent configuration (primary entity)
    agent: {
      name: 'Sarah',
      role: 'Sales Representative',
      personality: 'friendly and enthusiastic',
      instructions: 'Help customers book appointments and answer product questions.',
      tone: 'friendly'
    },

    // AI Model configuration
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'sk-...',
      model: 'gpt-4',
      temperature: 0.7
    },

    // Tools (hybrid: defaults + custom)
    tools: {
      // Use standard tools
      defaults: ['calendar', 'booking'],

      // Configure calendar tool
      calendar: {
        provider: 'google',
        apiKey: process.env.GOOGLE_API_KEY || 'google-key',
        calendarId: 'primary'
      },

      // Configure booking tool
      booking: {
        apiUrl: 'https://api.booking.com',
        apiKey: process.env.BOOKING_API_KEY || 'booking-key'
      },

      // Add custom tools
      custom: [
        // Simple custom tool
        Tools.custom({
          name: 'check_inventory',
          description: 'Check product inventory levels',
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'Product ID to check' },
              location: { type: 'string', description: 'Store location' }
            },
            required: ['productId']
          },
          handler: async (params, ctx) => {
            console.log(`Checking inventory for product: ${params.productId}`);

            // Simulated inventory check
            const inventory = {
              productId: params.productId,
              quantity: 42,
              location: params.location || 'Main Warehouse'
            };

            return {
              success: true,
              data: inventory,
              response: {
                speak: `We have ${inventory.quantity} units in stock at ${inventory.location}.`,
                message: `Stock: ${inventory.quantity} units at ${inventory.location}`,
                text: `Product ${params.productId}: ${inventory.quantity} units available`
              }
            };
          }
        }),

        // Advanced custom tool with channel-specific handlers
        new ToolBuilder()
          .withName('send_quote')
          .withDescription('Send a price quote to the customer')
          .withParameters({
            type: 'object',
            properties: {
              items: { type: 'array', items: { type: 'string' } },
              email: { type: 'string', format: 'email' }
            },
            required: ['items']
          })
          .onCall(async (params, ctx) => {
            // During call: verbal confirmation
            return {
              success: true,
              data: { quoteId: 'Q-123' },
              response: {
                speak: `I'll send you a detailed quote for those items via email. What email address should I use?`
              }
            };
          })
          .onSMS(async (params, ctx) => {
            // Via SMS: brief with link
            return {
              success: true,
              data: { quoteId: 'Q-123' },
              response: {
                message: `Quote Q-123 created!\nView: https://quotes.com/Q-123\nSent to: ${params.email}`
              }
            };
          })
          .onEmail(async (params, ctx) => {
            // Via email: detailed HTML quote
            return {
              success: true,
              data: { quoteId: 'Q-123' },
              response: {
                html: `
                  <h2>Your Price Quote</h2>
                  <p>Quote ID: Q-123</p>
                  <ul>${params.items.map((item: string) => `<li>${item}</li>`).join('')}</ul>
                  <p>Valid for 30 days</p>
                `
              }
            };
          })
          .default(async (params, ctx) => {
            return {
              success: true,
              data: { quoteId: 'Q-123' },
              response: {
                text: `Quote Q-123 created for ${params.items.length} items`
              }
            };
          })
          .build()
      ]
    },

    // Providers (infrastructure)
    providers: {
      communication: {
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID || 'AC...',
          authToken: process.env.TWILIO_AUTH_TOKEN || 'auth-token',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
        }
      },
      calendar: {
        google: {
          apiKey: process.env.GOOGLE_API_KEY || 'google-key',
          calendarId: 'primary'
        }
      }
    },

    // Event callbacks for monitoring
    onToolExecute: (event) => {
      console.log(`✓ Tool executed: ${event.toolName} in ${event.duration}ms`);
    },

    onToolError: (event) => {
      console.error(`✗ Tool failed: ${event.toolName}`, event.error.message);
    },

    debug: true
  });

  // Initialize the agent
  await sarah.initialize();

  console.log('\n=== Sarah (Sales Agent) Initialized ===\n');

  // Use the agent across different channels
  if (sarah.calls) {
    const call = await sarah.calls.make({
      to: '+1234567890',
      metadata: { leadId: 'LEAD-123', source: 'website' }
    });
    console.log('Call initiated:', call.id);
  }

  if (sarah.sms) {
    const sms = await sarah.sms.send({
      to: '+1234567890',
      body: 'Hi! This is Sarah from ABC Company. I wanted to follow up on your inquiry.'
    });
    console.log('SMS sent:', sms.id);
  }

  // =========================================================================
  // Example 2: Clone Pattern for Multiple Agents
  // =========================================================================

  console.log('\n=== Creating Bob (Support Agent) via Clone ===\n');

  const bob = sarah.clone({
    agent: {
      name: 'Bob',
      role: 'Support Specialist',
      personality: 'patient and helpful',
      instructions: 'Help customers with technical issues and troubleshooting.',
      tone: 'professional'
    },
    tools: {
      // Bob has different tools
      custom: [
        Tools.custom({
          name: 'create_ticket',
          description: 'Create a support ticket',
          parameters: {
            type: 'object',
            properties: {
              issue: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] }
            },
            required: ['issue']
          },
          handler: async (params, ctx) => {
            return {
              success: true,
              data: { ticketId: 'TICKET-456' },
              response: {
                speak: `I've created ticket ${params.priority || 'medium'} priority ticket for you. Reference number: TICKET-456.`,
                message: `Ticket created: TICKET-456\nPriority: ${params.priority || 'medium'}`,
                text: `Support ticket TICKET-456 created`
              }
            };
          }
        })
      ]
    }
  });

  await bob.initialize();

  console.log('Bob initialized with different tools and personality');

  // Both agents can work independently
  if (sarah.calls && bob.calls) {
    await sarah.calls.make({ to: '+1111111111' }); // Sarah handles sales
    await bob.calls.make({ to: '+2222222222' });   // Bob handles support
  }

  // =========================================================================
  // Example 3: Runtime Tool Management
  // =========================================================================

  console.log('\n=== Runtime Tool Management ===\n');

  const sarahToolRegistry = sarah.getToolRegistry();

  // Add a new tool at runtime
  const urgentTool = Tools.custom({
    name: 'escalate_urgent',
    description: 'Escalate to manager for urgent issues',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string' }
      }
    },
    handler: async (params, ctx) => {
      console.log('Escalating to manager:', params.reason);
      return {
        success: true,
        response: {
          speak: 'Let me get my manager to assist you with this.',
          text: 'Escalating to manager...'
        }
      };
    }
  });

  sarahToolRegistry.register(urgentTool);
  console.log(`Sarah now has ${sarahToolRegistry.count()} tools available`);

  // List tools for specific channel
  const callTools = sarahToolRegistry.listAvailable('call');
  console.log(`Tools available for calls:`, callTools.map(t => t.name));

  // =========================================================================
  // Cleanup
  // =========================================================================

  await sarah.dispose();
  await bob.dispose();

  console.log('\n=== Example Complete ===\n');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
