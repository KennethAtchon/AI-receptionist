/**
 * Provider Registry Configuration
 * Central registry of all providers - single source of truth
 */

import type { ProviderMetadata } from './provider-metadata';

export const PROVIDER_REGISTRY: Record<string, ProviderMetadata> = {
  openai: {
    name: 'openai',
    type: 'ai',
    category: 'ai',
    factory: () => import('../categories/ai/openai').then(m => ({ default: m.OpenAIProvider })),
    validatorFactory: () => import('../validation/openai').then(m => ({ default: m.OpenAIValidator })),
    configPath: 'model',
    required: true,
    // AI provider is selected via model.provider, so we check that in the factory
  },
  openrouter: {
    name: 'openrouter',
    type: 'ai',
    category: 'ai',
    factory: () => import('../categories/ai/openrouter').then(m => ({ default: m.OpenRouterProvider })),
    validatorFactory: () => import('../validation/openai').then(m => ({ default: m.OpenAIValidator })),
    configPath: 'model',
    required: true,
    // AI provider is selected via model.provider
  },
  twilio: {
    name: 'twilio',
    type: 'api',
    category: 'twilio',
    factory: () => import('../categories/twilio').then(m => ({ default: m.TwilioProvider })),
    validatorFactory: () => import('../validation/twilio').then(m => ({ default: m.TwilioValidator })),
    configPath: 'providers.communication.twilio',
    required: false,
  },
  google: {
    name: 'google',
    type: 'api',
    category: 'google',
    factory: () => import('../categories/google').then(m => ({ default: m.GoogleProvider })),
    validatorFactory: () => import('../validation/google').then(m => ({ default: m.GoogleValidator })),
    configPath: 'providers.calendar.google',
    required: false,
  },
  postmark: {
    name: 'postmark',
    type: 'email',
    category: 'email',
    factory: () => import('../categories/email/postmark').then(m => ({ default: m.PostmarkProvider })),
    validatorFactory: () => import('../validation/postmark').then(m => ({ default: m.PostmarkValidator })),
    configPath: 'providers.email.postmark',
    required: false,
  },
};

