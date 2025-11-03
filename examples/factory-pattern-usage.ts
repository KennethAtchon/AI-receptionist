/**
 * Factory Pattern Usage Example
 *
 * This example demonstrates how to use the AIReceptionistFactory for
 * efficient concurrent request handling in server environments.
 */

import { AIReceptionistFactory } from '../src/factory';
import type { AgentInstance } from '../src/factory';

/**
 * Example 1: Basic Factory Setup
 * Initialize factory once at application startup
 */
async function basicFactorySetup() {
  console.log('=== Example 1: Basic Factory Setup ===\n');

  // ONE-TIME: Initialize factory with shared resources
  const factory = await AIReceptionistFactory.create({
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500
    },
    providers: {
      communication: {
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID || 'your-sid',
          authToken: process.env.TWILIO_AUTH_TOKEN || 'your-token',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
        }
      }
    },
    storage: {
      type: 'memory' // Use in-memory storage for this example
    },
    debug: true
  });

  console.log('✅ Factory initialized successfully\n');

  return factory;
}

/**
 * Example 2: Creating Lightweight Agents
 * Create agents per-request with custom configurations
 */
async function createLightweightAgents(factory: AIReceptionistFactory) {
  console.log('=== Example 2: Creating Lightweight Agents ===\n');

  // Create agent for Lead 1 with sales strategy
  const agent1 = await factory.createAgent({
    customSystemPrompt: `You are Sarah, a friendly sales assistant.
Your goal is to qualify leads and book appointments.
Be consultative and focus on understanding customer needs.`
  });

  console.log('✅ Agent 1 created (Sales Strategy)\n');

  // Create agent for Lead 2 with support strategy
  const agent2 = await factory.createAgent({
    customSystemPrompt: `You are Alex, a helpful support agent.
Your goal is to resolve customer issues quickly and efficiently.
Be empathetic and solution-focused.`
  });

  console.log('✅ Agent 2 created (Support Strategy)\n');

  return { agent1, agent2 };
}

/**
 * Example 3: Using Agents to Generate Responses
 */
async function useAgents(agent1: AgentInstance, agent2: AgentInstance) {
  console.log('=== Example 3: Using Agents ===\n');

  try {
    // Agent 1 handles a sales inquiry
    const response1 = await agent1.text.generate({
      message: 'I\'m interested in your product. Can you tell me more?',
      sessionId: 'lead-001'
    });

    console.log('Agent 1 Response (Sales):');
    console.log(response1.content);
    console.log();

    // Agent 2 handles a support inquiry
    const response2 = await agent2.text.generate({
      message: 'I\'m having trouble with my account login.',
      sessionId: 'lead-002'
    });

    console.log('Agent 2 Response (Support):');
    console.log(response2.content);
    console.log();
  } catch (error) {
    console.error('Error generating responses:', error);
  }
}

/**
 * Example 4: Proper Cleanup
 * Always dispose agents after use
 */
async function cleanupAgents(
  agent1: AgentInstance,
  agent2: AgentInstance,
  factory: AIReceptionistFactory
) {
  console.log('=== Example 4: Cleanup ===\n');

  // Dispose agents (fast, ~5ms each)
  await agent1.dispose();
  console.log('✅ Agent 1 disposed');

  await agent2.dispose();
  console.log('✅ Agent 2 disposed');

  // On application shutdown, dispose factory
  await factory.dispose();
  console.log('✅ Factory disposed\n');
}

/**
 * Example 5: Server Pattern - Per-Request Agent Creation
 * Simulates handling multiple concurrent requests
 */
async function serverPattern(factory: AIReceptionistFactory) {
  console.log('=== Example 5: Server Pattern (Concurrent Requests) ===\n');

  // Simulate 5 concurrent webhook requests
  const requests = [
    { leadId: 'lead-001', message: 'I want to schedule a demo', strategy: 'sales' },
    { leadId: 'lead-002', message: 'How much does it cost?', strategy: 'sales' },
    { leadId: 'lead-003', message: 'I can\'t log in', strategy: 'support' },
    { leadId: 'lead-004', message: 'What are your hours?', strategy: 'general' },
    { leadId: 'lead-005', message: 'Tell me about your company', strategy: 'general' }
  ];

  const startTime = Date.now();

  // Handle all requests concurrently
  const responses = await Promise.all(
    requests.map(async (req) => {
      // Create lightweight agent for this request
      const agent = await factory.createAgent({
        customSystemPrompt: `You are an AI assistant handling ${req.strategy} inquiries.`
      });

      try {
        // Generate response
        const response = await agent.text.generate({
          message: req.message,
          sessionId: req.leadId
        });

        return {
          leadId: req.leadId,
          success: true,
          response: response.content
        };
      } finally {
        // Always cleanup (even on error)
        await agent.dispose();
      }
    })
  );

  const duration = Date.now() - startTime;

  console.log(`✅ Processed ${responses.length} concurrent requests in ${duration}ms\n`);
  responses.forEach((r, i) => {
    console.log(`Request ${i + 1} (${requests[i].leadId}):`);
    console.log(`  Status: ${r.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Response preview: ${r.response?.substring(0, 100)}...\n`);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  AI Receptionist SDK - Factory Pattern Usage Example  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Example 1: Initialize factory
    const factory = await basicFactorySetup();

    // Example 2: Create agents
    const { agent1, agent2 } = await createLightweightAgents(factory);

    // Example 3: Use agents
    await useAgents(agent1, agent2);

    // Example 4: Cleanup
    await cleanupAgents(agent1, agent2, factory);

    // Example 5: Server pattern
    console.log('\n--- Reinitializing for Server Pattern Example ---\n');
    const factory2 = await basicFactorySetup();
    await serverPattern(factory2);
    await factory2.dispose();

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
