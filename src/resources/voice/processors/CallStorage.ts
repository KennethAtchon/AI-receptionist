/**
 * Call Storage
 * Stores call records in memory database with metadata
 */

import { logger } from '../../../utils/logger';
import type { MemoryManager } from '../../../agent/types';
import type { InboundCallPayload, CallSessionMetadata } from '../../../types/voice.types';
import { PhoneNumberUtils } from '../../sms/processors/PhoneNumberUtils';

export class CallStorage {
  /**
   * Store inbound call start
   */
  static async storeCallStart(
    call: InboundCallPayload,
    conversationId: string,
    memory: MemoryManager
  ): Promise<void> {
    const content = `Call from ${PhoneNumberUtils.format(call.from)} - ${call.callStatus}`;

    // Build session metadata
    const sessionMetadata: CallSessionMetadata = {
      callSid: call.callSid,
      conversationId,
      direction: call.direction,
      from: call.from,
      to: call.to,
      callerName: call.callerName,
      callStatus: call.callStatus,
      fromCity: call.fromCity,
      fromState: call.fromState,
      fromCountry: call.fromCountry,
      provider: 'twilio',
      accountSid: call.accountSid,
      startTime: call.timestamp || new Date()
    };

    // Store as system message
    await memory.store({
      id: `call-start-${call.callSid}`,
      content,
      timestamp: call.timestamp || new Date(),
      type: 'conversation',
      channel: 'call',
      role: 'system',
      sessionMetadata: sessionMetadata as any
    });

    logger.info('[CallStorage] Stored call start', {
      conversationId,
      callSid: call.callSid,
      from: call.from
    });
  }

  /**
   * Store call completion
   */
  static async storeCallEnd(
    callSid: string,
    conversationId: string,
    duration: number,
    outcome: string,
    memory: MemoryManager
  ): Promise<void> {
    const content = `Call ended - Duration: ${duration}s, Outcome: ${outcome}`;

    const sessionMetadata: Partial<CallSessionMetadata> = {
      callSid,
      conversationId,
      duration,
      callStatus: 'completed',
      outcome: outcome as any,
      endTime: new Date()
    };

    await memory.store({
      id: `call-end-${callSid}`,
      content,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'call',
      role: 'system',
      sessionMetadata: sessionMetadata as any
    });

    logger.info('[CallStorage] Stored call end', {
      conversationId,
      callSid,
      duration,
      outcome
    });
  }

  /**
   * Store call transcription
   */
  static async storeTranscription(
    callSid: string,
    conversationId: string,
    transcription: string,
    memory: MemoryManager
  ): Promise<void> {
    const sessionMetadata: Partial<CallSessionMetadata> = {
      callSid,
      conversationId,
      transcription
    };

    await memory.store({
      id: `call-transcript-${callSid}`,
      content: transcription,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'call',
      role: 'user',
      sessionMetadata: sessionMetadata as any
    });

    logger.info('[CallStorage] Stored transcription', {
      conversationId,
      callSid,
      length: transcription.length
    });
  }

  /**
   * Store recording URL
   */
  static async storeRecording(
    callSid: string,
    conversationId: string,
    recordingUrl: string,
    recordingSid: string,
    memory: MemoryManager
  ): Promise<void> {
    const content = `Call recording available: ${recordingUrl}`;

    const sessionMetadata: Partial<CallSessionMetadata> = {
      callSid,
      conversationId,
      recordingUrl,
      recordingSid
    };

    await memory.store({
      id: `call-recording-${callSid}`,
      content,
      timestamp: new Date(),
      type: 'conversation',
      channel: 'call',
      role: 'system',
      sessionMetadata: sessionMetadata as any
    });

    logger.info('[CallStorage] Stored recording', {
      conversationId,
      callSid,
      recordingSid
    });
  }
}
