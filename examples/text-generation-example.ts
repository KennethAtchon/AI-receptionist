/**
 * Text Generation Example
 * Demonstrates using the text resource to test the AI Agent independently
 */

import { AIReceptionist } from '../src';

async function main() {
  // Create a simple AI agent for text generation
  const assistant = new AIReceptionist({
    agent: {
      identity: {
        name: 'Alex',
        role: 'AI Assistant',
        title: 'General Purpose Assistant'
      },
      personality: {
        traits: [
          { name: 'helpful', description: 'Always eager to help' },
          { name: 'concise', description: 'Gets to the point' }
        ],
        communicationStyle: {
          primary: 'professional',
          tone: ['clear', 'friendly']
        }
      },
      knowledge: {
        domain: 'General Knowledge',
        expertise: ['conversation', 'information retrieval']
      },
      goals: {
        primary: 'Provide helpful and accurate responses'
      }
    },
    model: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.7
    },
    providers: {},
    debug: true
  });

  // Initialize the SDK
  await assistant.initialize();

  console.log('='.repeat(60));
  console.log('Text Generation Example - Testing AI Agent');
  console.log('='.repeat(60));

  // Example 1: Simple text generation
  console.log('\n1. Simple Question:');
  const response1 = await assistant.text!.generate({
    prompt: 'What is your name and role?'
  });
  console.log(`Response: ${response1.text}`);

  // Example 2: Complex task
  console.log('\n2. Complex Task:');
  const response2 = await assistant.text!.generate({
    prompt: 'Explain the benefits of TypeScript in 3 bullet points',
    metadata: { context: 'documentation', audience: 'beginners' }
  });
  console.log(`Response: ${response2.text}`);

  // Example 3: Creative writing
  console.log('\n3. Creative Writing:');
  const response3 = await assistant.text!.generate({
    prompt: 'Write a haiku about programming'
  });
  console.log(`Response: ${response3.text}`);

  // Example 4: With conversation ID (for continuity)
  console.log('\n4. Conversation Continuity:');
  const conversationId = 'test-conversation-123';

  const response4a = await assistant.text!.generate({
    prompt: 'My favorite color is blue. Remember that.',
    conversationId
  });
  console.log(`Response: ${response4a.text}`);

  const response4b = await assistant.text!.generate({
    prompt: 'What is my favorite color?',
    conversationId
  });
  console.log(`Response: ${response4b.text}`);

  console.log('\n' + '='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));

  // Cleanup
  await assistant.dispose();
}

// Run the example
main().catch(error => {
  console.error('Error running example:', error);
  process.exit(1);
});
