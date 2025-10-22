/**
 * Call Processor
 * Thin administrative wrapper for call operations.
 * No AI consultation - just provider operations for services.
 */

import type { TwilioProvider } from '../providers/core/twilio.provider';
import { logger } from '../utils/logger';

export interface InitiateCallParams {
  to: string;
  conversationId: string;
  greeting?: string;
}

export interface EndCallParams {
  callSid: string;
}

/**
 * CallProcessor
 * Administrative helper for call operations via Twilio
 */
export class CallProcessor {
  readonly name = 'call';
  readonly type = 'call' as const;

  private twilioClient: any = null;

  constructor(private twilioProvider: TwilioProvider) {}

  /**
   * Initialize Twilio client using the provider
   */
  private ensureTwilioClient(): any {
    if (!this.twilioClient) {
      this.twilioClient = this.twilioProvider.createClient();
      logger.info('[CallProcessor] Twilio client created');
    }
    return this.twilioClient;
  }

  /**
   * Initiate an outbound call (administrative operation)
   */
  async initiateCall(params: InitiateCallParams): Promise<{ callSid: string }> {
    logger.info('[CallProcessor] Initiating call', { to: params.to });

    const client = this.ensureTwilioClient();
    const config = this.twilioProvider.getConfig();

    try {
      const call = await client.calls.create({
        to: params.to,
        from: config.phoneNumber,
        url: `http://localhost:3000/webhooks/calls/${params.conversationId}`,
        statusCallback: `http://localhost:3000/webhooks/call-status/${params.conversationId}`
      });

      logger.info('[CallProcessor] Call initiated', { callSid: call.sid });
      return { callSid: call.sid };
    } catch (error) {
      logger.error('[CallProcessor] Failed to initiate call:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * End an active call (administrative operation)
   */
  async endCall(params: EndCallParams): Promise<void> {
    logger.info('[CallProcessor] Ending call', { callSid: params.callSid });

    const client = this.ensureTwilioClient();

    try {
      await client.calls(params.callSid).update({ status: 'completed' });
      logger.info('[CallProcessor] Call ended', { callSid: params.callSid });
    } catch (error) {
      logger.error('[CallProcessor] Failed to end call:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get call status (administrative operation)
   */
  async getCallStatus(callSid: string): Promise<{ status: string; duration?: number }> {
    logger.info('[CallProcessor] Getting call status', { callSid });

    const client = this.ensureTwilioClient();

    try {
      const call = await client.calls(callSid).fetch();
      logger.info('[CallProcessor] Call status retrieved', { callSid, status: call.status });
      
      return {
        status: call.status,
        duration: call.duration ? parseInt(call.duration) : undefined
      };
    } catch (error) {
      logger.error('[CallProcessor] Failed to get call status:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}