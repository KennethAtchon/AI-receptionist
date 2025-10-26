/**
 * Session Management Types
 * Core types for the session-based architecture
 */

export type SessionType = 'voice' | 'sms' | 'email' | 'text';
export type SessionStatus = 'active' | 'inactive' | 'completed' | 'failed';

/**
 * Base session interface
 * All specific session types extend from this
 */
export interface Session {
  id: string;
  type: SessionType;
  status: SessionStatus;
  conversationId: string;
  createdAt: Date;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

/**
 * Session configuration for creating new sessions
 */
export interface SessionConfig {
  identifier: string; // Phone number, email address, etc.
  metadata?: Record<string, any>;
  webhookUrl?: string; // Override default webhook URL
}

/**
 * Voice/Call session
 */
export interface VoiceSession extends Session {
  type: 'voice';
  phoneNumber: string;
  callSid?: string;
  direction?: 'inbound' | 'outbound';
  from?: string;
  to?: string;
}

/**
 * SMS session
 */
export interface SMSSession extends Session {
  type: 'sms';
  phoneNumber: string;
  messageSid?: string;
  direction?: 'inbound' | 'outbound';
  from?: string;
  to?: string;
}

/**
 * Email session
 */
export interface EmailSession extends Session {
  type: 'email';
  emailAddress: string;
  messageId?: string;
  threadId?: string;
  direction?: 'inbound' | 'outbound';
  subject?: string;
}

/**
 * Text session (for development/testing)
 */
export interface TextSession extends Session {
  type: 'text';
  identifier: string;
}
