/**
 * Provider Error Classes
 * Custom error hierarchy for provider-related failures
 */

/**
 * Base error for all provider-related errors
 * Follows CLAUDE.md error handling best practices
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProviderError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when provider credentials fail validation
 * Used for early validation during SDK initialization
 *
 * @example
 * ```typescript
 * throw new CredentialValidationError(
 *   'twilio',
 *   'Invalid API credentials',
 *   { accountSid: 'AC123...' }
 * );
 * ```
 */
export class CredentialValidationError extends ProviderError {
  constructor(
    providerName: string,
    details: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Invalid credentials for ${providerName}: ${details}`,
      'CREDENTIAL_VALIDATION_ERROR',
      401,
      { providerName, details, ...context }
    );
    this.name = 'CredentialValidationError';
  }
}

/**
 * Thrown when trying to access a provider that wasn't configured
 * Indicates missing credentials in SDK configuration
 *
 * @example
 * ```typescript
 * throw new ProviderNotConfiguredError('twilio');
 * // Error: Provider 'twilio' is not configured. Please provide credentials...
 * ```
 */
export class ProviderNotConfiguredError extends ProviderError {
  constructor(providerName: string) {
    super(
      `Provider '${providerName}' is not configured. Please provide credentials in the SDK configuration.`,
      'PROVIDER_NOT_CONFIGURED',
      400,
      { providerName }
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

/**
 * Thrown when provider initialization fails
 * Indicates internal errors during provider setup
 *
 * @example
 * ```typescript
 * throw new ProviderInitializationError(
 *   'openai',
 *   'Failed to connect to API',
 *   { error: originalError }
 * );
 * ```
 */
export class ProviderInitializationError extends ProviderError {
  constructor(
    providerName: string,
    details: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Failed to initialize ${providerName}: ${details}`,
      'PROVIDER_INITIALIZATION_ERROR',
      500,
      { providerName, details, ...context }
    );
    this.name = 'ProviderInitializationError';
  }
}
