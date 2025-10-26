/**
 * Resource Initialization Module
 * Handles creation of all user-facing resource APIs
 */

import type { Agent } from '../agent/core/Agent';
import type { VoiceResource } from './core/voice.resource';
import type { SMSResource } from './core/sms.resource';
import type { EmailResource } from './core/email.resource';
import type { TextResource } from './core/text.resource';
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
  const { VoiceResource } = require('./core/voice.resource');
  const { SMSResource } = require('./core/sms.resource');
  const { EmailResource } = require('./core/email.resource');
  const { TextResource } = require('./core/text.resource');

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
