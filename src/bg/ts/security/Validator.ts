/**
 * Security Validator
 * Barrel file - re-exports all validation modules
 *
 * This file maintains backward compatibility by re-exporting
 * all validators from the validators/ subdirectory.
 */

// Types
export {
  ValidationResult,
  ValidatorFn,
  SchemaDefinition,
  ValidationError
} from './validators/types.js';

// Primitive validators
export {
  isString,
  isNonEmptyString,
  isCallbackId,
  isStringMaxLength,
  isBoolean,
  isNumber,
  isInteger,
  isArray,
  isEnum,
  isOptional,
  withDefault
} from './validators/primitives.js';

// URL validators
export {
  isUrl,
  isAudioUrl,
  isFetchUrl,
  isScriptUrl
} from './validators/url.js';

// Object validator
export { createObjectValidator } from './validators/object.js';

// Message parameter schemas
export {
  AudioParams,
  validateAudioParams,
  TranslationParams,
  validateTranslationParams,
  NoteDefParams,
  validateNoteDefParams,
  LoadScriptParams,
  validateLoadScriptParams,
  FindTermParams,
  validateFindTermParams,
  FetchParams,
  validateFetchParams,
  DeinflectParams,
  validateDeinflectParams
} from './validators/schemas.js';

// Options validation
export { validateExtensionOptions } from './validators/options.js';

// Message validation
export {
  BaseMessage,
  validateBaseMessage,
  ACTION_VALIDATORS,
  getActionValidator,
  validateMessage
} from './validators/message.js';

// Sanitization helpers
export {
  sanitizeForLog,
  sanitizeHtml,
  sanitizeScriptName
} from './validators/sanitizers.js';
