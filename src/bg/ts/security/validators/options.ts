/**
 * Options Validation
 * Extension options schema validation
 */

import { isString, isBoolean, isEnum, isArray, withDefault } from './primitives.js';
import { createObjectValidator } from './object.js';

const SERVICES_VALUES = ['none', 'ankiconnect', 'ankiweb'] as const;
const HOTKEY_VALUES = ['0', '16', '17', '18'] as const;
const TOGGLE_VALUES = ['0', '1'] as const;

/**
 * Validate extension options
 */
export const validateExtensionOptions = createObjectValidator(
  {
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
    dictNamelist: withDefault(
      isArray(
        createObjectValidator(
          {
            objectname: isString,
            displayname: isString,
          },
          { allowExtra: true }
        )
      ),
      []
    ),
  },
  { allowExtra: true }
);
