/**
 * Provider exports
 */

// Base classes
export { BaseProvider } from './base/base-provider';
export { BaseConfigurableProvider, type IConfigurableProvider } from './base/configurable-provider';

// AI Providers
export type { IAIProvider } from './categories/ai/ai-provider.interface';
export { OpenAIProvider } from './categories/ai/openai';
export { OpenRouterProvider, OPENROUTER_MODELS } from './categories/ai/openrouter';

// Twilio Provider
export { TwilioProvider } from './categories/twilio';
export type { SMSParams, SMSResult, CallParams, CallResult } from './categories/twilio';

// Google Provider
export { GoogleProvider } from './categories/google';
export type {
  createCalendarMeeting,
  updateCalendarMeeting,
  deleteCalendarMeeting,
  CalendarResult,
  EventObject
} from './categories/google';

// Email Providers
export type { IEmailProvider, EmailParams, EmailResult } from './categories/email/email-provider.interface';
export { EmailRouter } from './categories/email/email-router';
export { PostmarkProvider } from './categories/email/postmark';
export type {
  PostmarkConfig,
  PostmarkInboundEmail,
  BulkEmailMessage,
  BulkEmailResult
} from './categories/email/postmark';

// Validation
export { PostmarkValidator } from './validation/postmark';

// Registry
export { PROVIDER_REGISTRY, ProviderLoader } from './registry';
export type { ProviderMetadata } from './registry';
