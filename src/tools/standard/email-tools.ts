/**
 * Email Tools (Standard)
 * Tools for email operations - uses email providers directly
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import type { IEmailProvider } from '../../providers/categories/email/email-provider.interface';

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
        cc: {
          type: 'string',
          description: 'CC email addresses (comma-separated)'
        },
        bcc: {
          type: 'string',
          description: 'BCC email addresses (comma-separated)'
        },
        provider: {
          type: 'string',
          description: 'Email provider (currently only postmark is supported)'
        },
        inReplyTo: {
          type: 'string',
          description: 'Message ID to reply to (for email threading)'
        },
        references: {
          type: 'string',
          description: 'Full References header chain for email threading (space-separated message IDs)'
        },
        template: {
          type: 'string',
          description: 'Template name to use (only in template mode)'
        },
        templateVars: {
          type: 'object',
          description: 'Variables to substitute in template (only in template mode)',
          additionalProperties: { type: 'string' }
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
        // Get email provider (postmark only)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Default to postmark
          if (config.providerRegistry.has('postmark')) {
            emailProvider = await config.providerRegistry.get<IEmailProvider>('postmark');
          } else {
            throw new Error('Postmark email provider not configured');
          }
        }

        const result = await emailProvider.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
          cc: params.cc,
          bcc: params.bcc,
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
        // Get email provider (postmark only)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Default to postmark
          if (config.providerRegistry.has('postmark')) {
            emailProvider = await config.providerRegistry.get<IEmailProvider>('postmark');
          } else {
            throw new Error('Postmark email provider not configured');
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
        // Get email provider (postmark only)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Default to postmark
          if (config.providerRegistry.has('postmark')) {
            emailProvider = await config.providerRegistry.get<IEmailProvider>('postmark');
          } else {
            throw new Error('Postmark email provider not configured');
          }
        }

        const result = await emailProvider.sendEmail({
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
          cc: params.cc,
          bcc: params.bcc,
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
        // Get email provider (postmark only)
        let emailProvider: IEmailProvider;
        if (params.provider) {
          emailProvider = await config.providerRegistry.get<IEmailProvider>(params.provider);
        } else {
          // Default to postmark
          if (config.providerRegistry.has('postmark')) {
            emailProvider = await config.providerRegistry.get<IEmailProvider>('postmark');
          } else {
            throw new Error('Postmark email provider not configured');
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
 * Tool: Send Bulk Emails
 * Send multiple emails at once using Postmark's batch API
 */
export function buildBulkEmailTool(config?: EmailToolsConfig): ITool {
  return new ToolBuilder()
    .withName('send_bulk_emails')
    .withDescription('Send multiple emails at once (up to 500 per batch). Use for newsletters, campaigns, or batch notifications.')
    .withParameters({
      type: 'object',
      properties: {
        emails: {
          type: 'array',
          description: 'Array of email messages to send',
          items: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient email address'
              },
              subject: {
                type: 'string',
                description: 'Email subject line'
              },
              body: {
                type: 'string',
                description: 'Email body (HTML or plain text)'
              },
              tag: {
                type: 'string',
                description: 'Optional tag for tracking (e.g., "newsletter", "campaign")'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata for tracking'
              }
            },
            required: ['to', 'subject', 'body']
          }
        }
      },
      required: ['emails']
    })
    .default(async (params, ctx) => {
      logger.info('[BulkEmailTool] Sending bulk emails');

      if (!config?.providerRegistry) {
        return {
          success: false,
          error: 'Email provider not configured',
          response: { text: 'Email functionality is not configured.' }
        };
      }

      try {
        // Get postmark provider
        let emailProvider: any;
        if (config.providerRegistry.has('postmark')) {
          emailProvider = await config.providerRegistry.get('postmark');
        } else {
          throw new Error('Postmark email provider not configured');
        }

        // Check if provider has sendBulk method
        if (!emailProvider.sendBulk) {
          throw new Error('Email provider does not support bulk sending');
        }

        // Convert tool input to provider format
        const messages = params.emails.map((email: any) => ({
          to: email.to,
          subject: email.subject,
          htmlBody: email.body.includes('<') ? email.body : undefined,
          textBody: email.body.includes('<') ? undefined : email.body,
          tag: email.tag,
          metadata: email.metadata
        }));

        // Send bulk emails
        const results = await emailProvider.sendBulk(messages);

        const successful = results.filter((r: any) => r.success).length;
        const failed = results.filter((r: any) => !r.success).length;

        return {
          success: true,
          data: {
            total: results.length,
            successful,
            failed,
            results: results.map((r: any) => ({
              to: r.to,
              success: r.success,
              messageId: r.messageId,
              error: r.success ? undefined : r.message
            }))
          },
          response: {
            text: `Sent ${successful}/${results.length} emails successfully`
          }
        };
      } catch (error) {
        logger.error('[BulkEmailTool] Failed', error as Error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send bulk emails',
          response: {
            text: 'Failed to send bulk emails. Please try again.'
          }
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
  registry.register(buildBulkEmailTool(config));
  logger.info('[EmailTools] Registered email tools with provider registry');
}
