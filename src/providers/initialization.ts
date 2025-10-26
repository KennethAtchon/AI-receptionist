/**
 * Provider Initialization Module
 * Handles registration and validation of all providers
 */

import { ProviderRegistry } from './core/provider-registry';
import { TwilioValidator } from './validation/twilio-validator';
import { OpenAIValidator } from './validation/openai-validator';
import { GoogleValidator } from './validation/google-validator';
import { PostmarkValidator } from './validation/postmark-validator';
import type { AIReceptionistConfig } from '../types';
import type { OpenAIProvider, OpenRouterProvider, TwilioProvider, GoogleProvider } from './index';
import type { PostmarkProvider } from './index';
import { logger } from '../utils/logger';

/**
 * Initialize all configured providers
 * Returns registry with registered providers
 */
export async function initializeProviders(
  config: AIReceptionistConfig
): Promise<ProviderRegistry> {
  const registry = new ProviderRegistry();

  // 1. Register AI provider (always required)
  await registerAIProvider(registry, config);

  // 2. Register communication providers (optional)
  await registerCommunicationProviders(registry, config);

  // 3. Register calendar providers (optional)
  await registerCalendarProviders(registry, config);

  // 4. Register email providers (optional)
  await registerEmailProviders(registry, config);

  // 5. Validate all registered providers (fail fast)
  logger.info('[ProviderInit] Validating provider credentials...');
  await registry.validateAll();
  logger.info('[ProviderInit] All credentials validated successfully');

  return registry;
}

/**
 * Register AI provider based on config
 */
async function registerAIProvider(
  registry: ProviderRegistry,
  config: AIReceptionistConfig
): Promise<void> {
  registry.registerIfConfigured(
    'ai',
    async () => {
      switch (config.model.provider) {
        case 'openai': {
          const { OpenAIProvider } = await import('./ai/openai.provider');
          return new OpenAIProvider(config.model);
        }
        case 'openrouter': {
          const { OpenRouterProvider } = await import('./ai/openrouter.provider');
          return new OpenRouterProvider(config.model);
        }
        case 'anthropic':
        case 'google':
          throw new Error(`${config.model.provider} provider not yet implemented`);
        default:
          throw new Error(`Unknown AI provider: ${config.model.provider}`);
      }
    },
    new OpenAIValidator(),
    config.model
  );

  logger.info(`[ProviderInit] Registered AI provider: ${config.model.provider}`);
}

/**
 * Register communication providers (Twilio, etc.)
 */
async function registerCommunicationProviders(
  registry: ProviderRegistry,
  config: AIReceptionistConfig
): Promise<void> {
  // Register Twilio if configured
  if (config.providers?.communication?.twilio) {
    registry.registerIfConfigured(
      'twilio',
      async () => {
        const { TwilioProvider } = await import('./index');
        return new TwilioProvider(config.providers!.communication!.twilio!);
      },
      new TwilioValidator(),
      config.providers.communication.twilio
    );

    logger.info('[ProviderInit] Registered communication provider: twilio');
  }
}

/**
 * Register calendar providers (Google Calendar, etc.)
 */
async function registerCalendarProviders(
  registry: ProviderRegistry,
  config: AIReceptionistConfig
): Promise<void> {
  // Register Google Calendar if configured
  if (config.providers?.calendar?.google) {
    registry.registerIfConfigured(
      'google',
      async () => {
        const { GoogleProvider } = await import('./index');
        return new GoogleProvider(config.providers!.calendar!.google!);
      },
      new GoogleValidator(),
      config.providers.calendar.google
    );

    logger.info('[ProviderInit] Registered calendar provider: google');
  }
}

/**
 * Get AI provider from registry
 */
export async function getAIProvider(
  registry: ProviderRegistry
): Promise<OpenAIProvider | OpenRouterProvider> {
  return registry.get<OpenAIProvider | OpenRouterProvider>('ai');
}

/**
 * Get Twilio provider from registry (if exists)
 */
export async function getTwilioProvider(
  registry: ProviderRegistry
): Promise<TwilioProvider | undefined> {
  return registry.has('twilio')
    ? registry.get<TwilioProvider>('twilio')
    : undefined;
}

/**
 * Get Google provider from registry (if exists)
 */
export async function getGoogleProvider(
  registry: ProviderRegistry
): Promise<GoogleProvider | undefined> {
  return registry.has('google')
    ? registry.get<GoogleProvider>('google')
    : undefined;
}

/**
 * Register email providers (Postmark only)
 */
async function registerEmailProviders(
  registry: ProviderRegistry,
  config: AIReceptionistConfig
): Promise<void> {
  const emailConfig = config.providers?.email;

  if (!emailConfig) {
    logger.info('[ProviderInit] No email providers configured');
    return;
  }

  // Register Postmark if configured
  if (emailConfig.postmark) {
    registry.registerIfConfigured(
      'postmark',
      async () => {
        const { PostmarkProvider } = await import('./email/postmark.provider');
        return new PostmarkProvider(emailConfig.postmark!);
      },
      new PostmarkValidator(),
      emailConfig.postmark
    );

    logger.info('[ProviderInit] Registered email provider: postmark');
  }
}

/**
 * Get Postmark provider from registry (if exists)
 */
export async function getPostmarkProvider(
  registry: ProviderRegistry
): Promise<PostmarkProvider | undefined> {
  return registry.has('postmark')
    ? registry.get<PostmarkProvider>('postmark')
    : undefined;
}
