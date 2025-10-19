# OpenRouter Provider - Dynamic Model Switching

The OpenRouter provider allows you to access **100+ AI models** from multiple providers through a single API and switch between them dynamically at runtime.

## Overview

OpenRouter acts as a unified gateway to models from:
- **OpenAI**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- **Google**: Gemini Pro, Gemini Pro 1.5
- **Meta**: Llama 3 70B/8B
- **Mistral**: Mistral Large, Medium, Mixtral
- **And many more...**

## Key Features

### 1. Dynamic Model Switching
Switch between different AI models at runtime without reinitializing:

```typescript
import { AIReceptionist, OPENROUTER_MODELS } from '@loctelli/ai-receptionist';

const client = new AIReceptionist({
  ai: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY!,
    model: OPENROUTER_MODELS.anthropic.claude35Sonnet,
  },
  agent: { name: 'Alex', role: 'Assistant' }
});

await client.initialize();

// Access the provider
const provider = client['aiProvider'];

// Start with Claude
await client.chat('user-1', { message: 'Hello!' });

// Switch to GPT-4
provider.setModel(OPENROUTER_MODELS.openai.gpt4Turbo);
await client.chat('user-1', { message: 'Continue...' });

// Switch to Gemini
provider.setModel(OPENROUTER_MODELS.google.geminiPro15);
await client.chat('user-1', { message: 'More info...' });
```

### 2. Model Discovery
List all available models from OpenRouter:

```typescript
const models = await provider.listAvailableModels();

// Group by provider
const byProvider = models.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = [];
  }
  acc[model.provider].push(model.id);
  return acc;
}, {} as Record<string, string[]>);

console.log('Available models by provider:');
Object.entries(byProvider).forEach(([provider, modelIds]) => {
  console.log(`${provider}: ${modelIds.length} models`);
});
```

### 3. Model Validation
Validate a model before switching:

```typescript
const modelToUse = 'anthropic/claude-3-opus';
const isValid = await provider.validateModel(modelToUse);

if (isValid) {
  provider.setModel(modelToUse);
  console.log('Switched to:', provider.getCurrentModel());
} else {
  console.error('Invalid model:', modelToUse);
}
```

### 4. Get Current Model
Check which model is currently active:

```typescript
const currentModel = provider.getCurrentModel();
console.log('Currently using:', currentModel);
```

## Available Model Constants

For convenience, commonly used models are available as constants:

```typescript
import { OPENROUTER_MODELS } from '@loctelli/ai-receptionist';

// OpenAI models
OPENROUTER_MODELS.openai.gpt4Turbo      // 'openai/gpt-4-turbo'
OPENROUTER_MODELS.openai.gpt4           // 'openai/gpt-4'
OPENROUTER_MODELS.openai.gpt35Turbo     // 'openai/gpt-3.5-turbo'

// Anthropic models
OPENROUTER_MODELS.anthropic.claude35Sonnet  // 'anthropic/claude-3.5-sonnet'
OPENROUTER_MODELS.anthropic.claude3Opus     // 'anthropic/claude-3-opus'
OPENROUTER_MODELS.anthropic.claude3Sonnet   // 'anthropic/claude-3-sonnet'
OPENROUTER_MODELS.anthropic.claude3Haiku    // 'anthropic/claude-3-haiku'

// Google models
OPENROUTER_MODELS.google.geminiPro      // 'google/gemini-pro'
OPENROUTER_MODELS.google.geminiPro15    // 'google/gemini-pro-1.5'

// Meta models
OPENROUTER_MODELS.meta.llama3_70b       // 'meta-llama/llama-3-70b-instruct'
OPENROUTER_MODELS.meta.llama3_8b        // 'meta-llama/llama-3-8b-instruct'

// Mistral models
OPENROUTER_MODELS.mistral.mistralLarge  // 'mistralai/mistral-large'
OPENROUTER_MODELS.mistral.mistralMedium // 'mistralai/mistral-medium'
OPENROUTER_MODELS.mistral.mixtral       // 'mistralai/mixtral-8x7b-instruct'
```

## Custom Model Identifiers

You can also use any model identifier supported by OpenRouter:

```typescript
// Use any OpenRouter model by ID
provider.setModel('cohere/command-r-plus');
provider.setModel('perplexity/llama-3-sonar-large-32k-online');
provider.setModel('anthropic/claude-3-opus:beta');
```

## Use Cases

### 1. A/B Testing Different Models
```typescript
const models = [
  OPENROUTER_MODELS.openai.gpt4Turbo,
  OPENROUTER_MODELS.anthropic.claude35Sonnet,
  OPENROUTER_MODELS.google.geminiPro15,
];

for (const model of models) {
  provider.setModel(model);
  const response = await client.chat('test-user', {
    message: 'What is the capital of France?'
  });
  console.log(`${model}:`, response.content);
}
```

### 2. Cost Optimization
```typescript
// Use cheaper model for simple queries
provider.setModel(OPENROUTER_MODELS.openai.gpt35Turbo);
const simpleResponse = await client.chat('user-1', {
  message: 'What time is it?'
});

// Use more powerful model for complex tasks
provider.setModel(OPENROUTER_MODELS.anthropic.claude3Opus);
const complexResponse = await client.chat('user-1', {
  message: 'Analyze this complex business scenario...'
});
```

### 3. Fallback Strategy
```typescript
const preferredModel = OPENROUTER_MODELS.anthropic.claude35Sonnet;
const fallbackModel = OPENROUTER_MODELS.openai.gpt4Turbo;

try {
  provider.setModel(preferredModel);
  const response = await client.chat('user-1', { message: 'Hello' });
} catch (error) {
  console.warn('Primary model failed, falling back...');
  provider.setModel(fallbackModel);
  const response = await client.chat('user-1', { message: 'Hello' });
}
```

### 4. Specialized Model Selection
```typescript
// Use coding-specialized model for code tasks
if (userMessage.includes('code') || userMessage.includes('function')) {
  provider.setModel('openai/gpt-4-turbo');
}
// Use reasoning model for complex problems
else if (userMessage.includes('analyze') || userMessage.includes('explain')) {
  provider.setModel('anthropic/claude-3-opus');
}
// Use fast model for simple queries
else {
  provider.setModel('openai/gpt-3.5-turbo');
}
```

## API Reference

### Methods

#### `setModel(model: string): void`
Switch to a different model at runtime.

**Parameters:**
- `model` - Model identifier (e.g., 'anthropic/claude-3-opus')

**Throws:**
- Error if model identifier is invalid format

**Example:**
```typescript
provider.setModel(OPENROUTER_MODELS.anthropic.claude3Opus);
```

---

#### `getCurrentModel(): string`
Get the currently active model identifier.

**Returns:**
- Current model identifier string

**Example:**
```typescript
const current = provider.getCurrentModel();
console.log('Using:', current);
```

---

#### `listAvailableModels(): Promise<Array<{ id: string; name: string; provider: string }>>`
List all available models from OpenRouter.

**Returns:**
- Promise resolving to array of model objects

**Example:**
```typescript
const models = await provider.listAvailableModels();
models.forEach(m => {
  console.log(`${m.provider}/${m.id}: ${m.name}`);
});
```

---

#### `validateModel(model: string): Promise<boolean>`
Validate if a model is available on OpenRouter.

**Parameters:**
- `model` - Model identifier to validate

**Returns:**
- Promise resolving to true if valid, false otherwise

**Example:**
```typescript
const isValid = await provider.validateModel('anthropic/claude-3-opus');
if (isValid) {
  provider.setModel('anthropic/claude-3-opus');
}
```

## Implementation Details

### OpenAI-Compatible API
OpenRouter uses an OpenAI-compatible API interface, which means:
- It accepts the same request/response format as OpenAI
- The SDK uses the OpenAI client library with a custom base URL
- All OpenAI features (function calling, streaming, etc.) are supported

### Model Format
Model identifiers follow the format: `provider/model-name`
- ✅ Valid: `'anthropic/claude-3-opus'`
- ✅ Valid: `'openai/gpt-4-turbo'`
- ❌ Invalid: `'claude-3-opus'` (missing provider)
- ❌ Invalid: `'gpt4'` (missing provider and separator)

### Error Handling
```typescript
try {
  provider.setModel('invalid-format');
} catch (error) {
  // Error: Invalid model identifier format. Expected format: "provider/model-name"
}

try {
  const isValid = await provider.validateModel('fake/model');
  // Returns false if model doesn't exist
} catch (error) {
  // Network or API errors
}
```

## Best Practices

1. **Validate Before Switching**: Always validate models in production before switching
2. **Handle Errors**: Implement fallback strategies for model unavailability
3. **Log Model Changes**: Track which models are used for debugging and analytics
4. **Cost Awareness**: Different models have different costs - monitor usage
5. **Performance Testing**: Test response quality and latency across models
6. **Rate Limits**: Be aware of rate limits per model/provider

## Examples

See [examples/openrouter-model-switching.ts](../examples/openrouter-model-switching.ts) for a comprehensive example demonstrating all features.

## Getting an API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Generate an API key in your account settings
3. Set it as an environment variable:
   ```bash
   export OPENROUTER_API_KEY=your-key-here
   ```

## Pricing

OpenRouter charges per-model pricing based on the provider. Check [openrouter.ai/models](https://openrouter.ai/models) for current pricing.

## Support

- OpenRouter Documentation: https://openrouter.ai/docs
- Model List: https://openrouter.ai/models
- SDK Issues: https://github.com/your-org/ai-receptionist/issues
