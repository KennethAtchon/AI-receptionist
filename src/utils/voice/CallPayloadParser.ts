/**
 * Call Payload Parser
 * Parses Twilio voice webhook payloads into standardized format
 */

import { logger } from '../logger';
import type { InboundCallPayload, CallStatus } from '../../types/voice.types';

export class CallPayloadParser {
  /**
   * Parse Twilio inbound call webhook
   */
  static parse(payload: any): InboundCallPayload {
    logger.info('[CallPayloadParser] Parsing payload', {
      CallSid: payload.CallSid,
      From: payload.From,
      CallStatus: payload.CallStatus
    });

    const parsed: InboundCallPayload = {
      callSid: payload.CallSid,
      from: payload.From,
      to: payload.To,
      callStatus: this.parseCallStatus(payload.CallStatus),
      direction: payload.Direction === 'inbound' ? 'inbound' : 'outbound',
      accountSid: payload.AccountSid,
      timestamp: new Date(),
      callerName: payload.CallerName,
      apiVersion: payload.ApiVersion
    };

    // Parse location data
    if (payload.FromCity) {
      parsed.fromCity = payload.FromCity;
      parsed.fromState = payload.FromState;
      parsed.fromZip = payload.FromZip;
      parsed.fromCountry = payload.FromCountry;
      parsed.callerCountry = payload.CallerCountry;
    }

    if (payload.ToCity) {
      parsed.toCity = payload.ToCity;
      parsed.toState = payload.ToState;
      parsed.toZip = payload.ToZip;
      parsed.toCountry = payload.ToCountry;
    }

    // Parse call duration (if available)
    if (payload.CallDuration) {
      parsed.duration = parseInt(payload.CallDuration, 10);
    }

    // Parse forwarded from
    if (payload.ForwardedFrom) {
      parsed.forwardedFrom = payload.ForwardedFrom;
    }

    return parsed;
  }

  /**
   * Parse call status
   */
  private static parseCallStatus(status: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled'
    };

    return statusMap[status] || 'queued';
  }

  /**
   * Validate required fields
   */
  static validate(payload: any): boolean {
    const required = ['CallSid', 'From', 'To', 'CallStatus'];
    return required.every(field => payload[field]);
  }

  /**
   * Parse status callback payload
   */
  static parseStatusCallback(payload: any): Partial<InboundCallPayload> {
    return {
      callSid: payload.CallSid,
      callStatus: this.parseCallStatus(payload.CallStatus),
      duration: payload.CallDuration ? parseInt(payload.CallDuration, 10) : undefined,
      timestamp: new Date()
    };
  }
}
