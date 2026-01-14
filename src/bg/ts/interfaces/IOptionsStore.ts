/**
 * Options Store Interface
 * Defines the contract for managing extension options/settings
 */

import { DictionaryMetadata } from './IDictionary';

/**
 * Extension options structure
 */
export interface ExtensionOptions {
  // Extension state
  enabled: boolean;
  mouseselection: boolean;

  // Hotkey configuration
  hotkey: string;

  // Dictionary options
  maxcontext: string;
  maxexample: string;
  monolingual: string;
  preferredaudio: string;

  // Anki service configuration
  services: 'none' | 'ankiconnect' | 'ankiweb';
  id: string;
  password: string;

  // Note formatting
  duplicate: string;
  tags: string;
  deckname: string;
  typename: string;
  expression: string;
  reading: string;
  extrainfo: string;
  definition: string;
  definitions: string;
  sentence: string;
  url: string;
  audio: string;

  // Script management
  sysscripts: string;
  udfscripts: string;

  // UI state
  dictSelected: string;
  dictNamelist: DictionaryMetadata[];
}

/**
 * Partial options for updates
 */
export type PartialOptions = Partial<ExtensionOptions>;

/**
 * Options change event
 */
export interface OptionsChangeEvent {
  /** Previous options state */
  oldOptions: ExtensionOptions;
  /** New options state */
  newOptions: ExtensionOptions;
  /** Keys that changed */
  changedKeys: (keyof ExtensionOptions)[];
}

/**
 * Options change callback
 */
export type OptionsChangeCallback = (event: OptionsChangeEvent) => void;

/**
 * Unsubscribe function returned by subscribe
 */
export type Unsubscribe = () => void;

/**
 * Options store interface
 * Provides CRUD operations for extension options
 */
export interface IOptionsStore {
  /**
   * Load options from storage
   * @returns Promise resolving to the current options
   */
  load(): Promise<ExtensionOptions>;

  /**
   * Save options to storage
   * @param options - Complete options object to save
   * @returns Promise resolving when saved
   */
  save(options: ExtensionOptions): Promise<void>;

  /**
   * Update specific options (partial update)
   * @param changes - Partial options to update
   * @returns Promise resolving to the updated options
   */
  update(changes: PartialOptions): Promise<ExtensionOptions>;

  /**
   * Get the current options (from memory cache)
   * @returns Current options or null if not loaded
   */
  getCurrent(): ExtensionOptions | null;

  /**
   * Subscribe to options changes
   * @param callback - Function to call when options change
   * @returns Unsubscribe function
   */
  subscribe(callback: OptionsChangeCallback): Unsubscribe;

  /**
   * Reset options to defaults
   * @returns Promise resolving to the default options
   */
  reset(): Promise<ExtensionOptions>;
}

/**
 * Default extension options
 */
export const DEFAULT_OPTIONS: ExtensionOptions = {
  enabled: true,
  mouseselection: true,
  hotkey: '16',
  maxcontext: '1',
  maxexample: '2',
  monolingual: '0',
  preferredaudio: '0',
  services: 'none',
  id: '',
  password: '',
  duplicate: '1',
  tags: 'ODH',
  deckname: 'Default',
  typename: 'Basic',
  expression: 'Front',
  reading: '',
  extrainfo: '',
  definition: 'Back',
  definitions: '',
  sentence: '',
  url: '',
  audio: '',
  sysscripts: 'encn_Cambridge,encn_Collins,encn_Longman,encn_Oxford,encn_Vocabulary',
  udfscripts: '',
  dictSelected: '',
  dictNamelist: []
};

/**
 * Type guard to check if an object implements IOptionsStore
 */
export function isOptionsStore(obj: unknown): obj is IOptionsStore {
  if (!obj || typeof obj !== 'object') return false;
  const store = obj as IOptionsStore;
  return (
    typeof store.load === 'function' &&
    typeof store.save === 'function' &&
    typeof store.update === 'function' &&
    typeof store.getCurrent === 'function' &&
    typeof store.subscribe === 'function' &&
    typeof store.reset === 'function'
  );
}

/**
 * Validate that an object has all required option keys
 */
export function validateOptions(obj: unknown): obj is ExtensionOptions {
  if (!obj || typeof obj !== 'object') return false;
  const opts = obj as Record<string, unknown>;

  const requiredKeys: (keyof ExtensionOptions)[] = [
    'enabled',
    'services',
    'deckname',
    'typename',
    'expression'
  ];

  return requiredKeys.every(key => key in opts);
}
