/**
 * Messaging Tools (Standard)
 * Tools for SMS and email operations - uses MessagingProcessor
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { MessagingProcessor } from '../../processors/messaging.processor';

export interface MessagingToolsConfig {
  messagingProcessor?: MessagingProcessor;
}

/**
 * Tool: Send SMS
 */
export function buildSendSMSTool(config?: MessagingToolsConfig): ITool {
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

      if (!config?.messagingProcessor) {
        logger.warn('[SendSMSTool] No messaging processor configured, returning mock data');
        return {
          success: true,
          data: { messageSid: 'MOCK_SMS_123', status: 'sent' },
          response: { text: `SMS sent to ${params.to} (mock).` }
        };
      }

      try {
        const result = await config.messagingProcessor.sendSMS({
          to: params.to,
          body: params.message
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'SMS sending failed',
            response: { text: 'Failed to send SMS.' }
          };
        }

        return {
          success: true,
          data: { messageSid: result.messageId, status: 'sent' },
          response: { text: `SMS sent to ${params.to}. Message SID: ${result.messageId}` }
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
export function buildSendEmailTool(config?: MessagingToolsConfig): ITool {
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

      if (!config?.messagingProcessor) {
        logger.warn('[SendEmailTool] No messaging processor configured, returning mock data');
        return {
          success: true,
          data: { emailId: 'MOCK_EMAIL_123' },
          response: { text: `Email would be sent to ${params.to} with subject "${params.subject}" (mock)` }
        };
      }

      try {
        const result = await config.messagingProcessor.sendEmail({
          to: params.to,
          subject: params.subject,
          body: params.body,
          html: params.html
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Email sending failed',
            response: { text: 'Failed to send email.' }
          };
        }

        return {
          success: true,
          data: { emailId: result.messageId },
          response: { text: `Email sent to ${params.to} with subject "${params.subject}"` }
        };
      } catch (error) {
        logger.error('[SendEmailTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: { text: 'Failed to send email.' }
        };
      }
    })
    .build();
}

/**
 * Register all messaging tools
 */
export async function setupMessagingTools(registry: ToolRegistry, config?: MessagingToolsConfig): Promise<void> {
  registry.register(buildSendSMSTool(config));
  registry.register(buildSendEmailTool(config));
  logger.info('[MessagingTools] Registered messaging tools with processor');
}