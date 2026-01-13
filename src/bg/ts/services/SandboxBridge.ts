/**
 * Sandbox Bridge Service
 * Handles communication with the dictionary sandbox via offscreen document
 *
 * Architecture:
 * Service Worker -> Offscreen Document -> Sandbox iframe -> Dictionary scripts
 *
 * Single Responsibility: Only manages sandbox communication
 */

import type { ExtensionOptions } from '../interfaces/IOptionsStore';

/**
 * Script load result
 */
export interface ScriptLoadResult {
  name: string;
  result: {
    objectname: string;
    displayname: string;
  } | null;
}

/**
 * Dictionary lookup result (from sandbox)
 */
export interface DictionaryLookupResult {
  expression: string;
  reading?: string;
  extrainfo?: string;
  definition?: string;
  definitions?: string;
  sentence?: string;
  url?: string;
  audios?: string[];
}

/**
 * Sandbox Bridge configuration
 */
export interface SandboxBridgeConfig {
  debug?: boolean;
  /** Maximum time to wait for sandbox ready (ms) */
  readyTimeout?: number;
}

/**
 * Sandbox Bridge
 * Bridges Service Worker communication with dictionary sandbox
 */
export class SandboxBridge {
  private readonly debug: boolean;
  private readonly readyTimeout: number;
  private sandboxReady = false;

  constructor(config: SandboxBridgeConfig = {}) {
    this.debug = config.debug ?? false;
    this.readyTimeout = config.readyTimeout ?? 10000;
  }

  /**
   * Send message to offscreen document (which forwards to sandbox)
   */
  private async sendToBackground<T>(
    action: string,
    params?: Record<string, unknown>
  ): Promise<T | null> {
    return new Promise((resolve) => {
      const request = {
        action,
        params,
        target: 'background'
      };

      chrome.runtime.sendMessage(request, (response) => {
        if (chrome.runtime.lastError) {
          this.log(`Error sending to background: ${chrome.runtime.lastError.message}`);
          resolve(null);
        } else {
          resolve(response as T);
        }
      });
    });
  }

  /**
   * Check if sandbox is ready
   */
  async isSandboxReady(): Promise<boolean> {
    if (this.sandboxReady) {
      return true;
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'sandboxPing' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        if (response && response.ready) {
          this.sandboxReady = true;
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Wait for sandbox to become ready
   */
  async waitForReady(): Promise<boolean> {
    if (this.sandboxReady) {
      return true;
    }

    const startTime = Date.now();

    while (Date.now() - startTime < this.readyTimeout) {
      const ready = await this.isSandboxReady();
      if (ready) {
        this.log('Sandbox is ready');
        return true;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    this.log(`Sandbox not ready after ${this.readyTimeout}ms`);
    return false;
  }

  /**
   * Load a single dictionary script
   */
  async loadScript(name: string): Promise<ScriptLoadResult> {
    this.log(`Loading script: ${name}`);

    const result = await this.sendToBackground<ScriptLoadResult>(
      'loadScript',
      { name }
    );

    if (!result || !result.result) {
      // Only warn for non-builtin scripts
      if (!name.startsWith('builtin_')) {
        this.log(`Failed to load script: ${name}`);
      }
      return { name, result: null };
    }

    this.log(`Loaded script: ${name} -> ${result.result.displayname}`);
    return result;
  }

  /**
   * Load multiple dictionary scripts
   */
  async loadScripts(names: string[]): Promise<ScriptLoadResult[]> {
    this.log(`Loading ${names.length} scripts...`);

    const promises = names.map((name) => this.loadScript(name));
    const results = await Promise.all(promises);

    const loaded = results.filter((r) => r.result !== null);
    this.log(`Loaded ${loaded.length}/${names.length} scripts`);

    return results;
  }

  /**
   * Set options for loaded dictionary scripts
   */
  async setScriptsOptions(options: ExtensionOptions): Promise<string | null> {
    this.log('Setting scripts options...');

    const result = await this.sendToBackground<string>(
      'setScriptsOptions',
      { options }
    );

    if (result) {
      this.log(`Scripts options set, selected: ${result}`);
    }

    return result;
  }

  /**
   * Find term using current dictionary
   */
  async findTerm(expression: string): Promise<DictionaryLookupResult | null> {
    this.log(`Finding term: ${expression}`);

    const result = await this.sendToBackground<DictionaryLookupResult>(
      'findTerm',
      { expression }
    );

    if (result) {
      this.log(`Found definition for: ${expression}`);
    } else {
      this.log(`No definition found for: ${expression}`);
    }

    return result;
  }

  /**
   * Build script list from options
   */
  buildScriptList(options: ExtensionOptions): string[] {
    const defaultScripts = ['builtin_encn_Collins'];
    const sysScripts = options.sysscripts?.split(',').filter((x) => x.trim()) ?? [];
    const udfScripts = options.udfscripts?.split(',').filter((x) => x.trim()) ?? [];

    // Combine and deduplicate
    const allScripts = [...defaultScripts, ...sysScripts, ...udfScripts];
    return [...new Set(allScripts.map((s) => s.trim()))];
  }

  /**
   * Initialize dictionaries from options
   */
  async initializeDictionaries(options: ExtensionOptions): Promise<{
    dictSelected: string;
    dictNamelist: Array<{ objectname: string; displayname: string }>;
  }> {
    const scripts = this.buildScriptList(options);
    const results = await this.loadScripts(scripts);

    // Filter successful loads
    const validResults = results.filter((r) => r.result !== null);

    if (validResults.length === 0) {
      this.log('No dictionary scripts loaded');
      return {
        dictSelected: '',
        dictNamelist: []
      };
    }

    // Build name list
    const dictNamelist = validResults.map((r) => r.result!);
    const objectNames = dictNamelist.map((d) => d.objectname);

    // Select dictionary
    const dictSelected = objectNames.includes(options.dictSelected)
      ? options.dictSelected
      : objectNames[0] ?? '';

    // Set options in sandbox
    await this.setScriptsOptions({
      ...options,
      dictSelected,
      dictNamelist
    });

    return { dictSelected, dictNamelist };
  }

  /**
   * Mark sandbox as ready (called when receiving sandboxReady message)
   */
  markReady(): void {
    this.sandboxReady = true;
    this.log('Sandbox marked as ready');
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[SandboxBridge] ${message}`);
    }
  }
}

/**
 * Create SandboxBridge instance
 */
export function createSandboxBridge(config?: SandboxBridgeConfig): SandboxBridge {
  return new SandboxBridge(config);
}
