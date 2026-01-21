/**
 * Validation Types
 * Core types and interfaces for the validation system
 */

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  field?: string;
}

/**
 * Validator function type
 */
export type ValidatorFn<T> = (value: unknown) => ValidationResult<T>;

/**
 * Schema definition for object validation
 */
export type SchemaDefinition<T> = {
  [K in keyof T]: ValidatorFn<T[K]>;
};

/**
 * Validation error with details
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
