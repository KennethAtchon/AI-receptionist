/**
 * Call Tools (Standard)
 * Tools for voice call operations - uses Twilio provider directly
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import type { TwilioProvider } from '../../providers/api/twilio.provider';

export interface CallToolsConfig {
  providerRegistry: ProviderRegistry;
}

/**
 * Tool: Initiate outbound call
 */
export function buildInitiateCallTool(config?: CallToolsConfig): ITool {
  return new ToolBuilder()
    .withName('initiate_call')
    .withDescription('Initiate an outbound voice call to a phone number')
    .withParameters({
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number in E.164 format (e.g., +1234567890)' },
        greeting: { type: 'string', description: 'Initial greeting message', default: 'Hello!' }
      },
      required: ['to']
    })
    .default(async (params, ctx) => {
      logger.info('[InitiateCallTool] Starting call', { to: params.to });

      if (!config?.providerRegistry) {
        logger.warn('[InitiateCallTool] No provider registry configured, returning mock data');
        return {
          success: true,
          data: { callSid: 'MOCK_CALL_123', status: 'initiated' },
          response: { text: `Call initiated to ${params.to} (mock).` }
        };
      }

      try {
        // Get Twilio provider directly
        const twilioProvider = await config.providerRegistry.get<TwilioProvider>('twilio');
        const client = twilioProvider.createClient();
        const twilioConfig = twilioProvider.getConfig();

        // Create webhook URL for call handling
        const webhookUrl = `${process.env.BASE_URL || 'https://your-app.com'}/webhooks/voice/inbound`;

        // Make the call using Twilio directly
        const call = await client.calls.create({
          to: params.to,
          from: twilioConfig.phoneNumber,
          url: webhookUrl,
          method: 'POST'
        });

        logger.info('[InitiateCallTool] Call created', { callSid: call.sid });

        return {
          success: true,
          data: { callSid: call.sid, status: 'initiated' },
          response: { text: `Call initiated to ${params.to}. Call SID: ${call.sid}` }
        };
      } catch (error) {
        logger.error('[InitiateCallTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: { text: 'Failed to initiate call.' }
        };
      }
    })
    .build();
}

/**
 * Tool: End an active call
 */
export function buildEndCallTool(config?: CallToolsConfig): ITool {
  return new ToolBuilder()
    .withName('end_call')
    .withDescription('End an active voice call')
    .withParameters({
      type: 'object',
      properties: {
        callSid: { type: 'string', description: 'Twilio Call SID' }
      },
      required: ['callSid']
    })
    .default(async (params, ctx) => {
      logger.info('[EndCallTool] Ending call', { callSid: params.callSid });

      if (!config?.providerRegistry) {
        logger.warn('[EndCallTool] No provider registry configured, returning mock data');
        return {
          success: true,
          data: { callSid: params.callSid },
          response: { text: `Call ${params.callSid} ended (mock).` }
        };
      }

      try {
        // Get Twilio provider directly
        const twilioProvider = await config.providerRegistry.get<TwilioProvider>('twilio');
        const client = twilioProvider.createClient();

        // End the call using Twilio directly
        await client.calls(params.callSid).update({ status: 'completed' });

        logger.info('[EndCallTool] Call ended', { callSid: params.callSid });

        return {
          success: true,
          data: { callSid: params.callSid },
          response: { text: 'Call ended successfully.' }
        };
      } catch (error) {
        logger.error('[EndCallTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: { text: 'Failed to end call.' }
        };
      }
    })
    .build();
}

/**
 * Register all call tools
 */
export async function setupCallTools(registry: ToolRegistry, config?: CallToolsConfig): Promise<void> {
  registry.register(buildInitiateCallTool(config));
  registry.register(buildEndCallTool(config));
  logger.info('[CallTools] Registered call tools with provider registry');
}