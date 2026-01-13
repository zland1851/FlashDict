/**
 * Deinflector
 * Handles word form lookup to find base forms of inflected words
 * Used for languages like English where words can have multiple forms
 */

/**
 * Word forms dictionary type
 * Maps inflected forms to their base forms
 */
export type WordForms = Record<string, string>;

/**
 * Options for data loading
 */
export interface DeinflectorOptions {
  /** Path to the wordforms data file */
  dataPath?: string;
  /** Custom fetch function for testing */
  fetchFn?: (url: string) => Promise<Response>;
  /** Function to get extension URL */
  getURL?: (path: string) => string;
}

/**
 * Deinflector class
 * Handles loading and lookup of word forms
 */
export class Deinflector {
  private readonly path: string;
  private wordforms: WordForms | null = null;
  private readonly fetchFn: (url: string) => Promise<Response>;
  private readonly getURL: (path: string) => string;
  private loaded = false;
  private loadError: Error | null = null;

  constructor(options: DeinflectorOptions = {}) {
    this.path = options.dataPath ?? 'bg/data/wordforms.json';
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.getURL = options.getURL ?? ((path: string) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        return chrome.runtime.getURL(path);
      }
      return path;
    });
  }

  /**
   * Load the word forms data from file
   * @returns Promise that resolves when data is loaded
   */
  async loadData(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const data = await this.loadDataFromPath(this.path);
      this.wordforms = data;
      this.loaded = true;
      this.loadError = null;
    } catch (error) {
      // Data file not found - this is expected if not installed from Chrome Web Store
      // Use empty object to allow extension to continue working
      console.warn(
        'Deinflector data file not found. Word inflection feature will be disabled. ' +
        'To enable it, extract wordforms.json from Chrome Web Store version.'
      );
      this.wordforms = {};
      this.loaded = true;
      this.loadError = error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Look up the base form of an inflected word
   * @param term - The inflected word to look up
   * @returns The base form if found, null otherwise
   */
  deinflect(term: string): string | null {
    if (!this.wordforms) {
      return null;
    }
    return this.wordforms[term] ?? null;
  }

  /**
   * Check if the deinflector has loaded data
   * @returns true if data is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Check if there was an error loading data
   * @returns The error if one occurred, null otherwise
   */
  getLoadError(): Error | null {
    return this.loadError;
  }

  /**
   * Check if a term has a known base form
   * @param term - The term to check
   * @returns true if the term has a known base form
   */
  hasBaseForm(term: string): boolean {
    return this.wordforms !== null && term in this.wordforms;
  }

  /**
   * Get all known inflected forms
   * @returns Array of all known inflected forms
   */
  getKnownForms(): string[] {
    if (!this.wordforms) {
      return [];
    }
    return Object.keys(this.wordforms);
  }

  /**
   * Get the number of known word forms
   * @returns Number of known forms
   */
  getFormCount(): number {
    if (!this.wordforms) {
      return 0;
    }
    return Object.keys(this.wordforms).length;
  }

  /**
   * Load data from a path
   * @param path - Path to the data file
   * @returns Promise resolving to the word forms data
   */
  private async loadDataFromPath(path: string): Promise<WordForms> {
    const url = this.getURL(path);
    const response = await this.fetchFn(url);

    if (!response.ok) {
      throw new DeinflectorLoadError(
        `Failed to load ${path}: ${response.statusText}`,
        path,
        response.status
      );
    }

    const data = await response.json();

    if (!isDictionaryObject(data)) {
      throw new DeinflectorLoadError(
        'Invalid word forms data: expected object',
        path
      );
    }

    return data as WordForms;
  }

  /**
   * Reset the deinflector (mainly for testing)
   */
  reset(): void {
    this.wordforms = null;
    this.loaded = false;
    this.loadError = null;
  }
}

/**
 * Error thrown when loading deinflector data fails
 */
export class DeinflectorLoadError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'DeinflectorLoadError';
  }
}

/**
 * Type guard to check if a value is a dictionary-like object
 */
function isDictionaryObject(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check a sample of entries to verify they're string -> string
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return true; // Empty object is valid
  }

  // Sample check (first 10 entries)
  return entries.slice(0, 10).every(
    ([key, val]) => typeof key === 'string' && typeof val === 'string'
  );
}

/**
 * Create a new Deinflector instance
 * @param options - Configuration options
 * @returns New Deinflector instance
 */
export function createDeinflector(options?: DeinflectorOptions): Deinflector {
  return new Deinflector(options);
}

/**
 * Global deinflector instance (optional - for convenience)
 */
let globalDeinflector: Deinflector | null = null;

/**
 * Get or create the global deinflector instance
 * @returns Global deinflector
 */
export function getGlobalDeinflector(): Deinflector {
  if (!globalDeinflector) {
    globalDeinflector = new Deinflector();
  }
  return globalDeinflector;
}

/**
 * Set the global deinflector instance
 * @param deinflector - Deinflector to set as global
 */
export function setGlobalDeinflector(deinflector: Deinflector): void {
  globalDeinflector = deinflector;
}

/**
 * Reset the global deinflector
 */
export function resetGlobalDeinflector(): void {
  globalDeinflector?.reset();
  globalDeinflector = null;
}
