/**
 * Provider exports
 */

export { BaseProvider } from './base.provider';
export { BaseConfigurableProvider } from './configurable.provider';
export type { IConfigurableProvider } from './configurable.provider';

// Core Providers (Communication, Calendar, etc.)
export { TwilioProvider } from './api/twilio.provider';
export { GoogleProvider } from './api/google.provider';

// Email Providers
export type { IEmailProvider } from './email/email-provider.interface';
export { EmailRouter } from './email/email-router';
export { PostmarkProvider } from './email/postmark.provider';
export type { PostmarkConfig, PostmarkInboundEmail, BulkEmailMessage, BulkEmailResult } from './email/postmark.provider';

// Email Validator
export { PostmarkValidator } from './validation/postmark-validator';

// AI Providers
export type { IAIProvider } from './ai/ai-provider.interface';
export { OpenAIProvider } from './ai/openai.provider';
export { OpenRouterProvider } from './ai/openrouter.provider';
