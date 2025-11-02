/**
 * Voice Type Definitions
 */

export interface InboundCallPayload {
  // Core fields
  callSid: string;              // Twilio call SID
  from: string;                 // Caller phone (+1234567890)
  to: string;                   // Recipient phone (+1234567890)

  // Call status
  callStatus: CallStatus;       // 'ringing' | 'in-progress' | 'completed' | etc.
  direction: 'inbound' | 'outbound';

  // Caller info
  callerName?: string;          // Caller ID name
  fromCity?: string;
  fromState?: string;
  fromZip?: string;
  fromCountry?: string;

  // Recipient info
  toCity?: string;
  toState?: string;
  toZip?: string;
  toCountry?: string;

  // Metadata
  accountSid?: string;
  timestamp?: Date;
  duration?: number;            // Call duration in seconds

  // Additional info
  forwardedFrom?: string;       // If call was forwarded
  callerCountry?: string;
  apiVersion?: string;
}

export type CallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'busy'
  | 'failed'
  | 'no-answer'
  | 'canceled';

export interface OutboundCallOptions {
  to: string;
  from?: string;              // Override default
  url?: string;               // TwiML URL
  statusCallback?: string;    // Status updates
  timeout?: number;           // Ring timeout
  record?: boolean;           // Record call
  machineDetection?: boolean; // Detect voicemail
}

export interface CallSessionMetadata {
  // Threading
  callSid: string;
  conversationId: string;

  // Direction
  direction: 'inbound' | 'outbound';

  // Participants
  from: string;
  to: string;
  callerName?: string;

  // Call info
  callStatus: CallStatus;
  duration?: number;
  recordingUrl?: string;
  recordingSid?: string;
  transcription?: string;

  // Location
  fromCity?: string;
  fromState?: string;
  fromCountry?: string;

  // Provider
  provider: 'twilio';
  accountSid?: string;

  // Analytics
  startTime?: Date;
  endTime?: Date;
  answeredBy?: 'human' | 'machine' | 'unknown';
  outcome?: CallOutcome;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export type CallOutcome =
  | 'completed'
  | 'voicemail'
  | 'no-answer'
  | 'busy'
  | 'failed'
  | 'transferred'
  | 'spam';

export interface MediaStreamEvent {
  event: 'connected' | 'start' | 'media' | 'stop';
  streamSid?: string;
  callSid?: string;
  media?: {
    payload: string;          // Base64 audio
    timestamp: string;
    track: 'inbound' | 'outbound';
  };
}

export interface TwiMLConfig {
  greeting?: string;
  voice?: VoiceType;
  language?: string;
  recordCall?: boolean;
  transcribeCall?: boolean;
  timeout?: number;
}

export type VoiceType =
  | 'Polly.Joanna'
  | 'Polly.Matthew'
  | 'Google.en-US-Neural2-A'
  | 'Google.en-US-Neural2-C';

export interface SpamDetectionReport {
  isSpam: boolean;
  confidence: number;          // 0-1
  reasons?: string[];
  shouldBlock: boolean;
}

export interface IVRMenu {
  id: string;
  message: string;
  voice?: VoiceType;
  options: IVROption[];
  timeout?: number;
  maxAttempts?: number;
}

export interface IVROption {
  digit: string;               // '1', '2', etc.
  action: IVRAction;
  label?: string;
}

export type IVRAction =
  | { type: 'menu'; menuId: string }
  | { type: 'transfer'; to: string }
  | { type: 'voicemail' }
  | { type: 'agent' }
  | { type: 'hangup' };
