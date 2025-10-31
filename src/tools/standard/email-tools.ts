/**
 * Email Tools (Standard)
 * Tools for email operations - uses email providers directly
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import type { IEmailProvider } from '../../providers/email/email-provider.interface';

export interface EmailToolsConfig {
  providerRegistry: ProviderRegistry;
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
        inReplyTo: {
          type: 'string',
          description: 'Message ID to reply to (for email threading)'
        },
        references: {
          type: 'string',
          description: 'Full References header chain for email threading (space-separated message IDs)'
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

      if (!config?.providerRegistry) {
        return {
          success: false,
          error: 'Email provider not configured',
          response: {
            speak: 'I apologize, but email functionality is not configured.'
          }
        };
      }

      try {
        // Get email provider (try specific provider first, then default)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Try to get any available email provider
          const providers = ['postmark', 'resend', 'sendgrid', 'smtp'];
          for (const providerName of providers) {
            if (config.providerRegistry.has(providerName)) {
              emailProvider = await config.providerRegistry.get<IEmailProvider>(providerName);
              break;
            }
          }
          if (!emailProvider!) {
            throw new Error('No email provider configured');
          }
        }

        const result = await emailProvider.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
          attachments: params.attachments,
          headers: params.inReplyTo ? {
            'In-Reply-To': params.inReplyTo,
            'References': params.references || params.inReplyTo
          } : undefined
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error?.toString(),
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('[SendEmailTool] Failed', error as Error, { errorMessage, errorStack });
        return {
          success: false,
          error: errorMessage,
          response: {
            speak: `I apologize, but I was unable to send the email: ${errorMessage}`
          }
        };
      }
    })
    .onSMS(async (params, ctx) => {
      // SMS-optimized response
      logger.info('[SendEmailTool] Sending email via SMS channel');

      if (!config?.providerRegistry) {
        return {
          success: false,
          error: 'Email provider not configured',
          response: {
            message: 'Email not configured'
          }
        };
      }

      try {
        // Get email provider (try specific provider first, then default)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Try to get any available email provider
          const providers = ['postmark', 'resend', 'sendgrid', 'smtp'];
          for (const providerName of providers) {
            if (config.providerRegistry.has(providerName)) {
              emailProvider = await config.providerRegistry.get<IEmailProvider>(providerName);
              break;
            }
          }
          if (!emailProvider!) {
            throw new Error('No email provider configured');
          }
        }

        const result = await emailProvider.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
          headers: params.inReplyTo ? {
            'In-Reply-To': params.inReplyTo,
            'References': params.references || params.inReplyTo
          } : undefined
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error?.toString(),
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
      } catch (error) {
        logger.error('[SendEmailTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: {
            message: 'Failed to send email. Try again.'
          }
        };
      }
    })
    .onEmail(async (params, ctx) => {
      // Email-optimized response (email to email)
      logger.info('[SendEmailTool] Sending email via email channel');

      if (!config?.providerRegistry) {
        return {
          success: false,
          error: 'Email provider not configured',
          response: {
            text: 'Email functionality is not configured.',
            html: '<p>Email functionality is not configured.</p>'
          }
        };
      }

      try {
        // Get email provider (try specific provider first, then default)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Try to get any available email provider
          const providers = ['postmark', 'resend', 'sendgrid', 'smtp'];
          for (const providerName of providers) {
            if (config.providerRegistry.has(providerName)) {
              emailProvider = await config.providerRegistry.get<IEmailProvider>(providerName);
              break;
            }
          }
          if (!emailProvider!) {
            throw new Error('No email provider configured');
          }
        }

        const result = await emailProvider.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
          attachments: params.attachments,
          headers: params.inReplyTo ? {
            'In-Reply-To': params.inReplyTo,
            'References': params.references || params.inReplyTo
          } : undefined
        });

        if (!result.success) {
          return {
            success: false,
            error: result.error?.toString(),
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
      } catch (error) {
        logger.error('[SendEmailTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: {
            text: 'Failed to send email. Please try again.',
            html: '<p>Failed to send email. Please try again.</p>'
          }
        };
      }
    })
    .default(async (params, ctx) => {
      // Fallback handler
      logger.info('[SendEmailTool] Sending email via default channel');

      if (!config?.providerRegistry) {
        return {
          success: false,
          error: 'Email provider not configured',
          response: { text: 'Email functionality is not configured.' }
        };
      }

      try {
        // Get email provider (try specific provider first, then default)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Try to get any available email provider
          const providers = ['postmark', 'resend', 'sendgrid', 'smtp'];
          for (const providerName of providers) {
            if (config.providerRegistry.has(providerName)) {
              emailProvider = await config.providerRegistry.get<IEmailProvider>(providerName);
              break;
            }
          }
          if (!emailProvider!) {
            throw new Error('No email provider configured');
          }
        }

        const result = await emailProvider.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
          headers: params.inReplyTo ? {
            'In-Reply-To': params.inReplyTo,
            'References': params.references || params.inReplyTo
          } : undefined
        });

        return {
          success: result.success,
          data: result.messageId ? { messageId: result.messageId } : undefined,
          error: result.error?.toString(),
          response: {
            text: result.success ? `Email sent to ${params.to}` : 'Failed to send email'
          }
        };
      } catch (error) {
        logger.error('[SendEmailTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response: { text: 'Failed to send email' }
        };
      }
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
  logger.info('[EmailTools] Registered email tools with provider registry');
}
