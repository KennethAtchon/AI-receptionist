/**
 * Email Provider Exports
 */

export type { IEmailProvider, EmailParams, EmailResult } from './email-provider.interface';
export { EmailRouter } from './email-router';
export { PostmarkProvider } from './postmark';
export type {
  PostmarkConfig,
  PostmarkInboundEmail,
  BulkEmailMessage,
  BulkEmailResult
} from './postmark';

