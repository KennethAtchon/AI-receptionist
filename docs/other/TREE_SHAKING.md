# Tree-Shaking & Bundle Optimization Guide

The AI Receptionist SDK is built with tree-shaking in mind, allowing you to minimize your bundle size by only including the features you actually use.

## How It Works

The SDK uses **dynamic imports (lazy loading)** internally, which means:
- ✅ Providers are only loaded when you configure them
- ✅ Resources are only bundled when you use them
- ✅ Unused AI providers (OpenAI, OpenRouter) are excluded from your bundle
- ✅ Code-splitting creates separate chunks for each feature

## Bundle Size Comparison

### Before Tree-Shaking
```
Full bundle: 44 KB (everything included)
```

### After Tree-Shaking (ESM)
```
Core (always included):  24.75 KB
+ OpenAI provider:        0.12 KB (only if used)
+ OpenRouter provider:    4.70 KB (only if used)
+ Twilio provider:        0.12 KB (only if used)
+ Calendar provider:      0.13 KB (only if used)
+ Call service:           0.08 KB (only if used)
+ SMS resource:           0.08 KB (only if used)
+ Email resource:         0.08 KB (only if used)
```

**Example:** If you only use SMS with OpenAI:
- Core: 24.75 KB
- OpenAI: 0.12 KB
- Twilio: 0.12 KB
- SMS: 0.08 KB
- **Total: ~25 KB** (vs 44 KB without tree-shaking)

## Usage

### Standard Usage (Automatic Tree-Shaking)

The SDK automatically tree-shakes based on your configuration:

```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';

// Only OpenAI + Twilio + SMS will be bundled
const client = new AIReceptionist({
  agent: {
    name: 'Sarah',
    role: 'Sales Rep'
  },
  model: {
    provider: 'openai',  // ✅ Only OpenAI bundled
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4'
  },
  providers: {
    communication: {
      twilio: {  // ✅ Only Twilio bundled
        accountSid: process.env.TWILIO_ACCOUNT_SID!,
        authToken: process.env.TWILIO_AUTH_TOKEN!,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER!
      }
      // No SendGrid = SendGrid NOT bundled ✅
    }
    // No calendar = Calendar NOT bundled ✅
  }
});

await client.initialize();

// SMS resource loaded on demand
await client.sms.send({ to: '+1234567890', body: 'Hello!' });

// Calls NOT used = Call service NOT bundled ✅
```

### Advanced: Granular Imports (Maximum Optimization)

For advanced users who want complete control:

```typescript
// Import only types (zero runtime cost)
import type { AIModelConfig, AgentConfig } from '@loctelli/ai-receptionist/types';

// Import specific providers
import { OpenAIProvider } from '@loctelli/ai-receptionist/providers/openai';
import { TwilioProvider } from '@loctelli/ai-receptionist/providers/twilio';

// Build your own client
const aiProvider = new OpenAIProvider(
  { provider: 'openai', apiKey: '...', model: 'gpt-4' },
  { name: 'Sarah', role: 'Sales' }
);

const twilioProvider = new TwilioProvider({
  accountSid: '...',
  authToken: '...',
  phoneNumber: '...'
});

await aiProvider.initialize();
await twilioProvider.initialize();
```

## Available Exports

### Main Client
```typescript
import { AIReceptionist } from '@loctelli/ai-receptionist';
// or
import { AIReceptionist } from '@loctelli/ai-receptionist/client';
```

### Providers
```typescript
import { OpenAIProvider } from '@loctelli/ai-receptionist/providers/openai';
import { OpenRouterProvider } from '@loctelli/ai-receptionist/providers/openrouter';
import { TwilioProvider } from '@loctelli/ai-receptionist/providers/twilio';
import { GoogleCalendarProvider } from '@loctelli/ai-receptionist/providers/google-calendar';
```

### Resources
```typescript
import { CallsResource } from '@loctelli/ai-receptionist/resources/calls';
import { SMSResource } from '@loctelli/ai-receptionist/resources/sms';
import { EmailResource } from '@loctelli/ai-receptionist/resources/email';
```

### Tools
```typescript
import { Tools, ToolRegistry, ToolBuilder } from '@loctelli/ai-receptionist/tools';
```

### Types
```typescript
import type {
  AIReceptionistConfig,
  AgentConfig,
  ITool,
  // ... and more
} from '@loctelli/ai-receptionist/types';
```

## Optimization Tips

### 1. Use ESM Imports
Always use ESM imports for best tree-shaking:
```typescript
// ✅ Good (tree-shakable)
import { AIReceptionist } from '@loctelli/ai-receptionist';

// ❌ Bad (not tree-shakable)
const { AIReceptionist } = require('@loctelli/ai-receptionist');
```

### 2. Configure Only What You Need
```typescript
// ❌ Bad: Bundles both OpenAI and OpenRouter chunks
providers: {
  communication: {
    twilio: { ... },
    sendgrid: { ... }  // Don't add if not using
  },
  calendar: {
    google: { ... }  // Don't add if not using
  }
}

// ✅ Good: Only bundles what you use
providers: {
  communication: {
    twilio: { ... }  // Only this is bundled
  }
}
```

### 3. Type-Only Imports
When you only need types, use `import type`:
```typescript
// ✅ Zero runtime cost
import type { AIModelConfig, AgentConfig } from '@loctelli/ai-receptionist/types';

// ❌ Includes runtime code
import { AIModelConfig, AgentConfig } from '@loctelli/ai-receptionist/types';
```

## Bundler Configuration

### Webpack
```javascript
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false
  }
};
```

### Vite
```javascript
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ai-receptionist': ['@loctelli/ai-receptionist']
        }
      }
    }
  }
};
```

### Next.js
Tree-shaking works automatically with Next.js 13+ App Router:
```typescript
// app/api/sms/route.ts
import { AIReceptionist } from '@loctelli/ai-receptionist';
// Only SMS-related code is included in this route's bundle
```

## Bundle Analysis

To analyze your bundle and verify tree-shaking:

### Next.js
```bash
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({});
```

```bash
ANALYZE=true npm run build
```

### Webpack Bundle Analyzer
```bash
npm install webpack-bundle-analyzer
```

### Rollup Visualizer
```bash
npm install rollup-plugin-visualizer
```

## Common Patterns

### Pattern 1: SMS-Only Service
```typescript
// Minimal bundle: Core + OpenAI + Twilio + SMS (~25 KB)
const client = new AIReceptionist({
  agent: { name: 'Bot', role: 'SMS Agent' },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' },
  providers: {
    communication: { twilio: { ... } }
  }
});

await client.initialize();
await client.sms.send({ to: '...', body: '...' });
```

### Pattern 2: Calls-Only Service
```typescript
// Bundle: Core + OpenAI + Twilio + Calls (~26 KB)
const client = new AIReceptionist({
  agent: { name: 'Bot', role: 'Voice Agent' },
  model: { provider: 'openai', apiKey: '...', model: 'gpt-4' },
  providers: {
    communication: { twilio: { ... } }
  }
});

await client.initialize();
await client.calls.make({ to: '...' });
```

### Pattern 3: Multi-Model Setup
```typescript
// Bundle: Core + OpenRouter + Twilio + SMS (~30 KB)
const client = new AIReceptionist({
  agent: { name: 'Bot', role: 'Agent' },
  model: {
    provider: 'openrouter',  // Try different models
    apiKey: '...',
    model: 'anthropic/claude-3-sonnet'
  },
  providers: {
    communication: { twilio: { ... } }
  }
});
```

## Performance Benefits

- **Faster Initial Load**: Smaller bundles = faster page load
- **Better Caching**: Code-split chunks cache independently
- **Reduced Memory**: Less JavaScript parsed and compiled
- **Lower Bandwidth**: Especially important for mobile users

## Verification

Check your bundle includes only what you need:

```bash
# Build your app
npm run build

# Check the bundle
# Look for @loctelli/ai-receptionist chunks
# Only configured providers should appear
```

Expected bundle contents:
- ✅ `index.mjs` (core, always included)
- ✅ Provider chunks (only if configured)
- ✅ Resource chunks (only if used)
- ❌ Unused providers (should NOT appear)

---

**Questions?** Report issues at: https://github.com/KennethAtchon/Loctelli/issues
