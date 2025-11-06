/**
 * Postmark Credential Validator
 * Validates Postmark configuration and credentials
 */

import type { ValidationResult } from '../credential-validator.interface';
import { BaseValidator } from '../base/validator.base';
import { logger } from '../../../utils/logger';

export interface PostmarkCredentials {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  // Webhook secret for verifying inbound webhook signatures (optional)
  // Note: The webhook URL is configured in Postmark's dashboard, not here
  webhookSecret?: string;
}

export class PostmarkValidator extends BaseValidator {
  readonly providerName = 'postmark';

  validateFormat(config: PostmarkCredentials): ValidationResult {
    const errors: string[] = [];

    // Validate API key
    if (!config.apiKey) {
      errors.push('Postmark API key is required');
    } else if (!this.isValidApiKey(config.apiKey)) {
      errors.push('Postmark API key must be a valid server token (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
    }

    // Validate from email
    if (!config.fromEmail) {
      errors.push('From email is required');
    } else if (!this.isValidEmail(config.fromEmail)) {
      errors.push('From email must be a valid email address');
    }

    // Validate reply-to email (if provided)
    if (config.replyTo && !this.isValidEmail(config.replyTo)) {
      errors.push('Reply-to must be a valid email address');
    }

    const isValid = errors.length === 0;

    if (isValid) {
      logger.info('[PostmarkValidator] Format validation passed');
    } else {
      logger.warn('[PostmarkValidator] Format validation failed', { errors });
    }

    return {
      valid: isValid,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      details: { errors }
    };
  }

  async validateConnection(provider: any): Promise<ValidationResult> {
    try {
      logger.info('[PostmarkValidator] Testing Postmark API connection');

      const healthy = await provider.healthCheck();

      if (healthy) {
        logger.info('[PostmarkValidator] Connection test passed');
        return { valid: true };
      } else {
        logger.error('[PostmarkValidator] Health check failed');
        return {
          valid: false,
          error: 'Failed to connect to Postmark API'
        };
      }
    } catch (error: any) {
      logger.error('[PostmarkValidator] Connection test failed:', error);

      let errorMessage = 'Failed to connect to Postmark API';

      if (error.statusCode === 401 || error.statusCode === 422) {
        errorMessage = 'Invalid Postmark API key';
      } else if (error.statusCode === 403) {
        errorMessage = 'Postmark API key does not have sufficient permissions';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        valid: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Postmark API key format
   * Server tokens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID format)
   * Account tokens: not supported for sending (only for account management)
   */
  private isValidApiKey(apiKey: string): boolean {
    // Postmark server token format (UUID)
    const serverTokenRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return serverTokenRegex.test(apiKey);
  }

  /**
   * Mask sensitive data for logging
   */
  mask(credentials: PostmarkCredentials): Partial<PostmarkCredentials> {
    return {
      apiKey: this.maskString(credentials.apiKey),
      fromEmail: credentials.fromEmail,
      fromName: credentials.fromName,
      replyTo: credentials.replyTo,
      webhookSecret: credentials.webhookSecret ? '***' : undefined
    };
  }

  private maskString(str: string): string {
    if (!str || str.length < 8) return '***';
    return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
  }
}
