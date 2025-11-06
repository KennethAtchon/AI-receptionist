/**
 * Resource Initialization Module
 * Handles creation of all user-facing resource APIs
 */

import type { Agent } from '../agent/core/Agent';
import type { VoiceResource } from './voice/voice.resource';
import type { SMSResource } from './sms/sms.resource';
import type { EmailResource } from './email/email.resource';
import type { TextResource } from './text/text.resource';
import type { WebhookConfig } from '../types';
import { logger } from '../utils/logger';

export interface InitializedResources {
  voice?: VoiceResource;
  sms?: SMSResource;
  email?: EmailResource;
  text?: TextResource;
}

export interface ResourceContext {
  agent: Agent;
}

/**
 * Initialize all available resources
 * Resources receive a context object with agent and optional webhook config
 */
export function initializeResources(context: ResourceContext): InitializedResources {
  const resources: InitializedResources = {};

  // Initialize all resources
  const { VoiceResource } = require('./voice/voice.resource');
  const { SMSResource } = require('./sms/sms.resource');
  const { EmailResource } = require('./email/email.resource');
  const { TextResource } = require('./text/text.resource');

  // VoiceResource will get TwilioConfig directly from provider registry
  resources.voice = new VoiceResource(context.agent);
  resources.sms = new SMSResource(context.agent);
  resources.email = new EmailResource(context.agent);
  resources.text = new TextResource(context.agent);

  // Log summary
  const availableChannels = [
    resources.voice ? 'voice' : null,
    resources.sms ? 'sms' : null,
    resources.email ? 'email' : null,
    resources.text ? 'text' : null
  ]
    .filter(Boolean)
    .join(', ');

  logger.info(`[ResourceInit] Resources initialized: ${availableChannels}`);

  return resources;
}
