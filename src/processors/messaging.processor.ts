/**
 * Messaging Processor
 * Thin administrative wrapper for messaging operations.
 * No AI consultation - just provider operations for services.
 */

import type { TwilioProvider } from '../providers/api/twilio.provider';
import { logger } from '../utils/logger';

export interface SendMessageParams {
  to: string;
  context: string;
  channel: 'sms' | 'email';
  variables?: Record<string, string>;
}

export interface MessagingResult {
  success: boolean;
  messageId?: string;
  content?: string;
  error?: string;
  suggestion?: string;
}

/**
 * MessagingProcessor
 * Administrative helper for messaging operations via Twilio
 */
export class MessagingProcessor {
  readonly name = 'messaging';
  readonly type = 'messaging' as const;

  private twilioClient: any = null;

  constructor(private twilioProvider: TwilioProvider) {}

  /**
   * Initialize Twilio client using the provider
   */
  private ensureTwilioClient(): any {
    if (!this.twilioClient) {
      this.twilioClient = this.twilioProvider.createClient();
      logger.info('[MessagingProcessor] Twilio client created');
    }
    return this.twilioClient;
  }

  /**
   * Send SMS message (administrative operation)
   */
  async sendSMS(params: { to: string; body: string }): Promise<MessagingResult> {
    logger.info('[MessagingProcessor] Sending SMS', { to: params.to });

    const client = this.ensureTwilioClient();
    const config = this.twilioProvider.getConfig();

    try {
      const message = await client.messages.create({
        to: params.to,
        from: config.phoneNumber,
        body: params.body
      });

      logger.info('[MessagingProcessor] SMS sent', { messageSid: message.sid });
      
      return {
        success: true,
        messageId: message.sid,
        content: params.body
      };
    } catch (error) {
      logger.error('[MessagingProcessor] Failed to send SMS:', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send email message (administrative operation)
   * TODO: Integrate with SendGrid or other email provider
   */
  async sendEmail(params: { to: string; subject: string; body: string; html?: string }): Promise<MessagingResult> {
    logger.info('[MessagingProcessor] Sending email', { to: params.to, subject: params.subject });

    // TODO: Implement actual email sending via provider
    const emailId = `EMAIL_${Date.now()}`;
    
    logger.info('[MessagingProcessor] Email would be sent', { emailId });
    
    return {
      success: true,
      messageId: emailId,
      content: params.body
    };
  }

  /**
   * Check if phone number is valid (administrative operation)
   */
  isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Check if email is valid (administrative operation)
   */
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}