/**
 * Twilio Credential Validator
 * Validates Twilio API credentials using Strategy Pattern
 */

import type { IProvider, TwilioConfig } from '../types';
import type { ICredentialValidator, ValidationResult } from './credential-validator.interface';
import { logger } from '../utils/logger';

/**
 * Validator for Twilio communication provider credentials
 * Implements ICredentialValidator strategy
 *
 * Validates:
 * - Account SID format (starts with 'AC')
 * - Auth token presence
 * - Phone number E.164 format
 * - API connectivity via health check
 *
 * @example
 * ```typescript
 * const validator = new TwilioValidator();
 *
 * // Format validation
 * const formatResult = validator.validateFormat(config);
 * if (!formatResult.valid) {
 *   console.error(formatResult.error);
 * }
 *
 * // Connection validation
 * const provider = new TwilioProvider(config);
 * await provider.initialize();
 * const connResult = await validator.validateConnection(provider);
 * ```
 */
export class TwilioValidator implements ICredentialValidator {
  /**
   * Validate Twilio credential format
   * Checks structure without making API calls
   */
  validateFormat(config: TwilioConfig): ValidationResult {
    // Check required fields
    if (!config.accountSid || !config.authToken || !config.phoneNumber) {
      return {
        valid: false,
        error: 'Missing required Twilio credentials (accountSid, authToken, phoneNumber)',
        details: {
          hasAccountSid: !!config.accountSid,
          hasAuthToken: !!config.authToken,
          hasPhoneNumber: !!config.phoneNumber
        }
      };
    }

    // Validate Account SID format
    if (!config.accountSid.startsWith('AC')) {
      return {
        valid: false,
        error: 'Invalid Twilio Account SID format (should start with "AC")',
        details: { accountSid: config.accountSid.substring(0, 5) + '...' }
      };
    }

    // Validate Account SID length (should be 34 characters)
    if (config.accountSid.length !== 34) {
      return {
        valid: false,
        error: 'Invalid Twilio Account SID length (should be 34 characters)',
        details: { length: config.accountSid.length }
      };
    }

    // Validate phone number format (E.164)
    // E.164 format: +[country code][number] (e.g., +12345678901)
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    if (!e164Regex.test(config.phoneNumber)) {
      return {
        valid: false,
        error: 'Invalid phone number format (use E.164 format: +1234567890)',
        details: { phoneNumber: config.phoneNumber }
      };
    }

    logger.info('[TwilioValidator] Format validation passed');
    return { valid: true };
  }

  /**
   * Validate Twilio credentials by testing API connectivity
   * Makes a lightweight API call to verify credentials work
   */
  async validateConnection(provider: IProvider): Promise<ValidationResult> {
    try {
      logger.info('[TwilioValidator] Testing Twilio API connection');

      // Use provider's health check to verify credentials
      const isHealthy = await provider.healthCheck();

      if (!isHealthy) {
        return {
          valid: false,
          error: 'Twilio credentials are invalid or account is not accessible. Please verify your Account SID and Auth Token.',
          details: {
            providerName: provider.name,
            healthCheckFailed: true
          }
        };
      }

      logger.info('[TwilioValidator] Connection validation passed');
      return { valid: true };
    } catch (error) {
      logger.error('[TwilioValidator] Connection validation failed:', error instanceof Error ? error : new Error(String(error)));

      return {
        valid: false,
        error: this.parseErrorMessage(error),
        details: {
          originalError: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      };
    }
  }

  /**
   * Parse error message into user-friendly format
   */
  private parseErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Common Twilio error patterns
      if (error.message.includes('authenticate')) {
        return 'Authentication failed. Please verify your Twilio Account SID and Auth Token.';
      }
      if (error.message.includes('20003')) {
        return 'Twilio authentication failed (Error 20003). Invalid credentials.';
      }
      if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        return 'Network error connecting to Twilio API. Please check your internet connection.';
      }
      if (error.message.includes('timeout')) {
        return 'Twilio API request timed out. Please try again.';
      }

      return error.message;
    }

    return 'Unknown error validating Twilio credentials';
  }
}
