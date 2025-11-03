/**
 * Resource Initialization Module
 * Handles creation of all user-facing resource APIs
 */

import type { Agent } from '../agent/core/Agent';
import type { VoiceResource } from './core/voice.resource';
import type { SMSResource } from './core/sms.resource';
import type { EmailResource } from './core/email.resource';
import type { TextResource } from './core/text.resource';
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
  const { VoiceResource } = require('./core/voice.resource');
  const { SMSResource } = require('./core/sms.resource');
  const { EmailResource } = require('./core/email.resource');
  const { TextResource } = require('./core/text.resource');

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
