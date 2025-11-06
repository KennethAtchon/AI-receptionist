/**
 * SMS Storage
 * Stores SMS messages in memory database with metadata
 */

import { logger } from '../../../utils/logger';
import type { MemoryManager } from '../../../agent/types';
import type { InboundSMSPayload, OutboundSMSOptions, SMSSessionMetadata } from '../../../types/sms.types';

export class SMSStorage {
  /**
   * Store inbound SMS
   */
  static async storeInboundSMS(
    sms: InboundSMSPayload,
    conversationId: string,
    memory: MemoryManager
  ): Promise<void> {
    // Build content with media info
    let content = sms.body || '';

    if (sms.media && sms.media.length > 0) {
      const mediaInfo = sms.media
        .map(m => `[Media: ${m.contentType} - ${m.url}]`)
        .join('\n');

      content = content ? `${content}\n\n${mediaInfo}` : mediaInfo;
    }

    // Build session metadata
    const sessionMetadata: SMSSessionMetadata = {
      messageSid: sms.messageSid,
      conversationId,
      direction: 'inbound',
      from: sms.from,
      to: sms.to,
      body: sms.body,
      numMedia: sms.numMedia,
      media: sms.media,
      fromCity: sms.fromCity,
      fromState: sms.fromState,
      fromCountry: sms.fromCountry,
      provider: 'twilio',
      accountSid: sms.accountSid,
      status: sms.smsStatus
    };

    // Store as user message
    await memory.store({
      id: `msg-${conversationId}-${Date.now()}`,
      content,
      timestamp: sms.timestamp || new Date(),
      type: 'conversation',
      channel: 'sms',
      role: 'user',
      sessionMetadata: sessionMetadata as any // Cast to avoid type mismatch with session metadata
    });

    logger.info('[SMSStorage] Stored inbound SMS', {
      conversationId,
      messageSid: sms.messageSid,
      from: sms.from
    });
  }

  /**
   * Store outbound SMS
   */
  static async storeOutboundSMS(
    messageSid: string,
    conversationId: string,
    options: OutboundSMSOptions,
    memory: MemoryManager
  ): Promise<void> {
    // Build session metadata
    const sessionMetadata: SMSSessionMetadata = {
      messageSid,
      conversationId,
      direction: 'outbound',
      from: options.from || '', // Will be filled by provider
      to: options.to,
      body: options.body,
      numMedia: options.mediaUrl ? options.mediaUrl.length : 0,
      provider: 'twilio'
    };

    // Store as assistant message
    await memory.store({
      id: `msg-${conversationId}-${Date.now()}`,
      content: options.body,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'sms',
      role: 'assistant',
      sessionMetadata: sessionMetadata as any // Cast to avoid type mismatch with session metadata
    });

    logger.info('[SMSStorage] Stored outbound SMS', {
      conversationId,
      messageSid,
      to: options.to
    });
  }
}
