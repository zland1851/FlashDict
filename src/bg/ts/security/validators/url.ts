/**
 * URL Validators
 * URL validation with protocol restrictions
 */

import { ValidationResult, ValidatorFn } from './types.js';

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
 * Validate fetch URL (allows relative paths, extension URLs, and http/https)
 * Used for dictionary script fetching where URLs can be:
 * - Relative: /dict/encn_Collins.js
 * - Extension: chrome-extension://xxx/dict/encn_Collins.js
 * - Remote: https://example.com/script.js
 */
export function isFetchUrl(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { success: false, error: 'Expected string URL' };
  }

  // Allow relative paths (starting with /)
  if (value.startsWith('/')) {
    // Basic path validation - no directory traversal
    if (value.includes('..')) {
      return { success: false, error: 'Path traversal not allowed' };
    }
    return { success: true, data: value };
  }

  // Allow absolute URLs with specific protocols
  try {
    const url = new URL(value);
    const allowedProtocols = ['http:', 'https:', 'chrome-extension:'];
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
