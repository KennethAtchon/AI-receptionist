/**
 * Base Email Provider
 * Common base class for all email providers
 */

import { BaseProvider } from '../../../base/base-provider';
import type { IEmailProvider, EmailParams, EmailResult, BulkEmailParams, BulkEmailResult, DeliveryStatus } from '../email-provider.interface';

/**
 * Base class for all email providers
 * Provides common functionality and type safety
 */
export abstract class BaseEmailProvider extends BaseProvider implements IEmailProvider {
  readonly type = 'email' as const;

  /**
   * Send an email
   */
  abstract sendEmail(params: EmailParams): Promise<EmailResult>;

  /**
   * Send bulk emails (optional - not all providers support this)
   */
  sendBulkEmails?(params: BulkEmailParams): Promise<BulkEmailResult>;

  /**
   * Get email delivery status (optional)
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatus>;

  /**
   * Validate email address format
   */
  validateEmail?(email: string): Promise<boolean>;

  /**
   * Get provider configuration (required by IEmailProvider)
   */
  getConfig(): any {
    return super.getConfig();
  }
}

