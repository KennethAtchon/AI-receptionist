/**
 * ID Generator Utilities
 * Centralized ID generation for consistent IDs across the system
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID with an optional prefix
 * @param prefix - Optional prefix for the ID (e.g., 'tool-exec', 'log-tool-registered')
 * @returns A unique ID string in format: {prefix}-{uuid} or just {uuid} if no prefix
 */
export function generateId(prefix?: string): string {
  const uuid = uuidv4();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Generate a timestamp-based ID with prefix
 * Legacy function for backward compatibility
 * @param prefix - Prefix for the ID
 * @returns A timestamp-based ID: {prefix}-{timestamp}-{random}
 * @deprecated Use generateId() instead for better uniqueness
 */
export function generateTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

