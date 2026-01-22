/**
 * Object Validator
 * Schema-based object validation
 */

import { ValidationResult, ValidatorFn, SchemaDefinition } from './types.js';

/**
 * Create object validator from schema
 */
export function createObjectValidator<T extends Record<string, unknown>>(
  schema: SchemaDefinition<T>,
  options: { allowExtra?: boolean } = {}
): ValidatorFn<T> {
  return (value: unknown): ValidationResult<T> => {
    if (typeof value !== 'object' || value === null) {
      return { success: false, error: 'Expected object' };
    }

    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    // Validate each field in schema
    for (const [key, validator] of Object.entries(schema)) {
      const fieldResult = (validator as ValidatorFn<unknown>)(obj[key]);
      if (!fieldResult.success) {
        return {
          success: false,
          error: `Field '${key}': ${fieldResult.error}`,
          field: key,
        };
      }
      if (fieldResult.data !== undefined) {
        result[key] = fieldResult.data;
      }
    }

    // Check for extra fields if not allowed
    if (!options.allowExtra) {
      const schemaKeys = new Set(Object.keys(schema));
      for (const key of Object.keys(obj)) {
        if (!schemaKeys.has(key)) {
          return {
            success: false,
            error: `Unexpected field: '${key}'`,
            field: key,
          };
        }
      }
    }

    return { success: true, data: result as T };
  };
}
