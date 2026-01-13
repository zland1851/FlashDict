/**
 * Builtin Dictionary
 * Provides access to built-in dictionary data (e.g., Collins)
 * Used for offline dictionary lookups
 */

/**
 * Dictionary entry type
 * The actual structure depends on the dictionary
 */
export type DictionaryEntry = Record<string, unknown>;

/**
 * Dictionary data type
 * Maps terms to their dictionary entries
 */
export type DictionaryData = Record<string, DictionaryEntry>;

/**
 * Collection of loaded dictionaries
 */
export type DictionaryCollection = Record<string, DictionaryData>;

/**
 * Options for builtin dictionary
 */
export interface BuiltinOptions {
  /** Custom dictionary data paths */
  dataPaths?: Record<string, string>;
  /** Custom fetch function for testing */
  fetchFn?: (url: string) => Promise<Response>;
  /** Function to get extension URL */
  getURL?: (path: string) => string;
}

/**
 * Default dictionary paths
 */
const DEFAULT_PATHS: Record<string, string> = {
  collins: 'bg/data/collins.json'
};

/**
 * Builtin class
 * Manages built-in dictionaries for offline lookup
 */
export class Builtin {
  private readonly dicts: DictionaryCollection = {};
  private readonly dataPaths: Record<string, string>;
  private readonly fetchFn: (url: string) => Promise<Response>;
  private readonly getURL: (path: string) => string;
  private readonly loadedDicts = new Set<string>();
  private readonly loadErrors = new Map<string, Error>();

  constructor(options: BuiltinOptions = {}) {
    this.dataPaths = { ...DEFAULT_PATHS, ...options.dataPaths };
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.getURL = options.getURL ?? ((path: string) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(path);
      }
      return path;
    });
  }

  /**
   * Load all dictionary data
   * @returns Promise that resolves when all dictionaries are loaded
   */
  async loadData(): Promise<void> {
    const loadPromises = Object.keys(this.dataPaths).map(name =>
      this.loadDictionary(name)
    );
    await Promise.all(loadPromises);
  }

  /**
   * Load a specific dictionary
   * @param dictName - Name of the dictionary to load
   */
  async loadDictionary(dictName: string): Promise<void> {
    if (this.loadedDicts.has(dictName)) {
      return;
    }

    const path = this.dataPaths[dictName];
    if (!path) {
      const error = new BuiltinLoadError(
        `Unknown dictionary: ${dictName}`,
        dictName
      );
      this.loadErrors.set(dictName, error);
      return;
    }

    try {
      const data = await this.loadDataFromPath(path);
      this.dicts[dictName] = data;
      this.loadedDicts.add(dictName);
      this.loadErrors.delete(dictName);
    } catch (error) {
      console.warn(
        `Builtin dictionary data file not found: ${dictName}. ` +
        `Builtin ${dictName} dictionary will be disabled. ` +
        'To enable it, extract the data file from Chrome Web Store version.'
      );
      this.dicts[dictName] = {};
      this.loadedDicts.add(dictName);
      this.loadErrors.set(
        dictName,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Find a term in a dictionary
   * @param dictName - Name of the dictionary
   * @param term - Term to look up
   * @returns JSON string of the entry if found, null otherwise
   */
  findTerm(dictName: string, term: string): string | null {
    const dict = this.dicts[dictName];
    if (!dict) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(dict, term)) {
      return JSON.stringify(dict[term]);
    }

    return null;
  }

  /**
   * Find a term and return the raw object (not stringified)
   * @param dictName - Name of the dictionary
   * @param term - Term to look up
   * @returns The entry object if found, null otherwise
   */
  findTermRaw(dictName: string, term: string): DictionaryEntry | null {
    const dict = this.dicts[dictName];
    if (!dict) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(dict, term)) {
      return dict[term] ?? null;
    }

    return null;
  }

  /**
   * Check if a dictionary is loaded
   * @param dictName - Name of the dictionary
   * @returns true if loaded
   */
  isDictionaryLoaded(dictName: string): boolean {
    return this.loadedDicts.has(dictName);
  }

  /**
   * Get load error for a dictionary
   * @param dictName - Name of the dictionary
   * @returns The error if one occurred, null otherwise
   */
  getLoadError(dictName: string): Error | null {
    return this.loadErrors.get(dictName) ?? null;
  }

  /**
   * Get all loaded dictionary names
   * @returns Array of loaded dictionary names
   */
  getLoadedDictionaries(): string[] {
    return Array.from(this.loadedDicts);
  }

  /**
   * Get all available dictionary names
   * @returns Array of available dictionary names
   */
  getAvailableDictionaries(): string[] {
    return Object.keys(this.dataPaths);
  }

  /**
   * Check if a term exists in a dictionary
   * @param dictName - Name of the dictionary
   * @param term - Term to check
   * @returns true if the term exists
   */
  hasTerm(dictName: string, term: string): boolean {
    const dict = this.dicts[dictName];
    if (!dict) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(dict, term);
  }

  /**
   * Get the number of terms in a dictionary
   * @param dictName - Name of the dictionary
   * @returns Number of terms
   */
  getTermCount(dictName: string): number {
    const dict = this.dicts[dictName];
    if (!dict) {
      return 0;
    }
    return Object.keys(dict).length;
  }

  /**
   * Load data from a path
   * @param path - Path to the data file
   * @returns Promise resolving to the dictionary data
   */
  private async loadDataFromPath(path: string): Promise<DictionaryData> {
    const url = this.getURL(path);
    const response = await this.fetchFn(url);

    if (!response.ok) {
      throw new BuiltinLoadError(
        `Failed to load ${path}: ${response.statusText}`,
        path,
        response.status
      );
    }

    const data = await response.json();

    if (!isDictionaryData(data)) {
      throw new BuiltinLoadError(
        'Invalid dictionary data: expected object',
        path
      );
    }

    return data;
  }

  /**
   * Reset the builtin (mainly for testing)
   */
  reset(): void {
    for (const key of Object.keys(this.dicts)) {
      delete this.dicts[key];
    }
    this.loadedDicts.clear();
    this.loadErrors.clear();
  }
}

/**
 * Error thrown when loading builtin data fails
 */
export class BuiltinLoadError extends Error {
  constructor(
    message: string,
    public readonly dictName: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'BuiltinLoadError';
  }
}

/**
 * Type guard to check if a value is valid dictionary data
 */
function isDictionaryData(value: unknown): value is DictionaryData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return true;
}

/**
 * Create a new Builtin instance
 * @param options - Configuration options
 * @returns New Builtin instance
 */
export function createBuiltin(options?: BuiltinOptions): Builtin {
  return new Builtin(options);
}

/**
 * Global builtin instance (optional - for convenience)
 */
let globalBuiltin: Builtin | null = null;

/**
 * Get or create the global builtin instance
 * @returns Global builtin
 */
export function getGlobalBuiltin(): Builtin {
  if (!globalBuiltin) {
    globalBuiltin = new Builtin();
  }
  return globalBuiltin;
}

/**
 * Set the global builtin instance
 * @param builtin - Builtin to set as global
 */
export function setGlobalBuiltin(builtin: Builtin): void {
  globalBuiltin = builtin;
}

/**
 * Reset the global builtin
 */
export function resetGlobalBuiltin(): void {
  globalBuiltin?.reset();
  globalBuiltin = null;
}
