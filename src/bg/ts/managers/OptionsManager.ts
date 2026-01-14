/**
 * Options Manager
 * Manages extension options/settings with storage persistence and change notifications
 * Implements IOptionsStore interface for SOLID compliance
 */

import {
  IOptionsStore,
  ExtensionOptions,
  PartialOptions,
  OptionsChangeEvent,
  OptionsChangeCallback,
  Unsubscribe,
  DEFAULT_OPTIONS
} from '../interfaces/IOptionsStore';

/**
 * Storage interface for abstraction (allows mocking in tests)
 */
export interface StorageAdapter {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Chrome storage adapter implementation
 */
export class ChromeStorageAdapter implements StorageAdapter {
  private readonly storage: chrome.storage.StorageArea;

  constructor(storageArea: 'local' | 'sync' = 'local') {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      this.storage = storageArea === 'local' ? chrome.storage.local : chrome.storage.sync;
    } else {
      // Fallback for testing - will be overridden by mock
      this.storage = {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        clear: () => Promise.resolve()
      } as unknown as chrome.storage.StorageArea;
    }
  }

  async get(keys: string | string[] | null): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      this.storage.get(keys, (result) => {
        resolve(result || {});
      });
    });
  }

  async set(items: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
      this.storage.set(items, () => {
        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      this.storage.clear(() => {
        resolve();
      });
    });
  }
}

/**
 * In-memory storage adapter for testing
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private data: Record<string, unknown> = {};

  async get(_keys: string | string[] | null): Promise<Record<string, unknown>> {
    return { ...this.data };
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.data = { ...this.data, ...items };
  }

  async clear(): Promise<void> {
    this.data = {};
  }

  // For testing: get raw data
  getData(): Record<string, unknown> {
    return { ...this.data };
  }

  // For testing: set raw data
  setData(data: Record<string, unknown>): void {
    this.data = { ...data };
  }
}

/**
 * Options Manager configuration
 */
export interface OptionsManagerConfig {
  /** Storage adapter to use */
  storage?: StorageAdapter;
  /** Default options (overrides DEFAULT_OPTIONS) */
  defaults?: Partial<ExtensionOptions>;
  /** Whether to auto-load on construction */
  autoLoad?: boolean;
}

/**
 * Options Manager
 * Manages extension options with persistence and change notifications
 */
export class OptionsManager implements IOptionsStore {
  private readonly storage: StorageAdapter;
  private readonly defaults: ExtensionOptions;
  private currentOptions: ExtensionOptions | null = null;
  private readonly subscribers = new Set<OptionsChangeCallback>();
  private loaded = false;

  constructor(config: OptionsManagerConfig = {}) {
    this.storage = config.storage ?? new ChromeStorageAdapter();
    this.defaults = { ...DEFAULT_OPTIONS, ...config.defaults };
  }

  /**
   * Load options from storage
   * @returns Promise resolving to the current options
   */
  async load(): Promise<ExtensionOptions> {
    const stored = await this.storage.get(null);
    const options = this.sanitizeOptions(stored as Partial<ExtensionOptions>);
    this.currentOptions = options;
    this.loaded = true;
    return options;
  }

  /**
   * Save options to storage
   * @param options - Complete options object to save
   * @returns Promise resolving when saved
   */
  async save(options: ExtensionOptions): Promise<void> {
    const sanitized = this.sanitizeOptions(options);
    const oldOptions = this.currentOptions;

    await this.storage.set(sanitized as unknown as Record<string, unknown>);
    this.currentOptions = sanitized;
    this.loaded = true;

    // Notify subscribers if options changed
    if (oldOptions) {
      this.notifyChange(oldOptions, sanitized);
    }
  }

  /**
   * Update specific options (partial update)
   * @param changes - Partial options to update
   * @returns Promise resolving to the updated options
   */
  async update(changes: PartialOptions): Promise<ExtensionOptions> {
    // Ensure we have current options loaded
    if (!this.currentOptions) {
      await this.load();
    }

    const oldOptions = { ...this.currentOptions! };
    const newOptions = this.sanitizeOptions({
      ...this.currentOptions!,
      ...changes
    });

    await this.storage.set(newOptions as unknown as Record<string, unknown>);
    this.currentOptions = newOptions;

    this.notifyChange(oldOptions, newOptions);

    return newOptions;
  }

  /**
   * Get the current options (from memory cache)
   * @returns Current options or null if not loaded
   */
  getCurrent(): ExtensionOptions | null {
    return this.currentOptions ? { ...this.currentOptions } : null;
  }

  /**
   * Check if options have been loaded
   * @returns true if loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Subscribe to options changes
   * @param callback - Function to call when options change
   * @returns Unsubscribe function
   */
  subscribe(callback: OptionsChangeCallback): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get number of subscribers
   * @returns Number of subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Reset options to defaults
   * @returns Promise resolving to the default options
   */
  async reset(): Promise<ExtensionOptions> {
    const oldOptions = this.currentOptions;

    await this.storage.clear();
    await this.storage.set(this.defaults as unknown as Record<string, unknown>);
    this.currentOptions = { ...this.defaults };

    if (oldOptions) {
      this.notifyChange(oldOptions, this.currentOptions);
    }

    return { ...this.defaults };
  }

  /**
   * Get the default options
   * @returns Copy of default options
   */
  getDefaults(): ExtensionOptions {
    return { ...this.defaults };
  }

  /**
   * Get a specific option value
   * @param key - Option key
   * @returns Option value or undefined
   */
  get<K extends keyof ExtensionOptions>(key: K): ExtensionOptions[K] | undefined {
    return this.currentOptions?.[key];
  }

  /**
   * Set a specific option value
   * @param key - Option key
   * @param value - Option value
   * @returns Promise resolving to updated options
   */
  async set<K extends keyof ExtensionOptions>(
    key: K,
    value: ExtensionOptions[K]
  ): Promise<ExtensionOptions> {
    return this.update({ [key]: value } as PartialOptions);
  }

  /**
   * Sanitize options by filling in missing defaults
   * @param options - Partial options to sanitize
   * @returns Complete options with defaults applied
   */
  private sanitizeOptions(options: Partial<ExtensionOptions>): ExtensionOptions {
    const sanitized: ExtensionOptions = { ...this.defaults };

    for (const key of Object.keys(this.defaults) as (keyof ExtensionOptions)[]) {
      if (options[key] !== undefined) {
        // Type assertion needed due to generic nature of the loop
        (sanitized as unknown as Record<string, unknown>)[key] = options[key];
      }
    }

    return sanitized;
  }

  /**
   * Notify subscribers of option changes
   * @param oldOptions - Previous options
   * @param newOptions - New options
   */
  private notifyChange(
    oldOptions: ExtensionOptions,
    newOptions: ExtensionOptions
  ): void {
    const changedKeys = this.findChangedKeys(oldOptions, newOptions);

    if (changedKeys.length === 0) {
      return; // No actual changes
    }

    const event: OptionsChangeEvent = {
      oldOptions,
      newOptions,
      changedKeys
    };

    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in options change callback:', error);
      }
    }
  }

  /**
   * Find which keys changed between two options objects
   * @param oldOptions - Previous options
   * @param newOptions - New options
   * @returns Array of changed keys
   */
  private findChangedKeys(
    oldOptions: ExtensionOptions,
    newOptions: ExtensionOptions
  ): (keyof ExtensionOptions)[] {
    const changedKeys: (keyof ExtensionOptions)[] = [];

    for (const key of Object.keys(this.defaults) as (keyof ExtensionOptions)[]) {
      const oldValue = oldOptions[key];
      const newValue = newOptions[key];

      // Special handling for arrays (dictNamelist)
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changedKeys.push(key);
        }
      } else if (oldValue !== newValue) {
        changedKeys.push(key);
      }
    }

    return changedKeys;
  }
}

/**
 * Create a new OptionsManager instance
 * @param config - Configuration options
 * @returns New OptionsManager instance
 */
export function createOptionsManager(config?: OptionsManagerConfig): OptionsManager {
  return new OptionsManager(config);
}

/**
 * Global options manager instance (optional - for convenience)
 */
let globalOptionsManager: OptionsManager | null = null;

/**
 * Get or create the global options manager instance
 * @returns Global options manager
 */
export function getGlobalOptionsManager(): OptionsManager {
  if (!globalOptionsManager) {
    globalOptionsManager = new OptionsManager();
  }
  return globalOptionsManager;
}

/**
 * Set the global options manager instance
 * @param manager - Options manager to set as global
 */
export function setGlobalOptionsManager(manager: OptionsManager): void {
  globalOptionsManager = manager;
}

/**
 * Reset the global options manager
 */
export function resetGlobalOptionsManager(): void {
  globalOptionsManager = null;
}
