/**
 * Calls Resource
 * User-facing API for phone call operations
 */

import { CallService } from '../services/call.service';
import { MakeCallOptions, CallSession } from '../types';

export class CallsResource {
  constructor(private callService: CallService) {}

  /**
   * Make an outbound call
   *
   * @example
   * ```typescript
   * const call = await client.calls.make({
   *   to: '+1234567890',
   *   metadata: { leadId: '123', source: 'website' }
   * });
   * console.log('Call initiated:', call.id);
   * ```
   */
  async make(options: MakeCallOptions): Promise<CallSession> {
    return this.callService.initiateCall(options);
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
    await this.callService.endCall(callId);
  }
}
