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
export { ResendProvider } from './email/resend.provider';
export { SendGridProvider } from './email/sendgrid.provider';
export { SMTPProvider } from './email/smtp.provider';

// Email Validators
export { ResendValidator } from './validation/resend-validator';
export { SendGridValidator } from './validation/sendgrid-validator';
export { SMTPValidator } from './validation/smtp-validator';

// AI Providers
export type { IAIProvider } from './ai/ai-provider.interface';
export { OpenAIProvider } from './ai/openai.provider';
export { OpenRouterProvider } from './ai/openrouter.provider';
