/**
 * Security Validator
 * Type-safe input validation for messages and parameters
 * Implements validation without external dependencies
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

// ============================================================================
// Primitive Validators
// ============================================================================

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
      if (!result.success) {
        return { success: false, error: `Array item ${i}: ${result.error}` };
      }
      results.push(result.data!);
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

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Allowed URL protocols for security
 */
const ALLOWED_AUDIO_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'] as const;
const ALLOWED_SCRIPT_PROTOCOLS = ['http:', 'https:'] as const;

/**
 * Validate URL with allowed protocols
 */
export function isUrl(allowedProtocols: readonly string[] = ['http:', 'https:']): ValidatorFn<string> {
  return (value: unknown): ValidationResult<string> => {
    if (typeof value !== 'string') {
      return { success: false, error: 'Expected string URL' };
    }

    try {
      const url = new URL(value);
      if (!allowedProtocols.includes(url.protocol)) {
        return {
          success: false,
          error: `URL protocol must be one of: ${allowedProtocols.join(', ')}`
        };
      }
      return { success: true, data: value };
    } catch {
      return { success: false, error: 'Invalid URL format' };
    }
  };
}

/**
 * Validate audio URL (allows http, https, data, blob)
 */
export function isAudioUrl(value: unknown): ValidationResult<string> {
  return isUrl(ALLOWED_AUDIO_PROTOCOLS)(value);
}

/**
 * Validate script URL (allows http, https only)
 */
export function isScriptUrl(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { success: false, error: 'Expected string URL' };
  }

  // Allow local script names (no protocol)
  if (!value.includes('://')) {
    // Validate script name format (alphanumeric, underscore, dash)
    if (/^[a-zA-Z0-9_-]+$/.test(value)) {
      return { success: true, data: value };
    }
    return { success: false, error: 'Invalid script name format' };
  }

  // Handle lib:// prefix (GitHub hosted)
  if (value.startsWith('lib://')) {
    const scriptName = value.replace('lib://', '');
    if (/^[a-zA-Z0-9_/-]+\.js$/.test(scriptName)) {
      return { success: true, data: value };
    }
    return { success: false, error: 'Invalid lib:// script path' };
  }

  return isUrl(ALLOWED_SCRIPT_PROTOCOLS)(value);
}

// ============================================================================
// Object Validation
// ============================================================================

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
          field: key
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
            field: key
          };
        }
      }
    }

    return { success: true, data: result as T };
  };
}

// ============================================================================
// Message Parameter Schemas
// ============================================================================

/**
 * Audio handler params schema
 */
export interface AudioParams {
  url: string;
  callbackId?: string;
}

export const validateAudioParams: ValidatorFn<AudioParams> = createObjectValidator({
  url: isAudioUrl,
  callbackId: isOptional(isString)
}, { allowExtra: false });

/**
 * Translation handler params schema
 */
export interface TranslationParams {
  expression: string;
  callbackId?: string;
}

export const validateTranslationParams: ValidatorFn<TranslationParams> = createObjectValidator({
  expression: isNonEmptyString,
  callbackId: isOptional(isString)
}, { allowExtra: false });

/**
 * Add note params schema
 */
export interface NoteDefParams {
  expression: string;
  reading?: string;
  extrainfo?: string;
  definition?: string;
  definitions?: string;
  sentence?: string;
  url?: string;
  audios: string[];
}

export const validateNoteDefParams: ValidatorFn<NoteDefParams> = createObjectValidator({
  expression: isNonEmptyString,
  reading: isOptional(isString),
  extrainfo: isOptional(isString),
  definition: isOptional(isString),
  definitions: isOptional(isString),
  sentence: isOptional(isString),
  url: isOptional(isString),
  audios: withDefault(isArray(isString), [])
}, { allowExtra: true });

/**
 * Load script params schema
 */
export interface LoadScriptParams {
  name: string;
  callbackId?: string;
}

export const validateLoadScriptParams: ValidatorFn<LoadScriptParams> = createObjectValidator({
  name: isScriptUrl,
  callbackId: isOptional(isString)
}, { allowExtra: false });

/**
 * Find term params schema
 */
export interface FindTermParams {
  expression: string;
  callbackId?: string;
}

export const validateFindTermParams: ValidatorFn<FindTermParams> = createObjectValidator({
  expression: isNonEmptyString,
  callbackId: isOptional(isString)
}, { allowExtra: false });

/**
 * Fetch params schema
 */
export interface FetchParams {
  url: string;
  callbackId?: string;
}

export const validateFetchParams: ValidatorFn<FetchParams> = createObjectValidator({
  url: isUrl(['http:', 'https:']),
  callbackId: isOptional(isString)
}, { allowExtra: false });

/**
 * Deinflect params schema
 */
export interface DeinflectParams {
  word: string;
  callbackId?: string;
}

export const validateDeinflectParams: ValidatorFn<DeinflectParams> = createObjectValidator({
  word: isNonEmptyString,
  callbackId: isOptional(isString)
}, { allowExtra: false });

// ============================================================================
// Options Validation
// ============================================================================

const SERVICES_VALUES = ['none', 'ankiconnect', 'ankiweb'] as const;
const HOTKEY_VALUES = ['0', '16', '17', '18'] as const;
const TOGGLE_VALUES = ['0', '1'] as const;

/**
 * Validate extension options
 */
export const validateExtensionOptions = createObjectValidator({
  enabled: withDefault(isBoolean, true),
  mouseselection: withDefault(isBoolean, true),
  hotkey: withDefault(isEnum(HOTKEY_VALUES), '16'),
  maxcontext: withDefault(isString, '1'),
  maxexample: withDefault(isString, '2'),
  monolingual: withDefault(isEnum(TOGGLE_VALUES), '0'),
  preferredaudio: withDefault(isString, '0'),
  services: withDefault(isEnum(SERVICES_VALUES), 'none'),
  id: withDefault(isString, ''),
  password: withDefault(isString, ''),
  duplicate: withDefault(isEnum(TOGGLE_VALUES), '1'),
  tags: withDefault(isString, 'ODH'),
  deckname: withDefault(isString, 'Default'),
  typename: withDefault(isString, 'Basic'),
  expression: withDefault(isString, 'Front'),
  reading: withDefault(isString, ''),
  extrainfo: withDefault(isString, ''),
  definition: withDefault(isString, 'Back'),
  definitions: withDefault(isString, ''),
  sentence: withDefault(isString, ''),
  url: withDefault(isString, ''),
  audio: withDefault(isString, ''),
  sysscripts: withDefault(isString, ''),
  udfscripts: withDefault(isString, ''),
  dictSelected: withDefault(isString, ''),
  dictNamelist: withDefault(isArray(createObjectValidator({
    objectname: isString,
    displayname: isString
  }, { allowExtra: true })), [])
}, { allowExtra: true });

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Base message structure
 */
export interface BaseMessage {
  action: string;
  params?: unknown;
  target?: string;
  callbackId?: string;
}

/**
 * Validate base message structure
 */
export const validateBaseMessage: ValidatorFn<BaseMessage> = createObjectValidator({
  action: isNonEmptyString,
  params: isOptional((v) => ({ success: true, data: v })),
  target: isOptional(isString),
  callbackId: isOptional(isString)
}, { allowExtra: true });

/**
 * Action-specific validators map
 */
export const ACTION_VALIDATORS: Record<string, ValidatorFn<unknown>> = {
  'playAudio': validateAudioParams,
  'getTranslation': validateTranslationParams,
  'findTerm': validateFindTermParams,
  'loadScript': validateLoadScriptParams,
  'Fetch': validateFetchParams,
  'Deinflect': validateDeinflectParams,
  'opt_optionsChanged': validateExtensionOptions
};

/**
 * Get validator for action
 */
export function getActionValidator(action: string): ValidatorFn<unknown> | undefined {
  return ACTION_VALIDATORS[action];
}

/**
 * Validate message with action-specific validation
 */
export function validateMessage(message: unknown): ValidationResult<BaseMessage> {
  // First validate base structure
  const baseResult = validateBaseMessage(message);
  if (!baseResult.success) {
    return baseResult;
  }

  const msg = baseResult.data!;

  // Get action-specific validator
  const actionValidator = getActionValidator(msg.action);
  if (actionValidator && msg.params !== undefined) {
    const paramsResult = actionValidator(msg.params);
    if (!paramsResult.success) {
      return {
        success: false,
        error: `Invalid params for action '${msg.action}': ${paramsResult.error}`,
        field: paramsResult.field
      };
    }
  }

  return baseResult;
}

// ============================================================================
// Sanitization Helpers
// ============================================================================

/**
 * Sanitize string for safe logging (remove sensitive data)
 */
export function sanitizeForLog(value: unknown, sensitiveKeys: string[] = ['password', 'id']): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeForLog(item, sensitiveKeys));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeForLog(val, sensitiveKeys);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Sanitize HTML to prevent XSS (basic implementation)
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize script name
 */
export function sanitizeScriptName(name: string): string | null {
  // Remove any path traversal attempts
  const sanitized = name
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim();

  // Validate format
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized) && !sanitized.includes('://')) {
    return null;
  }

  return sanitized;
}
