/**
 * Processor Initialization Module
 * Handles creation of all processor instances
 */

import type { ProviderRegistry } from '../providers/core/provider-registry';
import type { TwilioProvider, GoogleProvider } from '../providers';
import type { IEmailProvider } from '../providers/email/email-provider.interface';
import type { CallProcessor } from './call.processor';
import type { MessagingProcessor } from './messaging.processor';
import type { CalendarProcessor } from './calendar.processor';
import type { EmailProcessor } from './email.processor';
import { logger } from '../utils/logger';

export interface InitializedProcessors {
  callProcessor?: CallProcessor;
  messagingProcessor?: MessagingProcessor;
  calendarProcessor?: CalendarProcessor;
  emailProcessor?: EmailProcessor;
}

/**
 * Initialize all processors based on available providers
 */
export async function initializeProcessors(
  providerRegistry: ProviderRegistry
): Promise<InitializedProcessors> {
  const processors: InitializedProcessors = {};

  // 1. Initialize Twilio processors (if available)
  if (providerRegistry.has('twilio')) {
    await initializeTwilioProcessors(providerRegistry, processors);
  }

  // 2. Initialize Google Calendar processor (if available)
  if (providerRegistry.has('google')) {
    await initializeCalendarProcessor(providerRegistry, processors);
  }

  // 3. Initialize Email processor (if any email provider available)
  if (providerRegistry.has('resend') || providerRegistry.has('sendgrid') || providerRegistry.has('smtp')) {
    await initializeEmailProcessor(providerRegistry, processors);
  }

  // Log summary
  const availableProcessors = [
    processors.callProcessor ? 'call' : null,
    processors.messagingProcessor ? 'messaging' : null,
    processors.calendarProcessor ? 'calendar' : null,
    processors.emailProcessor ? 'email' : null
  ]
    .filter(Boolean)
    .join(', ');

  logger.info(`[ProcessorInit] Processors initialized: ${availableProcessors || 'none'}`);

  return processors;
}

/**
 * Initialize Twilio processors (call and messaging)
 */
async function initializeTwilioProcessors(
  providerRegistry: ProviderRegistry,
  processors: InitializedProcessors
): Promise<void> {
  const twilioProvider = await providerRegistry.get<TwilioProvider>('twilio');

  // Create call processor
  const { CallProcessor } = await import('./call.processor');
  processors.callProcessor = new CallProcessor(twilioProvider);

  // Create messaging processor
  const { MessagingProcessor } = await import('./messaging.processor');
  processors.messagingProcessor = new MessagingProcessor(twilioProvider);

  logger.info('[ProcessorInit] Twilio processors initialized (call, messaging)');
}

/**
 * Initialize Google Calendar processor
 */
async function initializeCalendarProcessor(
  providerRegistry: ProviderRegistry,
  processors: InitializedProcessors
): Promise<void> {
  const googleProvider = await providerRegistry.get<GoogleProvider>('google');

  const { CalendarProcessor } = await import('./calendar.processor');
  processors.calendarProcessor = new CalendarProcessor(googleProvider);

  logger.info('[ProcessorInit] Calendar processor initialized');
}

/**
 * Initialize Email processor with EmailRouter
 */
async function initializeEmailProcessor(
  providerRegistry: ProviderRegistry,
  processors: InitializedProcessors
): Promise<void> {
  const { EmailRouter } = await import('../providers/email/email-router');
  const { EmailProcessor } = await import('./email.processor');

  const emailRouter = new EmailRouter();

  // Register all available email providers
  const providers = [
    { name: 'resend', priority: 1 },
    { name: 'sendgrid', priority: 2 },
    { name: 'smtp', priority: 3 }
  ];

  for (const { name, priority } of providers) {
    if (providerRegistry.has(name)) {
      const provider = await providerRegistry.get<IEmailProvider>(name);
      const config = provider.getConfig();

      emailRouter.register(name, {
        provider,
        priority: config.priority || priority,
        tags: config.tags,
        domains: config.domains
      });

      logger.info(`[ProcessorInit] Registered email provider: ${name}`);
    }
  }

  processors.emailProcessor = new EmailProcessor(emailRouter);
  logger.info('[ProcessorInit] Email processor initialized with router');
}
