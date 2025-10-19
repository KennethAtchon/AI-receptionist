/**
 * Example: Using the SystemPromptBuilder and PromptOptimizer
 *
 * This example demonstrates how to build and optimize system prompts
 * from the six core agent pillars
 */

import { SystemPromptBuilder } from '../prompt/SystemPromptBuilder';
import { PromptOptimizer, SimpleTokenizer } from '../prompt/PromptOptimizer';
import { Identity as IdentityImpl } from '../identity/Identity';
import { PersonalityEngineImpl } from '../personality/PersonalityEngine';
import { KnowledgeBaseImpl } from '../knowledge/KnowledgeBase';
import type { Goal, MemoryContext, PromptContext } from '../types';

/**
 * Example 1: Building a basic system prompt
 */
export async function exampleBasicPromptBuilding() {
  console.log('=== Example: Basic System Prompt Building ===\n');

  // Create identity
  const identity = new IdentityImpl({
    name: 'Sarah',
    role: 'Receptionist',
    title: 'Virtual Receptionist',
    backstory: 'Experienced receptionist with 5 years in medical offices',
    authorityLevel: 'medium',
    yearsOfExperience: 5,
    specializations: ['appointment scheduling', 'customer service']
  });

  // Create personality
  const personality = new PersonalityEngineImpl({
    traits: [
      { name: 'friendly', description: 'Warm and welcoming' },
      { name: 'professional', description: 'Maintains professionalism' }
    ],
    communicationStyle: {
      primary: 'empathetic',
      tone: 'friendly',
      formalityLevel: 6
    },
    emotionalIntelligence: 'high'
  });

  // Create knowledge base
  const knowledge = new KnowledgeBaseImpl({
    domain: 'Customer Service',
    expertise: ['appointment scheduling', 'phone etiquette'],
    languages: {
      fluent: ['English'],
      conversational: ['Spanish']
    },
    limitations: ['Cannot provide medical advice']
  });

  // Define goals
  const goals: Goal[] = [
    {
      name: 'Primary Goal',
      description: 'Provide excellent customer service and schedule appointments efficiently',
      type: 'primary',
      priority: 1,
      metric: '4.5/5.0 customer satisfaction',
      constraints: ['Never share confidential information', 'Always verify identity']
    },
    {
      name: 'Build Relationships',
      description: 'Build positive relationships with customers',
      type: 'secondary',
      priority: 2,
      constraints: []
    }
  ];

  // Create memory context (simulated)
  const memoryContext: MemoryContext = {
    shortTerm: [
      { role: 'user', content: 'I need to schedule an appointment', timestamp: new Date() },
      { role: 'assistant', content: 'I\'d be happy to help you schedule an appointment. What date works best for you?', timestamp: new Date() }
    ],
    longTerm: [
      {
        id: 'MEM-001',
        content: 'Customer prefers morning appointments',
        metadata: { customerId: 'CUST-123' },
        timestamp: new Date(),
        importance: 8,
        type: 'fact'
      }
    ],
    semantic: []
  };

  // Build the prompt
  const builder = new SystemPromptBuilder();
  const context: PromptContext = {
    identity,
    personality,
    knowledge,
    goals,
    capabilities: ['scheduling', 'customer-verification'],
    memoryContext,
    channel: 'call',
    maxTokens: 8000
  };

  const prompt = await builder.build(context);

  console.log('Generated System Prompt:');
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));
  console.log('\nPrompt length:', prompt.length, 'characters');
  console.log('Sections included:', builder.getSections().join(', '));
}

/**
 * Example 2: Optimizing and validating prompts
 */
export async function examplePromptOptimization() {
  console.log('\n\n=== Example: Prompt Optimization ===\n');

  // Create a sample prompt with issues
  const messyPrompt = `
# IDENTITY & ROLE

You are Sarah, a receptionist.
You are Sarah, a receptionist.


You have 5 years of experience.


You have 5 years of experience.

# GOALS

Your goal is to help customers.
  `.trim();

  console.log('Original (messy) prompt:');
  console.log('---');
  console.log(messyPrompt);
  console.log('---');
  console.log('Length:', messyPrompt.length, 'characters\n');

  // Optimize it
  const optimizer = new PromptOptimizer(new SimpleTokenizer());
  const optimized = await optimizer.optimize(messyPrompt, { maxTokens: 8000 });

  console.log('Optimized prompt:');
  console.log('---');
  console.log(optimized);
  console.log('---');
  console.log('Length:', optimized.length, 'characters');

  // Get statistics
  const stats = await optimizer.getStats(optimized);
  console.log('\nPrompt Statistics:');
  console.log('- Total tokens:', stats.totalTokens);
  console.log('- Total characters:', stats.totalChars);
  console.log('- Total lines:', stats.totalLines);
  console.log('- Sections:', stats.sections.length);

  for (const section of stats.sections) {
    console.log(`  - ${section.name}: ${section.tokens} tokens, ${section.chars} characters`);
  }
}

/**
 * Example 3: Handling prompt size limits
 */
export async function examplePromptSizeLimits() {
  console.log('\n\n=== Example: Handling Prompt Size Limits ===\n');

  // Create a very large prompt
  const largePrompt = `
# IDENTITY & ROLE

${'You are an agent with extensive experience. '.repeat(1000)}

# GOALS

${'Your goal is to achieve excellence. '.repeat(1000)}
  `.trim();

  console.log('Created a large prompt with', largePrompt.length, 'characters');

  const optimizer = new PromptOptimizer(new SimpleTokenizer());

  try {
    // This should throw because it exceeds the limit
    await optimizer.optimize(largePrompt, { maxTokens: 1000 });
  } catch (error: any) {
    if (error.name === 'PromptTooLargeError') {
      console.log('\n✓ Correctly detected prompt is too large!');
      console.log('Error message:', error.message);
      console.log('Details:');
      console.log('- Tokens:', error.details.tokens);
      console.log('- Max tokens:', error.details.maxTokens);
      console.log('- Largest sections:', Object.entries(error.details.sections)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 3)
        .map(([name, size]) => `${name}: ${size} tokens`)
        .join(', '));

      // Get optimization suggestions
      const suggestions = await optimizer.suggestOptimizations(largePrompt, 1000);
      console.log('\nOptimization suggestions:');
      suggestions.forEach(s => console.log('  ', s));
    } else {
      throw error;
    }
  }
}

/**
 * Example 4: Chat history compression
 */
export async function exampleChatHistoryCompression() {
  console.log('\n\n=== Example: Chat History Compression ===\n');

  // Create a long chat history
  const longHistory = [
    { role: 'user' as const, content: 'Hello, I need help', timestamp: new Date() },
    { role: 'assistant' as const, content: 'How can I help you?', timestamp: new Date() },
    { role: 'user' as const, content: 'I want to schedule an appointment', timestamp: new Date() },
    { role: 'assistant' as const, content: 'What date works for you?', timestamp: new Date() },
    { role: 'user' as const, content: 'How about next Tuesday?', timestamp: new Date() },
    { role: 'assistant' as const, content: 'Tuesday is available. What time?', timestamp: new Date() },
    { role: 'user' as const, content: '2 PM would be great', timestamp: new Date() },
    { role: 'assistant' as const, content: 'Perfect, I\'ll book you for Tuesday at 2 PM', timestamp: new Date() },
    { role: 'user' as const, content: 'Thank you!', timestamp: new Date() },
    { role: 'assistant' as const, content: 'You\'re welcome!', timestamp: new Date() }
  ];

  console.log('Original chat history:', longHistory.length, 'messages');

  const optimizer = new PromptOptimizer(new SimpleTokenizer());

  // Compress to fit in 200 tokens (without AI model, it will just truncate)
  const compressed = await optimizer.compressChatHistory(longHistory, 200);

  console.log('Compressed to:', compressed.length, 'messages');
  console.log('\nCompressed history:');
  compressed.forEach((msg, i) => {
    console.log(`${i + 1}. ${msg.role}: ${msg.content}`);
  });
}

/**
 * Run all examples
 */
export async function runPromptExamples() {
  console.log('='.repeat(80));
  console.log('PROMPT SYSTEM EXAMPLES');
  console.log('='.repeat(80));
  console.log('\n');

  await exampleBasicPromptBuilding();
  await examplePromptOptimization();
  await examplePromptSizeLimits();
  await exampleChatHistoryCompression();

  console.log('\n\n' + '='.repeat(80));
  console.log('Prompt examples completed successfully!');
  console.log('='.repeat(80) + '\n');
}

// If running this file directly
if (require.main === module) {
  runPromptExamples().catch(console.error);
}
