/**
 * Processor Type Definitions
 * Processors orchestrate API calls using AI guidance
 */

import type { IAIProvider } from '../types';
import type { Message } from '../agent/types';
import type { ITool } from '../types';

/**
 * Base processor interface
 */
export interface IProcessor {
  readonly name: string;
  readonly type: 'call' | 'calendar' | 'messaging' | 'custom';
}

/**
 * Response from CallProcessor
 */
export interface ProcessorResponse {
  content: string;
  action: 'respond' | 'transfer' | 'end_call' | 'escalate';
  metadata?: Record<string, any>;
}

/**
 * Parameters for AI consultation
 */
export interface AIConsultationParams {
  context: string;
  options: string[];
  history?: string[];
}

/**
 * Result from calendar booking
 */
export interface BookingResult {
  success: boolean;
  eventId?: string;
  slot?: { start: Date; end: Date };
  error?: string;
  message?: string;
  suggestion?: string;
}

/**
 * Result from messaging operations
 */
export interface MessagingResult {
  success: boolean;
  messageId?: string;
  content?: string;
  error?: string;
  suggestion?: string;
}

/**
 * Parameters for processing user speech
 */
export interface ProcessUserSpeechParams {
  callSid: string;
  userSpeech: string;
  conversationHistory: Message[];
  availableTools: ITool[];
}

/**
 * Parameters for initiating a call
 */
export interface InitiateCallParams {
  to: string;
  conversationId: string;
  greeting?: string;
}

/**
 * Parameters for finding and booking slots
 */
export interface FindAndBookParams {
  calendarId: string;
  preferredDates: Date[];
  duration: number;
  attendees?: string[];
  userPreferences?: string;
}

/**
 * Parameters for sending messages
 */
export interface SendMessageParams {
  to: string;
  context: string;
  variables?: Record<string, string>;
  channel: 'sms' | 'email';
}

