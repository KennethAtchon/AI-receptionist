/**
 * SMS Type Definitions
 */

export interface InboundSMSPayload {
  // Core fields
  messageSid: string;           // Twilio message SID
  from: string;                 // Sender phone (+1234567890)
  to: string;                   // Recipient phone (+1234567890)
  body: string;                 // Message body

  // Media (MMS)
  numMedia?: number;
  media?: SMSMedia[];

  // Metadata
  accountSid?: string;
  fromCity?: string;
  fromState?: string;
  fromZip?: string;
  fromCountry?: string;
  toCity?: string;
  toState?: string;
  toZip?: string;
  toCountry?: string;

  // Status
  smsStatus?: string;
  timestamp?: Date;
}

export interface SMSMedia {
  contentType: string;
  url: string;
  size?: number;
}

export interface OutboundSMSOptions {
  to: string;
  body: string;
  from?: string;              // Override default
  mediaUrl?: string[];        // MMS support
  statusCallback?: string;    // Delivery tracking
}

export interface SMSSessionMetadata {
  // Threading
  messageSid: string;
  conversationId: string;

  // Direction
  direction: 'inbound' | 'outbound';

  // Participants
  from: string;
  to: string;

  // Content
  body: string;
  numMedia?: number;
  media?: SMSMedia[];

  // Location
  fromCity?: string;
  fromState?: string;
  fromCountry?: string;

  // Provider
  provider: 'twilio';
  accountSid?: string;
  status?: string;
}

export interface SMSAutoReplyReport {
  isAutoReply: boolean;
  detectedKeywords?: string[];
  keywordMatches?: string[];
}
