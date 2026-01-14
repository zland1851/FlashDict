/**
 * Chrome Extension API Mocks for Testing
 * Provides comprehensive mocks for chrome.* APIs used in the extension
 */

// Type definitions for mock functions
type MockFunction = jest.Mock<any, any>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MockEvent<_T extends (...args: any[]) => void> {
  addListener: MockFunction;
  removeListener: MockFunction;
  hasListener: MockFunction;
  hasListeners?: MockFunction;
}

function createMockEvent<T extends (...args: any[]) => void>(): MockEvent<T> {
  return {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn().mockReturnValue(false),
    hasListeners: jest.fn().mockReturnValue(false)
  };
}

// Storage area mock factory
function createStorageAreaMock() {
  const storage: Record<string, any> = {};

  return {
    get: jest.fn((keys: string | string[] | null, callback?: (items: Record<string, any>) => void) => {
      let result: Record<string, any> = {};

      if (keys === null) {
        result = { ...storage };
      } else if (typeof keys === 'string') {
        result = { [keys]: storage[keys] };
      } else if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = storage[key];
        });
      }

      if (callback) {
        callback(result);
      }
      return Promise.resolve(result);
    }),
    set: jest.fn((items: Record<string, any>, callback?: () => void) => {
      Object.assign(storage, items);
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
    remove: jest.fn((keys: string | string[], callback?: () => void) => {
      const keysToRemove = Array.isArray(keys) ? keys : [keys];
      keysToRemove.forEach(key => {
        delete storage[key];
      });
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
    clear: jest.fn((callback?: () => void) => {
      Object.keys(storage).forEach(key => delete storage[key]);
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
    // For testing: access internal storage
    _storage: storage
  };
}

// Create the chrome mock object
export const chromeMock = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn((_message: any, callback?: (response: any) => void) => {
      if (callback) {
        callback(undefined);
      }
      return Promise.resolve();
    }),
    onMessage: createMockEvent<(
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => void>(),
    onInstalled: createMockEvent<(details: chrome.runtime.InstalledDetails) => void>(),
    getURL: jest.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
    getManifest: jest.fn(() => ({
      name: 'ODH Test',
      version: '1.0.0',
      manifest_version: 3
    })),
    lastError: null as chrome.runtime.LastError | null,
    connect: jest.fn(),
    onConnect: createMockEvent<(port: chrome.runtime.Port) => void>(),
    getPlatformInfo: jest.fn((callback?: (info: chrome.runtime.PlatformInfo) => void) => {
      const info: chrome.runtime.PlatformInfo = {
        os: 'mac',
        arch: 'x86-64',
        nacl_arch: 'x86-64'
      };
      if (callback) {
        callback(info);
      }
      return Promise.resolve(info);
    })
  },

  storage: {
    local: createStorageAreaMock(),
    sync: createStorageAreaMock(),
    session: createStorageAreaMock(),
    onChanged: createMockEvent<(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => void>()
  },

  tabs: {
    query: jest.fn((_queryInfo: chrome.tabs.QueryInfo, callback?: (tabs: chrome.tabs.Tab[]) => void) => {
      const tabs: chrome.tabs.Tab[] = [];
      if (callback) {
        callback(tabs);
      }
      return Promise.resolve(tabs);
    }),
    sendMessage: jest.fn((_tabId: number, _message: any, callback?: (response: any) => void) => {
      if (callback) {
        callback(undefined);
      }
      return Promise.resolve();
    }),
    create: jest.fn((createProperties: chrome.tabs.CreateProperties, callback?: (tab: chrome.tabs.Tab) => void) => {
      const tab: chrome.tabs.Tab = {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        ...createProperties
      };
      if (callback) {
        callback(tab);
      }
      return Promise.resolve(tab);
    }),
    update: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
    onCreated: createMockEvent<(tab: chrome.tabs.Tab) => void>(),
    onUpdated: createMockEvent<(
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => void>(),
    onRemoved: createMockEvent<(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void>(),
    onActivated: createMockEvent<(activeInfo: chrome.tabs.TabActiveInfo) => void>()
  },

  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn(),
    setTitle: jest.fn(),
    setPopup: jest.fn(),
    getBadgeText: jest.fn((_details: chrome.action.TabDetails, callback?: (result: string) => void) => {
      if (callback) {
        callback('');
      }
      return Promise.resolve('');
    }),
    onClicked: createMockEvent<(tab: chrome.tabs.Tab) => void>()
  },

  commands: {
    onCommand: createMockEvent<(command: string, tab?: chrome.tabs.Tab) => void>(),
    getAll: jest.fn((callback?: (commands: chrome.commands.Command[]) => void) => {
      const commands: chrome.commands.Command[] = [];
      if (callback) {
        callback(commands);
      }
      return Promise.resolve(commands);
    })
  },

  i18n: {
    getMessage: jest.fn((messageName: string, _substitutions?: string | string[]) => {
      // Return the message name as a fallback for testing
      return messageName;
    }),
    getUILanguage: jest.fn(() => 'en'),
    getAcceptLanguages: jest.fn((callback?: (languages: string[]) => void) => {
      const languages = ['en-US', 'en'];
      if (callback) {
        callback(languages);
      }
      return Promise.resolve(languages);
    })
  },

  windows: {
    getCurrent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onCreated: createMockEvent<(window: chrome.windows.Window) => void>(),
    onRemoved: createMockEvent<(windowId: number) => void>(),
    onFocusChanged: createMockEvent<(windowId: number) => void>()
  },

  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn(),
    removeCSS: jest.fn()
  },

  offscreen: {
    createDocument: jest.fn(),
    closeDocument: jest.fn(),
    hasDocument: jest.fn().mockResolvedValue(false),
    Reason: {
      TESTING: 'TESTING',
      AUDIO_PLAYBACK: 'AUDIO_PLAYBACK',
      DOM_PARSER: 'DOM_PARSER',
      DOM_SCRAPING: 'DOM_SCRAPING'
    }
  }
};

// Helper function to reset all mocks
export function resetChromeMocks(): void {
  const resetMockObject = (obj: any): void => {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        if (typeof obj[key].mockReset === 'function') {
          obj[key].mockReset();
        } else {
          resetMockObject(obj[key]);
        }
      }
    }
  };

  resetMockObject(chromeMock);
  chromeMock.runtime.lastError = null;
}

// Helper function to simulate chrome.runtime.lastError
export function setLastError(message: string | null): void {
  chromeMock.runtime.lastError = message ? { message } : null;
}

// Helper to get storage mock for direct manipulation in tests
export function getStorageMock(area: 'local' | 'sync' | 'session' = 'local') {
  return chromeMock.storage[area];
}

// Install chrome mock globally
export function installChromeMock(): void {
  (global as any).chrome = chromeMock;
}

// Uninstall chrome mock
export function uninstallChromeMock(): void {
  delete (global as any).chrome;
}

// Default export for convenience
export default chromeMock;
