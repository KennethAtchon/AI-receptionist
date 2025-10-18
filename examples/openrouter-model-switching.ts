/**
 * OpenRouter Model Switching Example
 *
 * Demonstrates how to dynamically switch between different AI models
 * at runtime using the OpenRouter provider.
 */

import { AIReceptionist, logger } from '../src';
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

  logger.info('\n=== OpenRouter Model Switching Demo ===\n');

  // Example 1: Using Claude 3.5 Sonnet
  logger.info('1. Using Claude 3.5 Sonnet:');
  logger.info('Current model:', provider.getCurrentModel());

  const response1 = await receptionist.chat('user-1', {
    message: 'Explain quantum computing in one sentence.',
  });
  logger.info('Response:', response1.content);
  logger.info('');

  // Example 2: Switch to GPT-4 Turbo
  logger.info('2. Switching to GPT-4 Turbo:');
  provider.setModel(OPENROUTER_MODELS.openai.gpt4Turbo);
  logger.info('Current model:', provider.getCurrentModel());

  const response2 = await receptionist.chat('user-1', {
    message: 'Explain machine learning in one sentence.',
  });
  logger.info('Response:', response2.content);
  logger.info('');

  // Example 3: Switch to Google Gemini Pro
  logger.info('3. Switching to Google Gemini Pro:');
  provider.setModel(OPENROUTER_MODELS.google.geminiPro15);
  logger.info('Current model:', provider.getCurrentModel());

  const response3 = await receptionist.chat('user-1', {
    message: 'Explain neural networks in one sentence.',
  });
  logger.info('Response:', response3.content);
  logger.info('');

  // Example 4: Switch to Meta Llama 3
  logger.info('4. Switching to Meta Llama 3 70B:');
  provider.setModel(OPENROUTER_MODELS.meta.llama3_70b);
  logger.info('Current model:', provider.getCurrentModel());

  const response4 = await receptionist.chat('user-1', {
    message: 'Explain deep learning in one sentence.',
  });
  logger.info('Response:', response4.content);
  logger.info('');

  // Example 5: List all available models
  logger.info('5. Listing all available models:');
  const models = await provider.listAvailableModels();
  logger.info(`Found ${models.length} available models`);

  // Group by provider
  const byProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model.id);
    return acc;
  }, {} as Record<string, string[]>);

  logger.info('\nModels by provider:');
  Object.entries(byProvider).forEach(([provider, modelIds]) => {
    logger.info(`  ${provider}: ${modelIds.length} models`);
    logger.info(`    ${modelIds.slice(0, 3).join(', ')}${modelIds.length > 3 ? '...' : ''}`);
  });
  logger.info('');

  // Example 6: Validate a model before switching
  logger.info('6. Validating model before switching:');
  const modelToTest = 'anthropic/claude-3-opus';
  const isValid = await provider.validateModel(modelToTest);
  logger.info(`Model "${modelToTest}" is ${isValid ? 'valid' : 'invalid'}`);

  if (isValid) {
    provider.setModel(modelToTest);
    logger.info('Switched to:', provider.getCurrentModel());
  }
  logger.info('');

  // Example 7: Error handling for invalid model
  logger.info('7. Testing error handling:');
  try {
    provider.setModel('invalid-model'); // Missing '/'
  } catch (error) {
    logger.info('Caught expected error:', (error as Error).message);
  }
  logger.info('');

  // Example 8: Custom model (any OpenRouter supported model)
  logger.info('8. Using a custom model string:');
  provider.setModel('mistralai/mixtral-8x7b-instruct');
  logger.info('Current model:', provider.getCurrentModel());

  const response5 = await receptionist.chat('user-1', {
    message: 'Explain transformers in one sentence.',
  });
  logger.info('Response:', response5.content);
  logger.info('');

  await receptionist.dispose();
  logger.info('=== Demo Complete ===\n');
}

// Run the example
main().catch(console.error);
