/**
 * Call Tools (Standard)
 * Tools for voice call operations - wraps Twilio provider
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { TwilioProvider } from '../../providers/core/twilio.provider';

export interface CallToolsConfig {
  twilioProvider: TwilioProvider;
}

/**
 * Tool: Initiate outbound call
 */
export function buildInitiateCallTool(config: CallToolsConfig): ITool {
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

      try {
        const twilio = await (config.twilioProvider as any).getClient();
        const call = await twilio.calls.create({
          to: params.to,
          from: (config.twilioProvider as any).config.phoneNumber,
          url: 'http://demo.twilio.com/docs/voice.xml', // TODO: Replace with actual webhook
          statusCallback: 'http://demo.twilio.com/docs/voice.xml'
        });

        return {
          success: true,
          data: { callSid: call.sid, status: call.status },
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
export function buildEndCallTool(config: CallToolsConfig): ITool {
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

      try {
        const twilio = await (config.twilioProvider as any).getClient();
        await twilio.calls(params.callSid).update({ status: 'completed' });

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
export async function setupCallTools(registry: ToolRegistry, config: CallToolsConfig): Promise<void> {
  registry.register(buildInitiateCallTool(config));
  registry.register(buildEndCallTool(config));
  logger.info('[CallTools] Registered call tools');
}

