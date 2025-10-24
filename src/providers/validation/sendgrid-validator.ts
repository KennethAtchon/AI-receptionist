/**
 * SendGrid Credential Validator
 * Validates SendGrid API key format and connection
 */

import type { ICredentialValidator, ValidationResult } from './credential-validator.interface';
import type { IProvider } from '../../types';
import type { SendGridConfig } from '../email/sendgrid.provider';

export class SendGridValidator implements ICredentialValidator {
  validateFormat(config: SendGridConfig): ValidationResult {
    // Check required fields
    if (!config.apiKey) {
      return {
        valid: false,
        error: 'Missing SendGrid API key',
        details: { provider: 'sendgrid' }
      };
    }

    if (!config.fromEmail) {
      return {
        valid: false,
        error: 'Missing from email address',
        details: { provider: 'sendgrid' }
      };
    }

    // Validate API key format (SendGrid keys start with 'SG.')
    if (!config.apiKey.startsWith('SG.')) {
      return {
        valid: false,
        error: 'Invalid SendGrid API key format (should start with "SG.")',
        details: { provider: 'sendgrid' }
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
    return healthy ? { valid: true } : { valid: false, error: 'Failed to connect to SendGrid API' };
  }
}
