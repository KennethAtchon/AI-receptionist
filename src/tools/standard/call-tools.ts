/**
 * Call Tools (Standard)
 * Tools for voice call operations - uses CallProcessor
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { CallProcessor } from '../../processors/call.processor';

export interface CallToolsConfig {
  callProcessor?: CallProcessor;
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

      if (!config?.callProcessor) {
        logger.warn('[InitiateCallTool] No call processor configured, returning mock data');
        return {
          success: true,
          data: { callSid: 'MOCK_CALL_123', status: 'initiated' },
          response: { text: `Call initiated to ${params.to} (mock).` }
        };
      }

      try {
        const result = await config.callProcessor.initiateCall({
          to: params.to,
          conversationId: ctx.conversationId || `call-${Date.now()}`,
          greeting: params.greeting
        });

        return {
          success: true,
          data: { callSid: result.callSid, status: 'initiated' },
          response: { text: `Call initiated to ${params.to}. Call SID: ${result.callSid}` }
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

      if (!config?.callProcessor) {
        logger.warn('[EndCallTool] No call processor configured, returning mock data');
        return {
          success: true,
          data: { callSid: params.callSid },
          response: { text: `Call ${params.callSid} ended (mock).` }
        };
      }

      try {
        await config.callProcessor.endCall({ callSid: params.callSid });

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
  logger.info('[CallTools] Registered call tools with processor');
}