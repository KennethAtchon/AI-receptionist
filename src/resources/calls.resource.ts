/**
 * Calls Resource
 * User-facing API for phone call operations
 */

import { MakeCallOptions, CallSession } from '../types';
import { logger } from '../utils/logger';
import type { Agent } from '../agent/core/Agent';
import type { CallProcessor } from '../processors/call.processor';

export class CallsResource {
  constructor(
    private agent: Agent,
    private callProcessor: CallProcessor
  ) {}

  /**
   * Make an outbound call
   *
   * @example
   * ```typescript
   * const call = await client.calls.make({
   *   to: '+1234567890',
   *   metadata: { leadId: '123', source: 'website' }
   * });
   * logger.info('Call initiated:', call.id);
   * ```
   */
  async make(options: MakeCallOptions): Promise<CallSession> {
    logger.info(`[CallsResource] Initiating call to ${options.to}`);

    // 1. Create conversation context using Agent memory
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await this.agent.getMemory().startSession({
      conversationId,
      channel: 'call',
      metadata: options.metadata
    });

    // 2. Use processor for administrative call initiation
    const result = await this.callProcessor.initiateCall({
      to: options.to,
      conversationId,
      greeting: 'Hello! How can I help you today?'
    });

    logger.info(`[CallsResource] Call initiated: ${result.callSid}`);

    return {
      id: result.callSid,
      conversationId,
      to: options.to,
      status: 'initiated',
      startedAt: new Date()
    };
  }

  /**
   * Get call details
   * TODO: Implement
   */
  async get(callId: string): Promise<CallSession> {
    throw new Error('Not implemented yet');
  }

  /**
   * List recent calls
   * TODO: Implement
   */
  async list(options?: { limit?: number }): Promise<CallSession[]> {
    throw new Error('Not implemented yet');
  }

  /**
   * End an active call
   * TODO: Implement
   */
  async end(callId: string): Promise<void> {
    logger.info(`[CallsResource] Ending call ${callId}`);

    // Get conversation context
    const conversation = await this.agent.getMemory().getConversationByCallId(callId);
    if (conversation) {
      await this.agent.getMemory().endSession(conversation.sessionMetadata!.conversationId!);
    }

    // Use processor for administrative call ending
    await this.callProcessor.endCall({ callSid: callId });
  }
}
