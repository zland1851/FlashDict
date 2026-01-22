/**
 * Shared UI Utilities
 * Common functions used by popup and options pages
 */

/**
 * Extension options interface
 */
export interface ExtensionOptions {
  enabled: boolean;
  mouseselection: boolean;
  hotkey: string;
  maxcontext: string;
  maxexample: string;
  monolingual: string;
  preferredaudio: string;
  services: string;
  id: string;
  password: string;
  duplicate: string;
  tags: string;
  deckname: string;
  typename: string;
  expression: string;
  reading: string;
  extrainfo: string;
  definition: string;
  definitions: string;
  sentence: string;
  url: string;
  audio: string;
  sysscripts: string;
  udfscripts: string;
  dictSelected: string;
  dictNamelist: Array<{ objectname: string; displayname: string }>;
}

/**
 * Default options values
 */
const DEFAULT_OPTIONS: ExtensionOptions = {
  enabled: true,
  mouseselection: true,
  hotkey: '16', // 0:off, 16:shift, 17:ctrl, 18:alt
  maxcontext: '1',
  maxexample: '2',
  monolingual: '0', // 0: bilingual, 1: monolingual
  preferredaudio: '0',
  services: 'none',
  id: '',
  password: '',
  duplicate: '1', // 0: not allowed, 1: allowed
  tags: 'FlashDict',
  deckname: 'Default',
  typename: 'Basic',
  expression: 'Front',
  reading: '',
  extrainfo: '',
  definition: 'Back',
  definitions: '',
  sentence: '',
  url: '',
  audio: '',
  sysscripts:
    'builtin_encn_Collins,encn_Collins,encn_Cambridge,encn_Oxford,fren_Cambridge,esen_Spanishdict,decn_Eudict,escn_Eudict,frcn_Eudict',
  udfscripts: '',
  dictSelected: '',
  dictNamelist: [],
};

/**
 * Sanitize options with default values
 */
export function sanitizeOptions(options: Partial<ExtensionOptions>): ExtensionOptions {
  const result = { ...DEFAULT_OPTIONS };

  for (const key of Object.keys(DEFAULT_OPTIONS) as Array<keyof ExtensionOptions>) {
    if (key in options && options[key] !== undefined) {
      (result as Record<string, unknown>)[key] = options[key];
    }
  }

  return result;
}

/**
 * Load options from Chrome storage
 */
export async function optionsLoad(): Promise<ExtensionOptions> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (options) => {
      resolve(sanitizeOptions(options as Partial<ExtensionOptions>));
    });
  });
}

/**
 * Save options to Chrome storage
 */
export async function optionsSave(options: ExtensionOptions): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(sanitizeOptions(options), () => resolve());
  });
}

/**
 * Utility to wrap async functions
 */
export function utilAsync<T extends (...args: unknown[]) => void>(
  func: T
): (...args: Parameters<T>) => void {
  return function (this: unknown, ...args: Parameters<T>): void {
    func.apply(this, args);
  };
}

/**
 * Service Worker backend proxy interface
 */
interface OdhBackend {
  opt_getDeckNames: () => Promise<string[] | null>;
  opt_getModelNames: () => Promise<string[] | null>;
  opt_getModelFieldNames: (modelName: string) => Promise<string[] | null>;
  opt_getVersion: () => Promise<string | null>;
  opt_optionsChanged: (options: ExtensionOptions) => Promise<ExtensionOptions>;
  ankiweb: {
    initConnection: (options: ExtensionOptions, forceLogout: boolean) => Promise<void>;
  };
}

/**
 * Helper function to send messages to Service Worker
 */
function sendMessageToSW<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, params }, (response: T) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to Service Worker:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Get the backend proxy for communicating with Service Worker
 */
export function odhback(): OdhBackend {
  return {
    opt_getDeckNames: () => sendMessageToSW('opt_getDeckNames', {}),
    opt_getModelNames: () => sendMessageToSW('opt_getModelNames', {}),
    opt_getModelFieldNames: (modelName: string) =>
      sendMessageToSW('opt_getModelFieldNames', { modelName }),
    opt_getVersion: () => sendMessageToSW('opt_getVersion', {}),
    opt_optionsChanged: (options: ExtensionOptions) =>
      sendMessageToSW('opt_optionsChanged', { options }),
    ankiweb: {
      initConnection: (options: ExtensionOptions, forceLogout: boolean) =>
        sendMessageToSW('ankiweb_initConnection', { options, forceLogout }),
    },
  };
}

/**
 * Localize HTML page using Chrome i18n API
 */
export function localizeHtmlPage(): void {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.innerHTML = chrome.i18n.getMessage(key);
    }
  });
}

/**
 * Setup offscreen document for sandbox communication
 */
let creating: Promise<void> | null = null;

export async function setupOffscreenDocument(path: string): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification:
        'ODH needs offscreen document to maintain sandbox page for dictionary scripts execution',
    });
    await creating;
    creating = null;
  }
}

// Expose functions globally for use by other scripts (options.js, popup.js)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).odhback = odhback;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).optionsLoad = optionsLoad;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).optionsSave = optionsSave;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).localizeHtmlPage = localizeHtmlPage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).utilAsync = utilAsync;
