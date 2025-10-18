/**
 * OpenRouter Model Switching Example
 *
 * Demonstrates how to dynamically switch between different AI models
 * at runtime using the OpenRouter provider.
 */

import { AIReceptionist } from '../src';
import { OPENROUTER_MODELS } from '../src/providers/ai/openrouter.provider';

async function main() {
  // Initialize receptionist with OpenRouter
  const receptionist = new AIReceptionist({
    ai: {
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY!,
      model: OPENROUTER_MODELS.anthropic.claude35Sonnet, // Start with Claude
    },
    agent: {
      name: 'Alex',
      role: 'AI Assistant',
      personality: 'Helpful and professional',
    },
  });

  await receptionist.initialize();

  // Get the OpenRouter provider instance
  const provider = receptionist['aiProvider'];
  if (provider.name !== 'openrouter') {
    throw new Error('Expected OpenRouter provider');
  }

  console.log('\n=== OpenRouter Model Switching Demo ===\n');

  // Example 1: Using Claude 3.5 Sonnet
  console.log('1. Using Claude 3.5 Sonnet:');
  console.log('Current model:', provider.getCurrentModel());

  const response1 = await receptionist.chat('user-1', {
    message: 'Explain quantum computing in one sentence.',
  });
  console.log('Response:', response1.content);
  console.log();

  // Example 2: Switch to GPT-4 Turbo
  console.log('2. Switching to GPT-4 Turbo:');
  provider.setModel(OPENROUTER_MODELS.openai.gpt4Turbo);
  console.log('Current model:', provider.getCurrentModel());

  const response2 = await receptionist.chat('user-1', {
    message: 'Explain machine learning in one sentence.',
  });
  console.log('Response:', response2.content);
  console.log();

  // Example 3: Switch to Google Gemini Pro
  console.log('3. Switching to Google Gemini Pro:');
  provider.setModel(OPENROUTER_MODELS.google.geminiPro15);
  console.log('Current model:', provider.getCurrentModel());

  const response3 = await receptionist.chat('user-1', {
    message: 'Explain neural networks in one sentence.',
  });
  console.log('Response:', response3.content);
  console.log();

  // Example 4: Switch to Meta Llama 3
  console.log('4. Switching to Meta Llama 3 70B:');
  provider.setModel(OPENROUTER_MODELS.meta.llama3_70b);
  console.log('Current model:', provider.getCurrentModel());

  const response4 = await receptionist.chat('user-1', {
    message: 'Explain deep learning in one sentence.',
  });
  console.log('Response:', response4.content);
  console.log();

  // Example 5: List all available models
  console.log('5. Listing all available models:');
  const models = await provider.listAvailableModels();
  console.log(`Found ${models.length} available models`);

  // Group by provider
  const byProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model.id);
    return acc;
  }, {} as Record<string, string[]>);

  console.log('\nModels by provider:');
  Object.entries(byProvider).forEach(([provider, modelIds]) => {
    console.log(`  ${provider}: ${modelIds.length} models`);
    console.log(`    ${modelIds.slice(0, 3).join(', ')}${modelIds.length > 3 ? '...' : ''}`);
  });
  console.log();

  // Example 6: Validate a model before switching
  console.log('6. Validating model before switching:');
  const modelToTest = 'anthropic/claude-3-opus';
  const isValid = await provider.validateModel(modelToTest);
  console.log(`Model "${modelToTest}" is ${isValid ? 'valid' : 'invalid'}`);

  if (isValid) {
    provider.setModel(modelToTest);
    console.log('Switched to:', provider.getCurrentModel());
  }
  console.log();

  // Example 7: Error handling for invalid model
  console.log('7. Testing error handling:');
  try {
    provider.setModel('invalid-model'); // Missing '/'
  } catch (error) {
    console.log('Caught expected error:', (error as Error).message);
  }
  console.log();

  // Example 8: Custom model (any OpenRouter supported model)
  console.log('8. Using a custom model string:');
  provider.setModel('mistralai/mixtral-8x7b-instruct');
  console.log('Current model:', provider.getCurrentModel());

  const response5 = await receptionist.chat('user-1', {
    message: 'Explain transformers in one sentence.',
  });
  console.log('Response:', response5.content);
  console.log();

  await receptionist.dispose();
  console.log('=== Demo Complete ===\n');
}

// Run the example
main().catch(console.error);
