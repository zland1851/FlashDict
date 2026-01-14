/**
 * Chrome Event Handler Service
 * Handles Chrome extension lifecycle events
 *
 * Single Responsibility: Only handles Chrome extension events
 */

/**
 * Install/Update handler callback
 */
export type InstallHandler = (details: chrome.runtime.InstalledDetails) => void | Promise<void>;

/**
 * Command handler callback
 */
export type CommandHandler = (command: string) => void | Promise<void>;

/**
 * Tab ready handler callback
 */
export type TabReadyHandler = (tabId: number) => void | Promise<void>;

/**
 * Chrome Event Handler configuration
 */
export interface ChromeEventHandlerConfig {
  debug?: boolean;
  /** URL to open on install */
  installUrl?: string;
  /** URL to open on update */
  updateUrl?: string;
}

/**
 * Chrome Event Handler
 * Manages Chrome extension lifecycle events
 */
export class ChromeEventHandler {
  private readonly debug: boolean;
  private readonly installUrl: string;
  private readonly updateUrl: string;
  private readonly commandHandlers = new Map<string, CommandHandler>();
  private tabReadyHandler: TabReadyHandler | null = null;
  private customInstallHandler: InstallHandler | null = null;

  constructor(config: ChromeEventHandlerConfig = {}) {
    this.debug = config.debug ?? false;
    this.installUrl = config.installUrl ?? 'bg/guide.html';
    this.updateUrl = config.updateUrl ?? 'bg/update.html';
  }

  /**
   * Register all Chrome event listeners
   */
  registerAll(): void {
    this.registerInstallListener();
    this.registerTabListeners();
    this.registerCommandListener();
    this.log('All Chrome event listeners registered');
  }

  /**
   * Register install/update listener
   */
  registerInstallListener(): void {
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });
    this.log('Install listener registered');
  }

  /**
   * Register tab created/updated listeners
   */
  registerTabListeners(): void {
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id !== undefined) {
        this.handleTabReady(tab.id);
      }
    });

    chrome.tabs.onUpdated.addListener((tabId, _changeInfo, _tab) => {
      this.handleTabReady(tabId);
    });

    this.log('Tab listeners registered');
  }

  /**
   * Register command listener
   */
  registerCommandListener(): void {
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });
    this.log('Command listener registered');
  }

  /**
   * Set custom install handler
   */
  onInstall(handler: InstallHandler): void {
    this.customInstallHandler = handler;
  }

  /**
   * Set tab ready handler
   */
  onTabReady(handler: TabReadyHandler): void {
    this.tabReadyHandler = handler;
  }

  /**
   * Register command handler
   */
  onCommand(command: string, handler: CommandHandler): void {
    this.commandHandlers.set(command, handler);
    this.log(`Command handler registered: ${command}`);
  }

  /**
   * Handle install/update event
   */
  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    this.log(`Extension ${details.reason}: ${details.previousVersion ?? 'new'}`);

    // Call custom handler if set
    if (this.customInstallHandler) {
      await this.customInstallHandler(details);
      return;
    }

    // Default behavior
    if (details.reason === 'install') {
      await this.openPage(this.installUrl);
    } else if (details.reason === 'update') {
      await this.openPage(this.updateUrl);
    }
  }

  /**
   * Handle tab ready event
   */
  private async handleTabReady(tabId: number): Promise<void> {
    if (this.tabReadyHandler) {
      await this.tabReadyHandler(tabId);
    }
  }

  /**
   * Handle command event
   */
  private async handleCommand(command: string): Promise<void> {
    this.log(`Command received: ${command}`);

    const handler = this.commandHandlers.get(command);
    if (handler) {
      await handler(command);
    }
  }

  /**
   * Open extension page
   */
  private async openPage(path: string): Promise<void> {
    try {
      const url = chrome.runtime.getURL(path);
      await chrome.tabs.create({ url });
      this.log(`Opened page: ${path}`);
    } catch (error) {
      this.log(`Error opening page: ${error}`);
    }
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[ChromeEventHandler] ${message}`);
    }
  }
}

/**
 * Create ChromeEventHandler instance
 */
export function createChromeEventHandler(
  config?: ChromeEventHandlerConfig
): ChromeEventHandler {
  return new ChromeEventHandler(config);
}
