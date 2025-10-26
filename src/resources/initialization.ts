/**
 * Resource Initialization Module
 * Handles creation of all user-facing resource APIs
 */

import type { Agent } from '../agent/core/Agent';
import type { VoiceResource } from './voice.resource';
import type { SMSResource } from './sms.resource';
import type { EmailResource } from './core/email.resource';
import type { TextResource } from './text.resource';
import { logger } from '../utils/logger';

export interface InitializedResources {
  voice?: VoiceResource;
  sms?: SMSResource;
  email?: EmailResource;
  text?: TextResource;
}

/**
 * Initialize all available resources based on configured providers
 */
export function initializeResources(agent: Agent): InitializedResources {
  const resources: InitializedResources = {};

  // Initialize all resources (they only need the Agent)
  const { VoiceResource } = require('./voice.resource');
  const { SMSResource } = require('./sms.resource');
  const { EmailResource } = require('./email.resource');
  const { TextResource } = require('./text.resource');

  resources.voice = new VoiceResource(agent);
  resources.sms = new SMSResource(agent);
  resources.email = new EmailResource(agent);
  resources.text = new TextResource(agent);

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
