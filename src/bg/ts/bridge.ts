/**
 * Bridge Module - Exposes TypeScript services to legacy JavaScript code
 *
 * This module creates a global interface that allows legacy JavaScript code
 * to access TypeScript services without needing ES6 module imports.
 *
 * Usage in legacy code:
 *   const services = await self.ODH_TS.initialize();
 *   await services.optionsManager.load();
 */

import { bootstrap } from './bootstrap';
import type { BootstrapContext } from './bootstrap';

/**
 * Global TypeScript services interface
 */
interface ODH_TypeScriptBridge {
  /**
   * Initialize TypeScript services
   * @param config - Optional configuration
   * @returns Bootstrap context with all services
   */
  initialize(config?: { debug?: boolean }): Promise<BootstrapContext>;

  /**
   * Get initialized context (must call initialize first)
   */
  getContext(): BootstrapContext | null;

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean;
}

/**
 * Bridge implementation
 */
class TypeScriptBridge implements ODH_TypeScriptBridge {
  private context: BootstrapContext | null = null;
  private initialized = false;

  async initialize(config?: { debug?: boolean }): Promise<BootstrapContext> {
    if (this.initialized && this.context) {
      return this.context;
    }

    try {
      this.context = bootstrap(config);
      this.initialized = true;

      // Load initial options
      await this.context.optionsManager.load();

      if (config?.debug) {
        console.log('[ODH TS Bridge] TypeScript services initialized', this.context);
      }

      return this.context;
    } catch (error) {
      console.error('[ODH TS Bridge] Failed to initialize TypeScript services:', error);
      throw error;
    }
  }

  getContext(): BootstrapContext | null {
    return this.context;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create and expose global bridge
const bridge = new TypeScriptBridge();

// Make available on self (Service Worker global)
if (typeof self !== 'undefined') {
  (self as any).ODH_TS = bridge;
}

// Also export for potential module usage
export { bridge as ODH_TS_Bridge };
export type { ODH_TypeScriptBridge };
