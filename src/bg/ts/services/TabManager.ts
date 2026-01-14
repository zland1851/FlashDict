/**
 * Tab Manager Service
 * Handles communication with content scripts in browser tabs
 *
 * Single Responsibility: Only manages tab communication
 */

import type { ExtensionOptions } from '../interfaces/IOptionsStore';

/**
 * Message to send to content script
 */
export interface TabMessage {
  action: string;
  params?: Record<string, unknown>;
}

/**
 * Tab Manager configuration
 */
export interface TabManagerConfig {
  debug?: boolean;
}

/**
 * Tab Manager
 * Manages communication with content scripts in tabs
 */
export class TabManager {
  private readonly debug: boolean;

  constructor(config: TabManagerConfig = {}) {
    this.debug = config.debug ?? false;
  }

  /**
   * Send message to a specific tab
   */
  async sendToTab(tabId: number, message: TabMessage): Promise<unknown> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          this.log(`Error sending to tab ${tabId}: ${chrome.runtime.lastError.message}`);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send message to all tabs
   */
  async sendToAllTabs(message: TabMessage): Promise<Map<number, unknown>> {
    const results = new Map<number, unknown>();

    return new Promise((resolve) => {
      chrome.tabs.query({}, async (tabs) => {
        const promises = tabs.map(async (tab) => {
          if (tab.id !== undefined) {
            const response = await this.sendToTab(tab.id, message);
            results.set(tab.id, response);
          }
        });

        await Promise.all(promises);
        resolve(results);
      });
    });
  }

  /**
   * Invoke action on specific tab
   */
  async invokeOnTab(tabId: number, action: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.sendToTab(tabId, { action, params });
  }

  /**
   * Invoke action on all tabs
   */
  async invokeOnAllTabs(action: string, params?: Record<string, unknown>): Promise<void> {
    await this.sendToAllTabs({ action, params });
  }

  /**
   * Set frontend options on specific tab
   */
  async setFrontendOptionsOnTab(tabId: number, options: ExtensionOptions): Promise<void> {
    await this.invokeOnTab(tabId, 'setFrontendOptions', { options });
  }

  /**
   * Set frontend options on all tabs
   */
  async setFrontendOptionsOnAllTabs(options: ExtensionOptions): Promise<void> {
    await this.invokeOnAllTabs('setFrontendOptions', { options });
  }

  /**
   * Update browser action badge based on enabled state
   */
  async updateBadge(enabled: boolean): Promise<void> {
    try {
      await chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
      this.log(`Badge updated: ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.log(`Error updating badge: ${error}`);
    }
  }

  /**
   * Notify all tabs of options change and update badge
   */
  async notifyOptionsChanged(options: ExtensionOptions): Promise<void> {
    await this.updateBadge(options.enabled);
    await this.setFrontendOptionsOnAllTabs(options);
  }

  /**
   * Get all active tabs
   */
  async getAllTabs(): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        resolve(tabs);
      });
    });
  }

  /**
   * Get current active tab
   */
  async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0] ?? null);
      });
    });
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[TabManager] ${message}`);
    }
  }
}

/**
 * Create TabManager instance
 */
export function createTabManager(config?: TabManagerConfig): TabManager {
  return new TabManager(config);
}
