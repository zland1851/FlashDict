/**
 * Backend Service
 * Main orchestration service for the extension background script
 *
 * Architecture:
 * - Single Responsibility: Only orchestrates other services
 * - Open/Closed: Extensible via hooks and events
 * - Dependency Inversion: Depends on abstractions (interfaces)
 */

import type { IAnkiService, AddNoteResult } from '../interfaces/IAnkiService';
import type { ExtensionOptions } from '../interfaces/IOptionsStore';
import { TabManager, createTabManager } from './TabManager';
import { SandboxBridge, createSandboxBridge, DictionaryLookupResult } from './SandboxBridge';
import { ChromeEventHandler, createChromeEventHandler } from './ChromeEventHandler';
import { NoteFormatterService, NoteDefinition } from './NoteFormatterService';

/**
 * Backend Service configuration
 */
export interface BackendServiceConfig {
  debug?: boolean;
  /** URL to open on install */
  installUrl?: string;
  /** URL to open on update */
  updateUrl?: string;
  /** Timeout for sandbox ready (ms) */
  sandboxReadyTimeout?: number;
}

/**
 * Dependencies injected into BackendService
 * Follows Dependency Inversion Principle
 */
export interface BackendServiceDependencies {
  ankiConnectService: IAnkiService;
  ankiWebService: IAnkiService;
  noteFormatterService: NoteFormatterService;
}

/**
 * Backend Service state
 */
export interface BackendServiceState {
  options: ExtensionOptions | null;
  initialized: boolean;
  dictionariesLoaded: boolean;
}

/**
 * Backend Service lifecycle hooks
 */
export interface BackendServiceHooks {
  onInitialized?: (state: BackendServiceState) => void | Promise<void>;
  onOptionsChanged?: (options: ExtensionOptions) => void | Promise<void>;
  onDictionariesLoaded?: () => void | Promise<void>;
  onError?: (error: Error, context: string) => void | Promise<void>;
}

/**
 * Backend Service
 * Main orchestration service for the extension background script
 */
export class BackendService {
  private readonly debug: boolean;
  private readonly tabManager: TabManager;
  private readonly sandboxBridge: SandboxBridge;
  private readonly chromeEventHandler: ChromeEventHandler;
  private readonly noteFormatter: NoteFormatterService;
  private readonly ankiConnect: IAnkiService;
  private readonly ankiWeb: IAnkiService;
  private readonly hooks: BackendServiceHooks;

  private state: BackendServiceState = {
    options: null,
    initialized: false,
    dictionariesLoaded: false
  };

  constructor(
    dependencies: BackendServiceDependencies,
    config: BackendServiceConfig = {},
    hooks: BackendServiceHooks = {}
  ) {
    this.debug = config.debug ?? false;
    this.hooks = hooks;

    // Inject dependencies (DIP)
    this.ankiConnect = dependencies.ankiConnectService;
    this.ankiWeb = dependencies.ankiWebService;
    this.noteFormatter = dependencies.noteFormatterService;

    // Create component services
    this.tabManager = createTabManager({ debug: this.debug });
    this.sandboxBridge = createSandboxBridge({
      debug: this.debug,
      readyTimeout: config.sandboxReadyTimeout
    });
    this.chromeEventHandler = createChromeEventHandler({
      debug: this.debug,
      installUrl: config.installUrl,
      updateUrl: config.updateUrl
    });
  }

  /**
   * Initialize the backend service
   * Registers all Chrome event listeners
   */
  async initialize(options: ExtensionOptions): Promise<void> {
    this.log('Initializing BackendService...');

    try {
      // Store options
      this.state.options = options;

      // Register Chrome event listeners
      this.chromeEventHandler.registerAll();

      // Set up tab ready handler
      this.chromeEventHandler.onTabReady(async (tabId) => {
        await this.handleTabReady(tabId);
      });

      // Update badge state
      await this.tabManager.updateBadge(options.enabled);

      // Mark as initialized
      this.state.initialized = true;

      // Call hook
      await this.hooks.onInitialized?.(this.state);

      this.log('BackendService initialized');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.hooks.onError?.(err, 'initialize');
      throw err;
    }
  }

  /**
   * Initialize dictionaries from sandbox
   * Should be called after sandbox is ready
   */
  async initializeDictionaries(): Promise<void> {
    if (!this.state.options) {
      throw new Error('Cannot initialize dictionaries: options not loaded');
    }

    this.log('Initializing dictionaries...');

    try {
      // Wait for sandbox to be ready
      const ready = await this.sandboxBridge.waitForReady();
      if (!ready) {
        throw new Error('Sandbox not ready within timeout');
      }

      // Initialize dictionaries
      const result = await this.sandboxBridge.initializeDictionaries(this.state.options);

      // Update options with dictionary info
      this.state.options = {
        ...this.state.options,
        dictSelected: result.dictSelected,
        dictNamelist: result.dictNamelist
      };

      this.state.dictionariesLoaded = true;

      // Call hook
      await this.hooks.onDictionariesLoaded?.();

      this.log(`Dictionaries initialized: ${result.dictNamelist.length} loaded`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.hooks.onError?.(err, 'initializeDictionaries');
      throw err;
    }
  }

  /**
   * Handle options changed
   * Updates state and notifies all tabs
   */
  async handleOptionsChanged(options: ExtensionOptions): Promise<void> {
    this.log('Handling options change...');

    try {
      this.state.options = options;

      // Notify all tabs
      await this.tabManager.notifyOptionsChanged(options);

      // Update sandbox scripts options
      if (this.state.dictionariesLoaded) {
        await this.sandboxBridge.setScriptsOptions(options);
      }

      // Call hook
      await this.hooks.onOptionsChanged?.(options);

      this.log('Options change handled');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.hooks.onError?.(err, 'handleOptionsChanged');
      throw err;
    }
  }

  /**
   * Handle tab ready event
   * Sends options to the content script in the tab
   */
  private async handleTabReady(tabId: number): Promise<void> {
    if (!this.state.options) {
      return;
    }

    await this.tabManager.setFrontendOptionsOnTab(tabId, this.state.options);
  }

  /**
   * Find term using the dictionary sandbox
   */
  async findTerm(expression: string): Promise<DictionaryLookupResult | null> {
    if (!this.state.dictionariesLoaded) {
      this.log('Dictionaries not loaded, cannot find term');
      return null;
    }

    return this.sandboxBridge.findTerm(expression);
  }

  /**
   * Get the currently selected Anki service
   * Returns null if no service is selected
   */
  getAnkiService(): IAnkiService | null {
    if (!this.state.options) {
      return null;
    }

    switch (this.state.options.services) {
      case 'ankiconnect':
        return this.ankiConnect;
      case 'ankiweb':
        return this.ankiWeb;
      case 'none':
      default:
        return null;
    }
  }

  /**
   * Add a note to Anki
   * Automatically selects the correct Anki service based on options
   */
  async addNote(notedef: NoteDefinition): Promise<AddNoteResult> {
    if (!this.state.options) {
      return {
        success: false,
        error: 'Options not loaded'
      };
    }

    const ankiService = this.getAnkiService();
    if (!ankiService) {
      return {
        success: false,
        error: 'No Anki service configured'
      };
    }

    // Format the note
    const note = this.noteFormatter.format(notedef, {
      deckname: this.state.options.deckname,
      typename: this.state.options.typename,
      duplicate: this.state.options.duplicate,
      tags: this.state.options.tags,
      dictSelected: this.state.options.dictSelected,
      preferredaudio: this.state.options.preferredaudio,
      expression: this.state.options.expression,
      reading: this.state.options.reading,
      extrainfo: this.state.options.extrainfo,
      definition: this.state.options.definition,
      definitions: this.state.options.definitions,
      sentence: this.state.options.sentence,
      url: this.state.options.url,
      audio: this.state.options.audio
    });

    if (!note) {
      return {
        success: false,
        error: 'Failed to format note - check deck, type, and field configuration'
      };
    }

    // Add the note
    return ankiService.addNote(note);
  }

  /**
   * Get Anki decks from the selected service
   */
  async getDeckNames(): Promise<string[]> {
    const ankiService = this.getAnkiService();
    if (!ankiService) {
      return [];
    }

    return ankiService.getDeckNames();
  }

  /**
   * Get Anki models from the selected service
   */
  async getModelNames(): Promise<string[]> {
    const ankiService = this.getAnkiService();
    if (!ankiService) {
      return [];
    }

    return ankiService.getModelNames();
  }

  /**
   * Get field names for a model from the selected service
   */
  async getModelFieldNames(modelName: string): Promise<string[]> {
    const ankiService = this.getAnkiService();
    if (!ankiService) {
      return [];
    }

    return ankiService.getModelFieldNames(modelName);
  }

  /**
   * Get the Anki version from the selected service
   */
  async getAnkiVersion(): Promise<string | null> {
    const ankiService = this.getAnkiService();
    if (!ankiService) {
      return null;
    }

    return ankiService.getVersion();
  }

  /**
   * Mark sandbox as ready
   * Called when receiving sandboxReady message
   */
  markSandboxReady(): void {
    this.sandboxBridge.markReady();
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<BackendServiceState> {
    return { ...this.state };
  }

  /**
   * Get current options (readonly)
   */
  getOptions(): ExtensionOptions | null {
    return this.state.options;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.state.initialized;
  }

  /**
   * Check if dictionaries are loaded
   */
  areDictionariesLoaded(): boolean {
    return this.state.dictionariesLoaded;
  }

  /**
   * Get the TabManager for direct access
   */
  getTabManager(): TabManager {
    return this.tabManager;
  }

  /**
   * Get the SandboxBridge for direct access
   */
  getSandboxBridge(): SandboxBridge {
    return this.sandboxBridge;
  }

  /**
   * Get the ChromeEventHandler for direct access
   */
  getChromeEventHandler(): ChromeEventHandler {
    return this.chromeEventHandler;
  }

  /**
   * Register a command handler
   */
  onCommand(command: string, handler: (command: string) => void | Promise<void>): void {
    this.chromeEventHandler.onCommand(command, handler);
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[BackendService] ${message}`);
    }
  }
}

/**
 * Create BackendService instance
 */
export function createBackendService(
  dependencies: BackendServiceDependencies,
  config?: BackendServiceConfig,
  hooks?: BackendServiceHooks
): BackendService {
  return new BackendService(dependencies, config, hooks);
}
