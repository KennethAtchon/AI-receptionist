/**
 * Processor Layer Export
 * Intelligent AI-driven orchestration between services and providers
 */

export { BaseProcessor } from './base.processor';

// Processor implementations
export { CallProcessor } from './call.processor';
export { CalendarProcessor } from './calendar.processor';
export { MessagingProcessor } from './messaging.processor';

// Processor types
export type {
  IProcessor,
  ProcessorResponse,
  AIConsultationParams,
  BookingResult,
  MessagingResult,
  ProcessUserSpeechParams,
  InitiateCallParams,
  FindAndBookParams,
  SendMessageParams
} from './processor.types';

