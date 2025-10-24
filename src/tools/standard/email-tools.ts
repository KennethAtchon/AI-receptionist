/**
 * Email Tools (Standard)
 * Tools for email operations - uses EmailProcessor
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { EmailProcessor } from '../../processors/email.processor';

export interface EmailToolsConfig {
  emailProcessor?: EmailProcessor;
}

/**
 * Tool: Send Email
 * Channel-aware tool for sending emails across voice, SMS, email, and text channels
 */
export function buildSendEmailTool(config?: EmailToolsConfig): ITool {
  return new ToolBuilder()
    .withName('send_email')
    .withDescription('Send an email message')
    .withParameters({
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Email address or comma-separated addresses'
        },
        subject: {
          type: 'string',
          description: 'Email subject line'
        },
        body: {
          type: 'string',
          description: 'Email body (plain text)'
        },
        html: {
          type: 'string',
          description: 'Email body (HTML format)'
        },
        provider: {
          type: 'string',
          description: 'Force specific provider (resend, sendgrid, smtp)'
        },
        attachments: {
          type: 'array',
          description: 'File attachments',
          items: {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              content: { type: 'string' },
              path: { type: 'string' }
            }
          }
        }
      },
      required: ['to', 'subject', 'body']
    })
    .onCall(async (params, ctx) => {
      // Voice-optimized response
      logger.info('[SendEmailTool] Sending email via voice channel');

      if (!config?.emailProcessor) {
        return {
          success: false,
          error: 'Email processor not configured',
          response: {
            speak: 'I apologize, but email functionality is not configured.'
          }
        };
      }

      const result = await config.emailProcessor.sendEmail({
        to: params.to,
        subject: params.subject,
        body: params.body,
        html: params.html,
        attachments: params.attachments,
        provider: params.provider
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          response: {
            speak:
              'I apologize, but I was unable to send the email. Please try again or contact support.'
          }
        };
      }

      return {
        success: true,
        data: { messageId: result.messageId },
        response: {
          speak: `I've sent your email to ${params.to}. You should receive a confirmation shortly.`
        }
      };
    })
    .onSMS(async (params, ctx) => {
      // SMS-optimized response
      logger.info('[SendEmailTool] Sending email via SMS channel');

      if (!config?.emailProcessor) {
        return {
          success: false,
          error: 'Email processor not configured',
          response: {
            message: 'Email not configured'
          }
        };
      }

      const result = await config.emailProcessor.sendEmail({
        to: params.to,
        subject: params.subject,
        body: params.body,
        html: params.html,
        provider: params.provider
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          response: {
            message: 'Failed to send email. Try again.'
          }
        };
      }

      return {
        success: true,
        data: { messageId: result.messageId },
        response: {
          message: `✓ Email sent to ${params.to}`
        }
      };
    })
    .onEmail(async (params, ctx) => {
      // Email-optimized response (email to email)
      logger.info('[SendEmailTool] Sending email via email channel');

      if (!config?.emailProcessor) {
        return {
          success: false,
          error: 'Email processor not configured',
          response: {
            text: 'Email functionality is not configured.',
            html: '<p>Email functionality is not configured.</p>'
          }
        };
      }

      const result = await config.emailProcessor.sendEmail({
        to: params.to,
        subject: params.subject,
        body: params.body,
        html: params.html,
        attachments: params.attachments,
        provider: params.provider
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          response: {
            text: 'Failed to send email. Please try again.',
            html: '<p>Failed to send email. Please try again.</p>'
          }
        };
      }

      return {
        success: true,
        data: { messageId: result.messageId },
        response: {
          text: `Email sent successfully to ${params.to}`,
          html: `
            <h3>Email Sent Successfully</h3>
            <p><strong>To:</strong> ${params.to}</p>
            <p><strong>Subject:</strong> ${params.subject}</p>
            <p><strong>Message ID:</strong> ${result.messageId}</p>
          `
        }
      };
    })
    .default(async (params, ctx) => {
      // Fallback handler
      logger.info('[SendEmailTool] Sending email via default channel');

      if (!config?.emailProcessor) {
        return {
          success: false,
          error: 'Email processor not configured',
          response: { text: 'Email functionality is not configured.' }
        };
      }

      const result = await config.emailProcessor.sendEmail({
        to: params.to,
        subject: params.subject,
        body: params.body,
        html: params.html,
        provider: params.provider
      });

      return {
        success: result.success,
        data: result.messageId ? { messageId: result.messageId } : undefined,
        error: result.error,
        response: {
          text: result.success ? `Email sent to ${params.to}` : 'Failed to send email'
        }
      };
    })
    .build();
}

/**
 * Register all email tools
 */
export async function setupEmailTools(
  registry: ToolRegistry,
  config?: EmailToolsConfig
): Promise<void> {
  registry.register(buildSendEmailTool(config));
  logger.info('[EmailTools] Registered email tools with processor');
}
