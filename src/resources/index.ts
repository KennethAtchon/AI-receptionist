/**
 * Resource exports
 */

// Export resources
export { EmailResource } from './email/email.resource';
export { SMSResource } from './sms/sms.resource';
export { VoiceResource } from './voice/voice.resource';
export { TextResource } from './text/text.resource';

// Export types
export type {
  EmailSession,
  SendEmailOptions,
  EmailAttachment,
  InboundEmailPayload
} from './email/email.resource';
export type {
  SMSSession,
  SendSMSOptions,
  SMSResourceConfig
} from './sms/sms.resource';
export type {
  VoiceSession,
  MakeCallOptions,
  VoiceResourceConfig
} from './voice/voice.resource';

// Export processors with namespaced exports to avoid conflicts
export * as EmailProcessors from './email/processors';
export * as SMSProcessors from './sms/processors';
export * as VoiceProcessors from './voice/processors';

// Export base and initialization
export { BaseResource } from './base.resource';
export * from './initialization';
