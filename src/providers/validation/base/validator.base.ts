/**
 * Base Validator Class
 * Provides common validation functionality for all provider validators
 */

import type { IProvider } from '../../../types';
import type { ICredentialValidator, ValidationResult } from '../credential-validator.interface';

/**
 * Base class for all provider validators
 * Provides common validation helpers and structure
 */
export abstract class BaseValidator implements ICredentialValidator {
  abstract readonly providerName: string;

  /**
   * Validate credential format without making API calls
   * Checks if credentials exist and have correct structure
   */
  abstract validateFormat(config: any): ValidationResult;

  /**
   * Validate credentials by making a lightweight API call
   * Verifies that credentials actually work with the provider's API
   */
  abstract validateConnection(provider: IProvider): Promise<ValidationResult>;

  /**
   * Common validation helper: Check required fields
   */
  protected validateRequired(config: any, fields: string[]): ValidationResult {
    for (const field of fields) {
      if (!config || !config[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`,
          details: { field, provided: !!config }
        };
      }
    }
    return { valid: true };
  }

  /**
   * Common validation helper: Check field format
   */
  protected validateFormatPattern(
    config: any,
    field: string,
    pattern: RegExp,
    errorMessage?: string
  ): ValidationResult {
    if (!config || !config[field]) {
      return {
        valid: false,
        error: `Missing required field: ${field}`,
        details: { field }
      };
    }

    if (!pattern.test(config[field])) {
      return {
        valid: false,
        error: errorMessage || `Invalid format for field: ${field}`,
        details: { field, value: config[field] }
      };
    }

    return { valid: true };
  }

  /**
   * Common validation helper: Check string length
   */
  protected validateStringLength(
    config: any,
    field: string,
    minLength?: number,
    maxLength?: number
  ): ValidationResult {
    if (!config || !config[field]) {
      return {
        valid: false,
        error: `Missing required field: ${field}`,
        details: { field }
      };
    }

    const value = String(config[field]);
    const length = value.length;

    if (minLength !== undefined && length < minLength) {
      return {
        valid: false,
        error: `Field ${field} must be at least ${minLength} characters`,
        details: { field, length, minLength }
      };
    }

    if (maxLength !== undefined && length > maxLength) {
      return {
        valid: false,
        error: `Field ${field} must be at most ${maxLength} characters`,
        details: { field, length, maxLength }
      };
    }

    return { valid: true };
  }
}

