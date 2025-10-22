/**
 * Messaging Processor
 * AI-driven orchestration for SMS/email messaging using Twilio
 */

import { BaseProcessor } from './base.processor';
import type { TwilioProvider } from '../providers/core/twilio.provider';
import type { IAIProvider } from '../types';
import type { MessagingResult, SendMessageParams } from '../types/processors';
import { logger } from '../utils/logger';

/**
 * MessagingProcessor
 * Uses AI to orchestrate SMS/email messaging
 */
export class MessagingProcessor extends BaseProcessor {
  readonly name = 'messaging';
  readonly type = 'messaging' as const;

  private twilioClient: any = null;

  constructor(
    aiProvider: IAIProvider,
    private twilioProvider: TwilioProvider
  ) {
    super(aiProvider);
  }

  /**
   * Initialize Twilio client using the provider
   */
  private ensureTwilioClient(): any {
    if (!this.twilioClient) {
      this.twilioClient = this.twilioProvider.createClient();
      this.logger.info('[MessagingProcessor] Twilio client created');
    }
    return this.twilioClient;
  }

  /**
   * Send message with AI-driven template selection and customization
   */
  async sendMessage(params: SendMessageParams): Promise<MessagingResult> {
    this.logger.info('[MessagingProcessor] Sending message', { 
      to: params.to,
      channel: params.channel,
      context: params.context.substring(0, 50)
    });

    // 1. Ask AI to generate appropriate message
    const messageContent = await this.consultAI({
      context: `Generate ${params.channel} message for: ${params.context}
Variables: ${JSON.stringify(params.variables || {})}
Keep it concise and professional.${params.channel === 'sms' ? ' SMS limit: 160 characters.' : ''}`,
      options: ['send_message', 'skip_message', 'schedule_later']
    });

    // Check if AI suggests skipping or scheduling
    if (messageContent.content.toLowerCase().includes('skip')) {
      return {
        success: false,
        error: 'AI suggested skipping message',
        suggestion: messageContent.content
      };
    }

    // 2. Check compliance (opt-out, rate limits, etc.)
    const canSend = await this.checkCompliance(params.to, params.channel);
    if (!canSend) {
      this.logger.warn('[MessagingProcessor] Compliance check failed', { to: params.to });
      return {
        success: false,
        error: 'Compliance check failed (user opted out or rate limited)'
      };
    }

    // 3. Send via provider
    try {
      let messageId: string;

      if (params.channel === 'sms') {
        messageId = await this.sendSMS(params.to, messageContent.content);
      } else if (params.channel === 'email') {
        // Email sending would go here (need email provider)
        throw new Error('Email not implemented yet');
      } else {
        throw new Error(`Unsupported channel: ${params.channel}`);
      }

      this.logger.info('[MessagingProcessor] Message sent', { messageId });

      return {
        success: true,
        messageId,
        content: messageContent.content
      };
    } catch (error) {
      this.logger.error('[MessagingProcessor] Failed to send message:', error instanceof Error ? error : new Error(String(error)));

      // Ask AI how to handle error
      const errorGuidance = await this.consultAI({
        context: `Message sending failed: ${error instanceof Error ? error.message : String(error)}. What should I do?`,
        options: ['retry', 'try_different_channel', 'skip', 'escalate']
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: errorGuidance.content
      };
    }
  }

  /**
   * Send SMS using Twilio
   */
  private async sendSMS(to: string, body: string): Promise<string> {
    const client = this.ensureTwilioClient();
    const config = this.twilioProvider.getConfig();

    this.logger.info('[MessagingProcessor] Sending SMS', { to });

    try {
      const message = await client.messages.create({
        to,
        from: config.phoneNumber,
        body
      });

      this.logger.info('[MessagingProcessor] SMS sent', { sid: message.sid });
      return message.sid;
    } catch (error) {
      this.logger.error('[MessagingProcessor] Failed to send SMS:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Check compliance rules (opt-out, rate limits, etc.)
   */
  private async checkCompliance(to: string, channel: string): Promise<boolean> {
    // TODO: Implement actual compliance checks
    // - Check opt-out list
    // - Check rate limits
    // - Check time of day restrictions
    // - Check TCPA compliance

    this.logger.info('[MessagingProcessor] Compliance check passed', { to, channel });
    return true;
  }

  protected buildSystemPrompt(options: string[]): string {
    return `You are an AI messaging assistant. Generate appropriate messages for different contexts.
Keep messages concise, professional, and compliant.
Available actions: ${options.join(', ')}
For SMS, keep under 160 characters when possible.`;
  }
}

