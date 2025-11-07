/**
 * Error Sanitization Utilities
 * Sanitizes error messages for user-facing responses
 */

/**
 * Sanitize error messages for user-facing responses
 * Removes internal details, stack traces, and sensitive information
 * 
 * @param error - Error message or Error object
 * @returns Sanitized error message safe for user display
 * 
 * @example
 * ```typescript
 * const sanitized = sanitizeErrorMessage('Error: API key abc123... in /path/to/file.ts:123');
 * // Returns: "Error: API key [redacted]... in [path]"
 * ```
 */
export function sanitizeErrorMessage(error: string | Error): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Remove stack traces (take only first line)
  let sanitized = errorMessage.split('\n')[0];
  
  // Remove internal file paths
  sanitized = sanitized.replace(/\/[^\s]+/g, '[path]');
  sanitized = sanitized.replace(/\\[^\s]+/g, '[path]');
  
  // Remove sensitive patterns (API keys, tokens, etc.)
  // Matches long alphanumeric strings (likely tokens/keys)
  sanitized = sanitized.replace(/[A-Za-z0-9]{32,}/g, '[redacted]');
  
  // Remove email addresses (keep domain)
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  
  // Remove phone numbers
  sanitized = sanitized.replace(/\+?[\d\s\-\(\)]{10,}/g, '[phone]');
  
  // Limit length to prevent overly long error messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }
  
  return sanitized.trim();
}

