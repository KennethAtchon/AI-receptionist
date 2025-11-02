/**
 * SMS Payload Parser
 * Parses Twilio webhook payloads into standardized format
 */

import { logger } from '../logger';
import type { InboundSMSPayload, SMSMedia } from '../../types/sms.types';

export class SMSPayloadParser {
  /**
   * Parse Twilio inbound SMS webhook
   */
  static parse(payload: any): InboundSMSPayload {
    logger.info('[SMSPayloadParser] Parsing payload', {
      MessageSid: payload.MessageSid,
      From: payload.From
    });

    const parsed: InboundSMSPayload = {
      messageSid: payload.MessageSid,
      from: payload.From,
      to: payload.To,
      body: payload.Body || '',
      numMedia: parseInt(payload.NumMedia || '0', 10),
      accountSid: payload.AccountSid,
      smsStatus: payload.SmsStatus,
      timestamp: new Date()
    };

    // Parse location data
    if (payload.FromCity) {
      parsed.fromCity = payload.FromCity;
      parsed.fromState = payload.FromState;
      parsed.fromZip = payload.FromZip;
      parsed.fromCountry = payload.FromCountry;
    }

    if (payload.ToCity) {
      parsed.toCity = payload.ToCity;
      parsed.toState = payload.ToState;
      parsed.toZip = payload.ToZip;
      parsed.toCountry = payload.ToCountry;
    }

    // Parse media (MMS)
    if (parsed.numMedia && parsed.numMedia > 0) {
      parsed.media = this.parseMedia(payload);
    }

    return parsed;
  }

  /**
   * Parse MMS media attachments
   */
  private static parseMedia(payload: any): SMSMedia[] {
    const numMedia = parseInt(payload.NumMedia || '0', 10);
    const media: SMSMedia[] = [];

    for (let i = 0; i < numMedia; i++) {
      const contentType = payload[`MediaContentType${i}`];
      const url = payload[`MediaUrl${i}`];

      if (contentType && url) {
        media.push({
          contentType,
          url,
          size: undefined // Twilio doesn't provide size in webhook
        });
      }
    }

    return media;
  }

  /**
   * Validate required fields
   */
  static validate(payload: any): boolean {
    const required = ['MessageSid', 'From', 'To'];
    return required.every(field => payload[field]);
  }
}
