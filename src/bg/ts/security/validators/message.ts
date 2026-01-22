/**
 * Message Validation
 * Message structure and action-specific validation
 */

import { ValidationResult, ValidatorFn } from './types.js';
import { isString, isNonEmptyString, isCallbackId, isOptional } from './primitives.js';
import { createObjectValidator } from './object.js';
import {
  validateAudioParams,
  validateTranslationParams,
  validateFindTermParams,
  validateLoadScriptParams,
  validateFetchParams,
  validateDeinflectParams,
} from './schemas.js';
import { validateExtensionOptions } from './options.js';

/**
 * Base message structure
 */
export interface BaseMessage {
  action: string;
  params?: unknown;
  target?: string;
  callbackId?: string | number;
}

/**
 * Validate base message structure
 */
export const validateBaseMessage: ValidatorFn<BaseMessage> = createObjectValidator(
  {
    action: isNonEmptyString,
    params: isOptional((v) => ({ success: true, data: v })),
    target: isOptional(isString),
    callbackId: isOptional(isCallbackId),
  },
  { allowExtra: true }
);

/**
 * Action-specific validators map
 */
export const ACTION_VALIDATORS: Record<string, ValidatorFn<unknown>> = {
  playAudio: validateAudioParams,
  getTranslation: validateTranslationParams,
  findTerm: validateFindTermParams,
  loadScript: validateLoadScriptParams,
  Fetch: validateFetchParams,
  Deinflect: validateDeinflectParams,
  opt_optionsChanged: validateExtensionOptions,
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
  if (!baseResult.success || !baseResult.data) {
    return baseResult;
  }

  const msg = baseResult.data;

  // Get action-specific validator
  const actionValidator = getActionValidator(msg.action);
  if (actionValidator && msg.params !== undefined) {
    const paramsResult = actionValidator(msg.params);
    if (!paramsResult.success) {
      return {
        success: false,
        error: `Invalid params for action '${msg.action}': ${paramsResult.error}`,
        field: paramsResult.field,
      };
    }
  }

  return baseResult;
}
