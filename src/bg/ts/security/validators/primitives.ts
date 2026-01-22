/**
 * Primitive Validators
 * Basic type validation functions
 */

import { ValidationResult, ValidatorFn } from './types.js';

/**
 * Validate string
 */
export function isString(value: unknown): ValidationResult<string> {
  if (typeof value === 'string') {
    return { success: true, data: value };
  }
  return { success: false, error: 'Expected string' };
}

/**
 * Validate non-empty string
 */
export function isNonEmptyString(value: unknown): ValidationResult<string> {
  if (typeof value === 'string' && value.length > 0) {
    return { success: true, data: value };
  }
  return { success: false, error: 'Expected non-empty string' };
}

/**
 * Validate callback ID (can be string or number)
 * The sandbox Agent uses Math.random() which produces a number
 */
export function isCallbackId(value: unknown): ValidationResult<string | number> {
  if (typeof value === 'string' || typeof value === 'number') {
    return { success: true, data: value };
  }
  return { success: false, error: 'Expected string or number callback ID' };
}

/**
 * Validate string with max length
 */
export function isStringMaxLength(maxLength: number): ValidatorFn<string> {
  return (value: unknown): ValidationResult<string> => {
    if (typeof value === 'string' && value.length <= maxLength) {
      return { success: true, data: value };
    }
    return { success: false, error: `Expected string with max length ${maxLength}` };
  };
}

/**
 * Validate boolean
 */
export function isBoolean(value: unknown): ValidationResult<boolean> {
  if (typeof value === 'boolean') {
    return { success: true, data: value };
  }
  return { success: false, error: 'Expected boolean' };
}

/**
 * Validate number
 */
export function isNumber(value: unknown): ValidationResult<number> {
  if (typeof value === 'number' && !isNaN(value)) {
    return { success: true, data: value };
  }
  return { success: false, error: 'Expected number' };
}

/**
 * Validate integer
 */
export function isInteger(value: unknown): ValidationResult<number> {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return { success: true, data: value };
  }
  return { success: false, error: 'Expected integer' };
}

/**
 * Validate array
 */
export function isArray<T>(itemValidator: ValidatorFn<T>): ValidatorFn<T[]> {
  return (value: unknown): ValidationResult<T[]> => {
    if (!Array.isArray(value)) {
      return { success: false, error: 'Expected array' };
    }
    const results: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const result = itemValidator(value[i]);
      if (!result.success || result.data === undefined) {
        return { success: false, error: `Array item ${i}: ${result.error ?? 'undefined data'}` };
      }
      results.push(result.data);
    }
    return { success: true, data: results };
  };
}

/**
 * Validate enum value
 */
export function isEnum<T extends string>(allowedValues: readonly T[]): ValidatorFn<T> {
  return (value: unknown): ValidationResult<T> => {
    if (typeof value === 'string' && allowedValues.includes(value as T)) {
      return { success: true, data: value as T };
    }
    return { success: false, error: `Expected one of: ${allowedValues.join(', ')}` };
  };
}

/**
 * Optional validator
 */
export function isOptional<T>(validator: ValidatorFn<T>): ValidatorFn<T | undefined> {
  return (value: unknown): ValidationResult<T | undefined> => {
    if (value === undefined || value === null) {
      return { success: true, data: undefined };
    }
    return validator(value);
  };
}

/**
 * Validate with default value
 */
export function withDefault<T>(validator: ValidatorFn<T>, defaultValue: T): ValidatorFn<T> {
  return (value: unknown): ValidationResult<T> => {
    if (value === undefined || value === null) {
      return { success: true, data: defaultValue };
    }
    return validator(value);
  };
}
