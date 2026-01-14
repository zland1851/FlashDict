/**
 * Dictionary Interface
 * Defines the contract for dictionary lookup services
 */

/**
 * Audio information for a dictionary entry
 */
export interface DictionaryAudio {
  url: string;
  type?: string;
}

/**
 * Definition structure returned by dictionary lookups
 */
export interface DictionaryDefinition {
  /** The looked up word/expression */
  expression: string;
  /** Pronunciation/reading (e.g., IPA, pinyin) */
  reading?: string;
  /** The definition HTML content */
  definition: string;
  /** Multiple definitions if available */
  definitions?: string[];
  /** Extra information (part of speech, etc.) */
  extrainfo?: string;
  /** Example sentences */
  sentence?: string;
  /** Audio pronunciations */
  audios: DictionaryAudio[] | string[];
  /** CSS styles for the definition */
  css?: string;
}

/**
 * Metadata about a dictionary
 */
export interface DictionaryMetadata {
  /** Unique identifier for the dictionary */
  objectname: string;
  /** Display name of the dictionary */
  displayname: string;
  /** Source language code */
  sourceLanguage?: string;
  /** Target language code */
  targetLanguage?: string;
  /** Version of the dictionary script */
  version?: string;
  /** Author of the dictionary script */
  author?: string;
}

/**
 * Dictionary lookup result
 */
export interface DictionaryResult {
  /** The definition if found */
  definition: DictionaryDefinition | null;
  /** Whether the lookup was successful */
  success: boolean;
  /** Error message if lookup failed */
  error?: string;
}

/**
 * Dictionary service interface
 * All dictionary implementations must follow this contract
 */
export interface IDictionary {
  /**
   * Look up a term in the dictionary
   * @param word - The word/expression to look up
   * @returns Promise resolving to the definition or null if not found
   */
  findTerm(word: string): Promise<DictionaryDefinition | null>;

  /**
   * Get metadata about this dictionary
   * @returns Dictionary metadata
   */
  getMetadata(): DictionaryMetadata;
}

/**
 * Extended dictionary interface with additional capabilities
 */
export interface IExtendedDictionary extends IDictionary {
  /**
   * Check if the dictionary supports a specific language pair
   * @param source - Source language code
   * @param target - Target language code
   * @returns true if supported
   */
  supportsLanguagePair(source: string, target: string): boolean;

  /**
   * Get all supported language pairs
   * @returns Array of [source, target] tuples
   */
  getSupportedLanguagePairs(): [string, string][];
}

/**
 * Type guard to check if an object implements IDictionary
 */
export function isDictionary(obj: unknown): obj is IDictionary {
  if (!obj || typeof obj !== 'object') return false;
  const dict = obj as IDictionary;
  return (
    typeof dict.findTerm === 'function' &&
    typeof dict.getMetadata === 'function'
  );
}

/**
 * Type guard to check if a definition is valid
 */
export function isValidDefinition(def: unknown): def is DictionaryDefinition {
  if (!def || typeof def !== 'object') return false;
  const d = def as DictionaryDefinition;
  return (
    typeof d.expression === 'string' &&
    typeof d.definition === 'string' &&
    Array.isArray(d.audios)
  );
}
