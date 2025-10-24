/**
 * Resend Credential Validator
 * Validates Resend API key format and connection
 */

import type { ICredentialValidator, ValidationResult } from './credential-validator.interface';
import type { IProvider } from '../../types';
import type { ResendConfig } from '../email/resend.provider';

export class ResendValidator implements ICredentialValidator {
  validateFormat(config: ResendConfig): ValidationResult {
    // Check required fields
    if (!config.apiKey) {
      return {
        valid: false,
        error: 'Missing Resend API key',
        details: { provider: 'resend' }
      };
    }

    if (!config.fromEmail) {
      return {
        valid: false,
        error: 'Missing from email address',
        details: { provider: 'resend' }
      };
    }

    // Validate API key format (Resend keys start with 're_')
    if (!config.apiKey.startsWith('re_')) {
      return {
        valid: false,
        error: 'Invalid Resend API key format (should start with "re_")',
        details: { provider: 'resend' }
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
    return healthy ? { valid: true } : { valid: false, error: 'Failed to connect to Resend API' };
  }
}
