/**
 * Messaging Tools (Standard)
 * Tools for SMS and email operations
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { TwilioProvider } from '../../providers/core/twilio.provider';

export interface MessagingToolsConfig {
  twilioProvider: TwilioProvider;
}

/**
 * Tool: Send SMS
 */
export function buildSendSMSTool(config: MessagingToolsConfig): ITool {
  return new ToolBuilder()
    .withName('send_sms')
    .withDescription('Send an SMS message to a phone number')
    .withParameters({
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number in E.164 format (e.g., +1234567890)' },
        message: { type: 'string', description: 'Message content (max 160 chars for standard SMS)' }
      },
      required: ['to', 'message']
    })
    .default(async (params, ctx) => {
      logger.info('[SendSMSTool] Sending SMS', { to: params.to, length: params.message.length });

      try {
        const twilio = await (config.twilioProvider as any).getClient();
        const sms = await twilio.messages.create({
          to: params.to,
          from: (config.twilioProvider as any).config.phoneNumber,
          body: params.message
        });

        return {
          success: true,
          data: { messageSid: sms.sid, status: sms.status },
          response: { text: `SMS sent to ${params.to}. Message SID: ${sms.sid}` }
        };
      } catch (error) {
        logger.error('[SendSMSTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: { text: 'Failed to send SMS.' }
        };
      }
    })
    .build();
}

/**
 * Tool: Send Email
 */
export function buildSendEmailTool(): ITool {
  return new ToolBuilder()
    .withName('send_email')
    .withDescription('Send an email message')
    .withParameters({
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (plain text)' },
        html: { type: 'string', description: 'Email body (HTML)' }
      },
      required: ['to', 'subject', 'body']
    })
    .default(async (params, ctx) => {
      logger.info('[SendEmailTool] Sending email', { to: params.to, subject: params.subject });

      // TODO: Integrate with SendGrid or other email provider
      return {
        success: true,
        data: { emailId: `EMAIL_${Date.now()}` },
        response: { text: `Email would be sent to ${params.to} with subject "${params.subject}"` }
      };
    })
    .build();
}

/**
 * Register all messaging tools
 */
export async function setupMessagingTools(registry: ToolRegistry, config: MessagingToolsConfig): Promise<void> {
  registry.register(buildSendSMSTool(config));
  registry.register(buildSendEmailTool());
  logger.info('[MessagingTools] Registered messaging tools');
}

