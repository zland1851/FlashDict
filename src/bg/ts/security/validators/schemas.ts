/**
 * Message Parameter Schemas
 * Validation schemas for message parameters
 */

import { ValidatorFn } from './types.js';
import {
  isString,
  isNonEmptyString,
  isCallbackId,
  isOptional,
  isArray,
  withDefault
} from './primitives.js';
import { isAudioUrl, isFetchUrl, isScriptUrl } from './url.js';
import { createObjectValidator } from './object.js';

/**
 * Audio handler params schema
 */
export interface AudioParams {
  url: string;
  callbackId?: string | number;
}

export const validateAudioParams: ValidatorFn<AudioParams> = createObjectValidator({
  url: isAudioUrl,
  callbackId: isOptional(isCallbackId)
}, { allowExtra: false });

/**
 * Translation handler params schema
 */
export interface TranslationParams {
  expression: string;
  callbackId?: string | number;
}

export const validateTranslationParams: ValidatorFn<TranslationParams> = createObjectValidator({
  expression: isNonEmptyString,
  callbackId: isOptional(isCallbackId)
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
  callbackId?: string | number;
}

export const validateLoadScriptParams: ValidatorFn<LoadScriptParams> = createObjectValidator({
  name: isScriptUrl,
  callbackId: isOptional(isCallbackId)
}, { allowExtra: false });

/**
 * Find term params schema
 */
export interface FindTermParams {
  expression: string;
  callbackId?: string | number;
}

export const validateFindTermParams: ValidatorFn<FindTermParams> = createObjectValidator({
  expression: isNonEmptyString,
  callbackId: isOptional(isCallbackId)
}, { allowExtra: false });

/**
 * Fetch params schema
 */
export interface FetchParams {
  url: string;
  callbackId?: string | number;
}

export const validateFetchParams: ValidatorFn<FetchParams> = createObjectValidator({
  url: isFetchUrl,
  callbackId: isOptional(isCallbackId)
}, { allowExtra: false });

/**
 * Deinflect params schema
 */
export interface DeinflectParams {
  word: string;
  callbackId?: string | number;
}

export const validateDeinflectParams: ValidatorFn<DeinflectParams> = createObjectValidator({
  word: isNonEmptyString,
  callbackId: isOptional(isCallbackId)
}, { allowExtra: false });
