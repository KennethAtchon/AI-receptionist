/**
 * Text Flow Test
 * End-to-end test of the simple text channel flow
 * Tests: User Input → TextResource → Agent → Tools → Response
 */

import { AIReceptionist } from '../src';

async function testTextFlow() {
  console.log('🚀 Starting Text Flow Test');
  console.log('='.repeat(50));

  try {
    // Initialize the AI Receptionist with minimal config
    const client = new AIReceptionist({
      agent: {
        identity: {
          name: 'TestBot',
          role: 'AI Assistant',
          title: 'Test Assistant'
        },
        personality: {
          traits: [
            { name: 'helpful', description: 'Always helpful' },
            { name: 'friendly', description: 'Warm and approachable' }
          ],
          communicationStyle: {
            primary: 'conversational',
            tone: ['friendly', 'clear']
          }
        },
        knowledge: {
          domain: 'General',
          expertise: ['conversation', 'help']
        },
        goals: {
          primary: 'Help users with their questions'
        }
      },
      model: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        model: 'gpt-4',
        temperature: 0.7
      },
      providers: {},
      debug: true
    });

    console.log('📋 Initializing client...');
    await client.initialize();
    console.log('✅ Client initialized successfully');

    // Test 1: Simple text generation
    console.log('\n🧪 Test 1: Simple Text Generation');
    console.log('-'.repeat(30));
    
    const response1 = await client.text!.generate({
      prompt: 'Hello! What is your name and what can you help me with?'
    });
    
    console.log(`📝 User: Hello! What is your name and what can you help me with?`);
    console.log(`🤖 Bot: ${response1.text}`);
    console.log(`📊 Metadata:`, response1.metadata);

    // Test 2: Tool usage (if tools are available)
    console.log('\n🧪 Test 2: Tool Usage Test');
    console.log('-'.repeat(30));
    
    const response2 = await client.text!.generate({
      prompt: 'Can you help me book a meeting for tomorrow at 2 PM?',
      conversationId: 'test-conversation-123'
    });
    
    console.log(`📝 User: Can you help me book a meeting for tomorrow at 2 PM?`);
    console.log(`🤖 Bot: ${response2.text}`);
    console.log(`📊 Metadata:`, response2.metadata);

    // Test 3: Conversation continuity
    console.log('\n🧪 Test 3: Conversation Continuity');
    console.log('-'.repeat(30));
    
    const response3a = await client.text!.generate({
      prompt: 'My name is John and I work in marketing.',
      conversationId: 'test-conversation-123'
    });
    
    console.log(`📝 User: My name is John and I work in marketing.`);
    console.log(`🤖 Bot: ${response3a.text}`);

    const response3b = await client.text!.generate({
      prompt: 'What do you know about me?',
      conversationId: 'test-conversation-123'
    });
    
    console.log(`📝 User: What do you know about me?`);
    console.log(`🤖 Bot: ${response3b.text}`);

    // Test 4: Complex request with tools
    console.log('\n🧪 Test 4: Complex Request');
    console.log('-'.repeat(30));
    
    const response4 = await client.text!.generate({
      prompt: 'I need to send an SMS to +1234567890 saying "Meeting confirmed for tomorrow at 2 PM" and also check my calendar availability.',
      conversationId: 'test-conversation-123'
    });
    
    console.log(`📝 User: I need to send an SMS to +1234567890 saying "Meeting confirmed for tomorrow at 2 PM" and also check my calendar availability.`);
    console.log(`🤖 Bot: ${response4.text}`);
    console.log(`📊 Metadata:`, response4.metadata);

    console.log('\n✅ All tests completed successfully!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (client) {
      await client.dispose();
      console.log('🧹 Cleanup completed');
    }
  }
}

// Run the test
if (require.main === module) {
  testTextFlow().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { testTextFlow };
