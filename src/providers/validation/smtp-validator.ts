/**
 * SMTP Credential Validator
 * Validates SMTP server configuration
 */

import type { ICredentialValidator, ValidationResult } from './credential-validator.interface';
import type { IProvider } from '../../types';
import type { SMTPConfig } from '../email/smtp.provider';

export class SMTPValidator implements ICredentialValidator {
  validateFormat(config: SMTPConfig): ValidationResult {
    // Check required fields
    if (!config.host) {
      return {
        valid: false,
        error: 'Missing SMTP host',
        details: { provider: 'smtp' }
      };
    }

    if (!config.port) {
      return {
        valid: false,
        error: 'Missing SMTP port',
        details: { provider: 'smtp' }
      };
    }

    if (!config.username || !config.password) {
      return {
        valid: false,
        error: 'Missing SMTP credentials (username/password)',
        details: {
          hasUsername: !!config.username,
          hasPassword: !!config.password
        }
      };
    }

    if (!config.fromEmail) {
      return {
        valid: false,
        error: 'Missing from email address',
        details: { provider: 'smtp' }
      };
    }

    // Validate port range
    if (config.port < 1 || config.port > 65535) {
      return {
        valid: false,
        error: 'Invalid SMTP port (must be 1-65535)',
        details: { port: config.port }
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.fromEmail)) {
      return {
        valid: false,
        error: 'Invalid from email address format',
        details: { fromEmail: config.fromEmail }
      };
    }

    return { valid: true };
  }

  async validateConnection(provider: IProvider): Promise<ValidationResult> {
    const healthy = await provider.healthCheck();
    return healthy ? { valid: true } : { valid: false, error: 'Failed to connect to SMTP server' };
  }
}
