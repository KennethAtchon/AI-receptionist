/**
 * Credential Validation Strategy Interface
 * Defines contract for validating provider credentials
 */

import type { IProvider } from '../types';

/**
 * Result of credential validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Additional context about the validation */
  details?: Record<string, any>;
}

/**
 * Strategy interface for credential validation
 * Each provider type implements its own validation logic
 *
 * Implementation follows Strategy Pattern from CLAUDE.md
 *
 * @example
 * ```typescript
 * class TwilioValidator implements ICredentialValidator {
 *   validateFormat(config: TwilioConfig): ValidationResult {
 *     if (!config.accountSid?.startsWith('AC')) {
 *       return { valid: false, error: 'Invalid Account SID' };
 *     }
 *     return { valid: true };
 *   }
 *
 *   async validateConnection(provider: TwilioProvider): Promise<ValidationResult> {
 *     const healthy = await provider.healthCheck();
 *     return healthy
 *       ? { valid: true }
 *       : { valid: false, error: 'Failed to connect to Twilio API' };
 *   }
 * }
 * ```
 */
export interface ICredentialValidator {
  /**
   * Validate credential format without making API calls
   * Checks if credentials exist and have correct structure
   *
   * @param config - Provider configuration to validate
   * @returns Validation result with error details if invalid
   */
  validateFormat(config: any): ValidationResult;

  /**
   * Validate credentials by making a lightweight API call
   * Verifies that credentials actually work with the provider's API
   *
   * @param provider - Initialized provider instance
   * @returns Promise resolving to validation result
   */
  validateConnection(provider: IProvider): Promise<ValidationResult>;
}
