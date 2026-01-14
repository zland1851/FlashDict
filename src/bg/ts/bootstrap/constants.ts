/**
 * Bootstrap Constants
 * Service names and event types for the application
 *
 * Single Responsibility: Only defines constants
 */

/**
 * Service names for DI container registration
 * Use these constants when registering/resolving services
 */
export const SERVICE_NAMES = {
  // Core infrastructure
  CONTAINER: 'container',
  EVENT_BUS: 'eventBus',
  MESSAGE_ROUTER: 'messageRouter',

  // Managers
  OPTIONS_MANAGER: 'optionsManager',
  CREDENTIAL_MANAGER: 'credentialManager',

  // Anki services
  ANKI_CONNECT: 'ankiConnectService',
  ANKI_WEB: 'ankiWebService',
  NOTE_FORMATTER: 'noteFormatterService',

  // Message handlers
  OPTIONS_HANDLER: 'optionsHandler',
  DICTIONARY_HANDLER: 'dictionaryHandler',
  AUDIO_HANDLER: 'audioHandler',
  TRANSLATION_HANDLER: 'translationHandler',
  NOTE_HANDLER: 'noteHandler'
} as const;

/**
 * Service name type
 */
export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

/**
 * Event names for EventBus
 * Use these constants when emitting/subscribing to events
 */
export const EVENTS = {
  // Options events
  OPTIONS_LOADED: 'options:loaded',
  OPTIONS_CHANGED: 'options:changed',
  OPTIONS_SAVED: 'options:saved',

  // Translation events
  TRANSLATION_REQUESTED: 'translation:requested',
  TRANSLATION_COMPLETED: 'translation:completed',
  TRANSLATION_FAILED: 'translation:failed',

  // Dictionary events
  DICTIONARY_LOADED: 'dictionary:loaded',
  DICTIONARY_SELECTED: 'dictionary:selected',
  DICTIONARY_ERROR: 'dictionary:error',

  // Note events
  NOTE_ADDING: 'note:adding',
  NOTE_ADDED: 'note:added',
  NOTE_FAILED: 'note:failed',

  // Anki connection events
  ANKI_CONNECTING: 'anki:connecting',
  ANKI_CONNECTED: 'anki:connected',
  ANKI_DISCONNECTED: 'anki:disconnected',
  ANKI_ERROR: 'anki:error',

  // Audio events
  AUDIO_PLAYING: 'audio:playing',
  AUDIO_PLAYED: 'audio:played',
  AUDIO_ERROR: 'audio:error',

  // Bootstrap events
  BOOTSTRAP_STARTED: 'bootstrap:started',
  BOOTSTRAP_COMPLETE: 'bootstrap:complete',
  BOOTSTRAP_ERROR: 'bootstrap:error'
} as const;

/**
 * Event name type
 */
export type EventName = typeof EVENTS[keyof typeof EVENTS];

/**
 * Message actions handled by the router
 */
export const MESSAGE_ACTIONS = {
  // Options actions
  OPTIONS_CHANGED: 'opt_optionsChanged',
  GET_OPTIONS: 'opt_getOptions',

  // Anki actions
  GET_DECK_NAMES: 'opt_getDeckNames',
  GET_MODEL_NAMES: 'opt_getModelNames',
  GET_MODEL_FIELD_NAMES: 'opt_getModelFieldNames',
  GET_VERSION: 'opt_getVersion',
  ADD_NOTE: 'addNote',

  // Translation actions
  GET_TRANSLATION: 'getTranslation',
  FIND_TERM: 'findTerm',

  // Audio actions
  PLAY_AUDIO: 'playAudio',

  // Dictionary actions
  LOAD_SCRIPT: 'loadScript',
  SET_SCRIPTS_OPTIONS: 'setScriptsOptions',

  // Utility actions
  FETCH: 'Fetch',
  DEINFLECT: 'Deinflect',
  GET_BUILTIN: 'getBuiltin',
  GET_LOCALE: 'getLocale',
  IS_CONNECTED: 'isConnected'
} as const;

/**
 * Message action type
 */
export type MessageAction = typeof MESSAGE_ACTIONS[keyof typeof MESSAGE_ACTIONS];
