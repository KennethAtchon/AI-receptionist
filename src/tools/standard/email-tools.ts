/**
 * Email Tools (Standard)
 * Tools for email operations - uses email providers directly
 */

import { ToolBuilder } from '../builder';
import { ToolRegistry } from '../registry';
import { logger } from '../../utils/logger';
import type { ITool, ToolResult, ChannelResponse, ExecutionContext } from '../../types';
import type { ProviderRegistry } from '../../providers/core/provider-registry';
import type { IEmailProvider } from '../../providers/categories/email/email-provider.interface';

export interface EmailToolsConfig {
  providerRegistry: ProviderRegistry;
}

/**
 * Channel-specific response formatters
 */
interface ResponseFormatter {
  success: (messageId: string, to: string, subject: string) => ChannelResponse;
  error: (errorMessage: string) => ChannelResponse;
  notConfigured: () => ChannelResponse;
}

const responseFormatters: Record<string, ResponseFormatter> = {
  call: {
    success: (messageId, to) => ({
      speak: `I've sent your email to ${to}. You should receive a confirmation shortly.`
    }),
    error: () => ({
      speak: 'I apologize, but I was unable to send the email. Please try again or contact support.'
    }),
    notConfigured: () => ({
      speak: 'I apologize, but email functionality is not configured.'
    })
  },
  sms: {
    success: (messageId, to) => ({
      message: `✓ Email sent to ${to}`
    }),
    error: () => ({
      message: 'Failed to send email. Try again.'
    }),
    notConfigured: () => ({
      message: 'Email not configured'
    })
  },
  email: {
    success: (messageId, to, subject) => ({
      text: `Email sent successfully to ${to}`,
      html: `
        <h3>Email Sent Successfully</h3>
        <p><strong>To:</strong> ${to}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message ID:</strong> ${messageId}</p>
      `
    }),
    error: () => ({
      text: 'Failed to send email. Please try again.',
      html: '<p>Failed to send email. Please try again.</p>'
    }),
    notConfigured: () => ({
      text: 'Email functionality is not configured.',
      html: '<p>Email functionality is not configured.</p>'
    })
  },
  default: {
    success: (messageId, to) => ({
      text: `Email sent to ${to}`
    }),
    error: () => ({
      text: 'Failed to send email'
    }),
    notConfigured: () => ({
      text: 'Email functionality is not configured.'
    })
  }
};

/**
 * Core email sending logic shared across all channel handlers
 */
async function sendEmailCore(
  params: any,
  config: EmailToolsConfig | undefined,
  channel: string
): Promise<ToolResult> {
  if (!config?.providerRegistry) {
    const formatter = responseFormatters[channel] || responseFormatters.default;
    return {
      success: false,
      error: 'Email provider not configured',
      response: formatter.notConfigured()
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

    const formatter = responseFormatters[channel] || responseFormatters.default;

    if (!result.success) {
      const sanitizedError = sanitizeErrorMessage(result.error?.toString() || 'Unknown error');
      return {
        success: false,
        error: sanitizedError,
        response: formatter.error(sanitizedError)
      };
    }

    return {
      success: true,
      data: { messageId: result.messageId },
      response: formatter.success(result.messageId || '', params.to, params.subject)
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const sanitizedError = sanitizeErrorMessage(errorMessage);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('[SendEmailTool] Failed', error as Error, { errorMessage, errorStack });
    
    const formatter = responseFormatters[channel] || responseFormatters.default;
    return {
      success: false,
      error: sanitizedError,
      response: formatter.error(sanitizedError)
    };
  }
}

/**
 * Sanitize error messages for user-facing responses
 * Removes internal details and stack traces
 */
function sanitizeErrorMessage(error: string): string {
  // Remove stack traces
  let sanitized = error.split('\n')[0];
  
  // Remove internal paths
  sanitized = sanitized.replace(/\/[^\s]+/g, '[path]');
  
  // Remove sensitive patterns (API keys, tokens, etc.)
  sanitized = sanitized.replace(/[A-Za-z0-9]{32,}/g, '[redacted]');
  
  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized;
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
      logger.info('[SendEmailTool] Sending email via voice channel');
      return sendEmailCore(params, config, 'call');
    })
    .onSMS(async (params, ctx) => {
      logger.info('[SendEmailTool] Sending email via SMS channel');
      return sendEmailCore(params, config, 'sms');
    })
    .onEmail(async (params, ctx) => {
      logger.info('[SendEmailTool] Sending email via email channel');
      return sendEmailCore(params, config, 'email');
    })
    .default(async (params, ctx) => {
      logger.info('[SendEmailTool] Sending email via default channel');
      return sendEmailCore(params, config, 'default');
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
