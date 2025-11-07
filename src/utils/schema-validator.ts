/**
 * Schema Validation Utilities
 * Basic JSONSchema validation for tool parameters
 * 
 * Note: For full JSONSchema validation, consider adding 'ajv' package
 */

import type { JSONSchema } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Basic parameter validation against JSONSchema
 * Validates required fields and basic types
 * 
 * @param schema - JSONSchema definition
 * @param data - Data to validate
 * @returns Validation result with errors if any
 */
export function validateParameters(schema: JSONSchema, data: any): ValidationResult {
  const errors: string[] = [];

  if (!schema || typeof schema !== 'object') {
    return { valid: false, errors: ['Invalid schema'] };
  }

  if (schema.type !== 'object') {
    // For now, only validate object schemas
    return { valid: true, errors: [] };
  }

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate properties if schema has properties
  if (schema.properties && typeof schema.properties === 'object') {
    for (const [key, value] of Object.entries(data)) {
      const propSchema = (schema.properties as Record<string, any>)[key];
      
      if (propSchema) {
        // Type validation
        if (propSchema.type) {
          const expectedType = propSchema.type;
          const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
          
          if (expectedType === 'array' && !Array.isArray(data[key])) {
            errors.push(`Field '${key}' must be an array`);
          } else if (expectedType !== 'array' && actualType !== expectedType) {
            errors.push(`Field '${key}' must be of type ${expectedType}, got ${actualType}`);
          }
        }

        // Enum validation
        if (propSchema.enum && Array.isArray(propSchema.enum)) {
          if (!propSchema.enum.includes(data[key])) {
            errors.push(`Field '${key}' must be one of: ${propSchema.enum.join(', ')}`);
          }
        }

        // Format validation (basic)
        if (propSchema.format === 'email' && data[key]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data[key])) {
            errors.push(`Field '${key}' must be a valid email address`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

