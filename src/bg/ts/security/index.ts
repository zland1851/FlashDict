/**
 * Security Module
 * Exports all security-related functionality
 */

// Validator exports
export {
  // Types
  type ValidationResult,
  type ValidatorFn,
  type SchemaDefinition,
  ValidationError,

  // Primitive validators
  isString,
  isNonEmptyString,
  isStringMaxLength,
  isBoolean,
  isNumber,
  isInteger,
  isArray,
  isEnum,
  isOptional,
  withDefault,

  // URL validators
  isUrl,
  isAudioUrl,
  isScriptUrl,

  // Object validators
  createObjectValidator,

  // Message param validators
  type AudioParams,
  validateAudioParams,
  type TranslationParams,
  validateTranslationParams,
  type NoteDefParams,
  validateNoteDefParams,
  type LoadScriptParams,
  validateLoadScriptParams,
  type FindTermParams,
  validateFindTermParams,
  type FetchParams,
  validateFetchParams,
  type DeinflectParams,
  validateDeinflectParams,

  // Options validator
  validateExtensionOptions,

  // Message validators
  type BaseMessage,
  validateBaseMessage,
  validateMessage,
  ACTION_VALIDATORS,
  getActionValidator,

  // Sanitizers
  sanitizeForLog,
  sanitizeHtml,
  sanitizeScriptName
} from './Validator';

// Security middleware exports
export {
  // Types
  type SecurityConfig,
  SecurityError,
  type SecurityErrorCode,
  type SecurityContext,
  type MiddlewareFn,

  // Middleware factories
  createSecurityMiddleware,
  createSecurityValidationMiddleware,
  createSecurityRateLimitMiddleware,
  composeMiddleware,
  defaultSecurityMiddleware
} from './SecurityMiddleware';

// Credential manager exports
export {
  // Types
  type CredentialType,
  type CredentialManagerConfig,

  // Classes
  CredentialManager,
  AnkiWebCredentials,

  // Factory and global
  createCredentialManager,
  getCredentialManager,
  setCredentialManager,
  resetCredentialManager
} from './CredentialManager';
