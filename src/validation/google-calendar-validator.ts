/**
 * Google Calendar Credential Validator
 * Validates Google Calendar API credentials using Strategy Pattern
 */

import type { IProvider, GoogleCalendarConfig } from '../types';
import type { ICredentialValidator, ValidationResult } from './credential-validator.interface';
import { logger } from '../utils/logger';

/**
 * Validator for Google Calendar provider credentials
 * Implements ICredentialValidator strategy
 *
 * Validates:
 * - API key or service account credentials presence
 * - Calendar ID format
 * - API connectivity via health check
 *
 * @example
 * ```typescript
 * const validator = new GoogleCalendarValidator();
 *
 * // Format validation
 * const formatResult = validator.validateFormat(config);
 * if (!formatResult.valid) {
 *   console.error(formatResult.error);
 * }
 *
 * // Connection validation
 * const provider = new GoogleCalendarProvider(config);
 * await provider.initialize();
 * const connResult = await validator.validateConnection(provider);
 * ```
 */
export class GoogleCalendarValidator implements ICredentialValidator {
  /**
   * Validate Google Calendar credential format
   * Checks structure without making API calls
   */
  validateFormat(config: GoogleCalendarConfig): ValidationResult {
    // Check that at least one authentication method is provided
    if (!config.apiKey && !config.credentials) {
      return {
        valid: false,
        error: 'Missing Google Calendar credentials (apiKey or credentials required)',
        details: {
          hasApiKey: !!config.apiKey,
          hasCredentials: !!config.credentials
        }
      };
    }

    // Validate calendar ID is provided
    if (!config.calendarId) {
      return {
        valid: false,
        error: 'Missing Google Calendar ID',
        details: {
          hasApiKey: !!config.apiKey,
          hasCredentials: !!config.credentials
        }
      };
    }

    // Validate calendar ID format (typically email-like or 'primary')
    if (config.calendarId !== 'primary' && !this.isValidCalendarId(config.calendarId)) {
      return {
        valid: false,
        error: 'Invalid Google Calendar ID format (should be email-like format or "primary")',
        details: { calendarId: config.calendarId }
      };
    }

    // If using service account credentials, validate structure
    if (config.credentials) {
      const credsResult = this.validateCredentialsObject(config.credentials);
      if (!credsResult.valid) {
        return credsResult;
      }
    }

    // If using API key, validate format
    if (config.apiKey) {
      const keyResult = this.validateApiKeyFormat(config.apiKey);
      if (!keyResult.valid) {
        return keyResult;
      }
    }

    logger.info('[GoogleCalendarValidator] Format validation passed');
    return { valid: true };
  }

  /**
   * Validate calendar ID format
   */
  private isValidCalendarId(calendarId: string): boolean {
    // Calendar IDs are typically email addresses or special values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(calendarId) || calendarId === 'primary';
  }

  /**
   * Validate service account credentials object structure
   */
  private validateCredentialsObject(credentials: any): ValidationResult {
    if (typeof credentials !== 'object' || credentials === null) {
      return {
        valid: false,
        error: 'Invalid credentials format (should be an object)',
        details: { type: typeof credentials }
      };
    }

    // Check for required fields in service account credentials
    const requiredFields = ['client_email', 'private_key'];
    const missingFields = requiredFields.filter(field => !credentials[field]);

    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Missing required fields in service account credentials: ${missingFields.join(', ')}`,
        details: { missingFields }
      };
    }

    // Validate private key format
    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      return {
        valid: false,
        error: 'Invalid private key format in service account credentials',
        details: { hasPrivateKey: !!credentials.private_key }
      };
    }

    // Validate client email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.client_email)) {
      return {
        valid: false,
        error: 'Invalid client_email format in service account credentials',
        details: { clientEmail: credentials.client_email }
      };
    }

    return { valid: true };
  }

  /**
   * Validate Google API key format
   */
  private validateApiKeyFormat(apiKey: string): ValidationResult {
    // Google API keys are typically 39 characters
    if (apiKey.length < 20) {
      return {
        valid: false,
        error: 'Google API key appears too short',
        details: { length: apiKey.length }
      };
    }

    // Google API keys typically start with 'AIza'
    if (!apiKey.startsWith('AIza')) {
      logger.warn('[GoogleCalendarValidator] API key does not start with "AIza" - may be invalid');
    }

    return { valid: true };
  }

  /**
   * Validate Google Calendar credentials by testing API connectivity
   * Makes a lightweight API call to verify credentials work
   */
  async validateConnection(provider: IProvider): Promise<ValidationResult> {
    try {
      logger.info('[GoogleCalendarValidator] Testing Google Calendar API connection');

      // Use provider's health check to verify credentials
      const isHealthy = await provider.healthCheck();

      if (!isHealthy) {
        return {
          valid: false,
          error: 'Google Calendar credentials are invalid or calendar is not accessible. Please verify your API key or service account credentials.',
          details: {
            providerName: provider.name,
            healthCheckFailed: true
          }
        };
      }

      logger.info('[GoogleCalendarValidator] Connection validation passed');
      return { valid: true };
    } catch (error) {
      logger.error('[GoogleCalendarValidator] Connection validation failed:', error);

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
      const message = error.message.toLowerCase();

      // Authentication errors
      if (message.includes('unauthorized') || message.includes('401')) {
        return 'Google Calendar authentication failed. Please verify your API key or service account credentials.';
      }

      if (message.includes('invalid credentials')) {
        return 'Invalid Google Calendar credentials. Please check your API key or service account configuration.';
      }

      // Permission errors
      if (message.includes('forbidden') || message.includes('403')) {
        return 'Insufficient permissions to access Google Calendar. Please ensure the calendar is shared with the service account or API key has correct permissions.';
      }

      // Not found errors
      if (message.includes('not found') || message.includes('404')) {
        return 'Google Calendar not found. Please verify the calendar ID is correct.';
      }

      // Quota errors
      if (message.includes('quota') || message.includes('rate limit')) {
        return 'Google Calendar API quota exceeded. Please try again later or increase your quota.';
      }

      // API not enabled
      if (message.includes('api not enabled')) {
        return 'Google Calendar API is not enabled for this project. Please enable it in Google Cloud Console.';
      }

      // Network errors
      if (message.includes('network') || message.includes('enotfound')) {
        return 'Network error connecting to Google Calendar API. Please check your internet connection.';
      }

      if (message.includes('timeout')) {
        return 'Google Calendar API request timed out. Please try again.';
      }

      return error.message;
    }

    return 'Unknown error validating Google Calendar credentials';
  }
}
