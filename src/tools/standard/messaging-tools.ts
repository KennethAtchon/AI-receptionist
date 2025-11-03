/**
 * Messaging Tools (Standard)
 * Tools for SMS operations - uses Twilio provider directly
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import type { TwilioProvider } from '../../providers/api/twilio.provider';

export interface MessagingToolsConfig {
  providerRegistry: ProviderRegistry;
}

/**
 * Tool: Send SMS
 */
export function buildSendSMSTool(config?: MessagingToolsConfig): ITool {
  return new ToolBuilder()
    .withName('send_sms')
    .withDescription('Send an SMS message to a phone number')
    .withParameters({
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number in E.164 format (e.g., +1234567890)' },
        message: { type: 'string', description: 'Message content (max 160 chars for standard SMS)' }
      },
      required: ['to', 'message']
    })
    .default(async (params, ctx) => {
      logger.info('[SendSMSTool] Sending SMS', { to: params.to, length: params.message.length });

      if (!config?.providerRegistry) {
        logger.warn('[SendSMSTool] No provider registry configured, returning mock data');
        return {
          success: true,
          data: { messageSid: 'MOCK_SMS_123', status: 'sent' },
          response: { text: `SMS sent to ${params.to} (mock).` }
        };
      }

      try {
        // Get Twilio provider and use helper method
        const twilioProvider = await config.providerRegistry.get<TwilioProvider>('twilio');

        // Send SMS using provider helper method
        const result = await twilioProvider.sendSMS({
          to: params.to,
          message: params.message
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            response: { text: 'Failed to send SMS.' }
          };
        }

        return {
          success: true,
          data: { messageSid: result.messageSid, status: result.status },
          response: { text: `SMS sent to ${params.to}. Message SID: ${result.messageSid}` }
        };
      } catch (error) {
        logger.error('[SendSMSTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: { text: 'Failed to send SMS.' }
        };
      }
    })
    .build();
}

/**
 * Register all messaging tools
 */
export async function setupMessagingTools(registry: ToolRegistry, config?: MessagingToolsConfig): Promise<void> {
  registry.register(buildSendSMSTool(config));
  logger.info('[MessagingTools] Registered SMS tools with provider registry');
}