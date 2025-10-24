/**
 * Resource Initialization Module
 * Handles creation of all user-facing resource APIs
 */

import type { Agent } from '../agent/core/Agent';
import type { ConversationService } from '../services/conversation.service';
import type { CallProcessor } from '../processors/call.processor';
import type { MessagingProcessor } from '../processors/messaging.processor';
import type { CalendarProcessor } from '../processors/calendar.processor';
import type { EmailProcessor } from '../processors/email.processor';
import type { CallsResource } from './calls.resource';
import type { SMSResource } from './sms.resource';
import type { EmailResource } from './email.resource';
import type { TextResource } from './text.resource';
import { logger } from '../utils/logger';

export interface ResourceInitializationContext {
  agent: Agent;
  conversationService: ConversationService;
  callProcessor?: CallProcessor;
  messagingProcessor?: MessagingProcessor;
  calendarProcessor?: CalendarProcessor;
  emailProcessor?: EmailProcessor;
}

export interface InitializedResources {
  calls?: CallsResource;
  sms?: SMSResource;
  email?: EmailResource;
  text?: TextResource;
}

/**
 * Initialize all available resources based on configured providers
 */
export async function initializeResources(
  context: ResourceInitializationContext
): Promise<InitializedResources> {
  const resources: InitializedResources = {};

  // 1. Initialize communication resources (if Twilio available)
  if (context.callProcessor && context.messagingProcessor) {
    await initializeCommunicationResources(context, resources);
  }

  // 2. Initialize email resource (with processor if available)
  await initializeEmailResource(context, resources);

  // 3. Initialize text resource (always available for agent testing)
  await initializeTextResource(context, resources);

  // Log summary
  const availableChannels = [
    resources.calls ? 'calls' : null,
    resources.sms ? 'sms' : null,
    resources.email ? 'email' : null,
    resources.text ? 'text' : null
  ]
    .filter(Boolean)
    .join(', ');

  logger.info(`[ResourceInit] Resources initialized: ${availableChannels}`);

  return resources;
}

/**
 * Initialize communication resources (calls, sms)
 */
async function initializeCommunicationResources(
  context: ResourceInitializationContext,
  resources: InitializedResources
): Promise<void> {
  // Initialize calls resource
  const { CallsResource } = await import('./calls.resource');
  resources.calls = new CallsResource(
    context.conversationService,
    context.agent,
    context.callProcessor!
  );

  // Initialize SMS resource
  const { SMSResource } = await import('./sms.resource');
  resources.sms = new SMSResource(context.agent, context.messagingProcessor!);

  logger.info('[ResourceInit] Communication resources initialized (calls, sms)');
}

/**
 * Initialize email resource
 */
async function initializeEmailResource(
  context: ResourceInitializationContext,
  resources: InitializedResources
): Promise<void> {
  const { EmailResource } = await import('./email.resource');
  resources.email = new EmailResource(
    context.agent,
    context.conversationService,
    context.emailProcessor
  );

  if (context.emailProcessor) {
    logger.info('[ResourceInit] Email resource initialized with processor');
  } else {
    logger.info('[ResourceInit] Email resource initialized (no email provider configured)');
  }
}

/**
 * Initialize text resource (for testing agent)
 */
async function initializeTextResource(
  context: ResourceInitializationContext,
  resources: InitializedResources
): Promise<void> {
  const { TextResource } = await import('./text.resource');
  resources.text = new TextResource(context.agent, context.conversationService);

  logger.info('[ResourceInit] Text resource initialized');
}
