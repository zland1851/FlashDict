/**
 * Service Worker Entry Point
 * Pure TypeScript implementation for Chrome extension Manifest V3
 *
 * Architecture:
 * - Uses Bootstrap system for dependency injection
 * - Uses BackendService for service coordination
 * - Uses MessageRouter for message handling
 * - All legacy JavaScript code removed
 */

import {
  bootstrap,
  EVENTS,
  MESSAGE_ACTIONS,
  type BootstrapContext
} from './bootstrap';
import {
  createBackendService,
  BackendService
} from './services/BackendService';
import { createHandler } from './core/MessageRouter';
import type { MessageSender } from './interfaces/IMessageHandler';
import type { ExtensionOptions } from './interfaces/IOptionsStore';
import type { NoteDefinition } from './services/NoteFormatterService';
import { createBuiltin, Builtin } from './utils/builtin';
import { createDeinflector, Deinflector } from './utils/deinflector';

/**
 * Service Worker configuration
 */
interface ServiceWorkerConfig {
  debug?: boolean;
  offscreenDocumentPath?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ServiceWorkerConfig> = {
  debug: false,
  offscreenDocumentPath: '/bg/background.html'
};

/**
 * Global references
 */
let context: BootstrapContext | null = null;
let backendService: BackendService | null = null;
let isInitialized = false;
let builtin: Builtin | null = null;
let deinflector: Deinflector | null = null;

/**
 * Offscreen document management
 */
let creatingOffscreen: Promise<void> | null = null;

/**
 * Setup offscreen document for sandbox and audio playback
 * Uses 'any' casts because Chrome types for Manifest V3 offscreen APIs
 * are not fully available in @types/chrome
 */
async function setupOffscreenDocument(path: string): Promise<void> {
  console.log('[ServiceWorker] Setting up offscreen document:', path);

  try {
    const offscreenUrl = chrome.runtime.getURL(path);
    console.log('[ServiceWorker] Offscreen URL:', offscreenUrl);

    // Check if offscreen document already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingContexts = await (chrome.runtime as any).getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    console.log('[ServiceWorker] Existing contexts:', existingContexts?.length ?? 0);

    if (existingContexts && existingContexts.length > 0) {
      console.log('[ServiceWorker] Offscreen document already exists');
      return;
    }

    // Create offscreen document (avoid concurrency issues)
    if (creatingOffscreen) {
      console.log('[ServiceWorker] Waiting for existing offscreen creation...');
      await creatingOffscreen;
    } else {
      console.log('[ServiceWorker] Creating offscreen document...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      creatingOffscreen = (chrome as any).offscreen.createDocument({
        url: path,
        reasons: ['IFRAME_SCRIPTING', 'AUDIO_PLAYBACK'],
        justification: 'ODH needs offscreen document for dictionary sandbox and audio playback'
      });
      await creatingOffscreen;
      creatingOffscreen = null;
      console.log('[ServiceWorker] Offscreen document created successfully');
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to setup offscreen document:', error);
    throw error;
  }
}

/**
 * Keep Service Worker alive
 * Manifest V3 Service Workers can be terminated, this keeps them active
 */
function keepAlive(): void {
  setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just to keep the Service Worker active
    });
  }, 20000);
}

/**
 * Register additional message handlers
 */
function registerAdditionalHandlers(ctx: BootstrapContext, backend: BackendService): void {
  const { messageRouter } = ctx;

  // Anki deck names handler
  messageRouter.register(
    MESSAGE_ACTIONS.GET_DECK_NAMES,
    createHandler(MESSAGE_ACTIONS.GET_DECK_NAMES, async () => {
      return backend.getDeckNames();
    })
  );

  // Anki model names handler
  messageRouter.register(
    MESSAGE_ACTIONS.GET_MODEL_NAMES,
    createHandler(MESSAGE_ACTIONS.GET_MODEL_NAMES, async () => {
      return backend.getModelNames();
    })
  );

  // Anki model field names handler
  messageRouter.register(
    MESSAGE_ACTIONS.GET_MODEL_FIELD_NAMES,
    createHandler(MESSAGE_ACTIONS.GET_MODEL_FIELD_NAMES, async (params: { modelName: string }) => {
      return backend.getModelFieldNames(params.modelName);
    })
  );

  // Anki version handler
  messageRouter.register(
    MESSAGE_ACTIONS.GET_VERSION,
    createHandler(MESSAGE_ACTIONS.GET_VERSION, async () => {
      return backend.getAnkiVersion();
    })
  );

  // Is connected handler
  messageRouter.register(
    MESSAGE_ACTIONS.IS_CONNECTED,
    createHandler(MESSAGE_ACTIONS.IS_CONNECTED, async () => {
      return backend.getAnkiVersion();
    })
  );

  // Add note handler
  messageRouter.register(
    MESSAGE_ACTIONS.ADD_NOTE,
    createHandler(MESSAGE_ACTIONS.ADD_NOTE, async (params: { notedef: NoteDefinition }) => {
      return backend.addNote(params.notedef);
    })
  );

  // Override getTranslation and findTerm handlers from bootstrap
  // Bootstrap registers DictionaryHandler with empty local dictionaries
  // We need handlers that use BackendService which routes through sandbox
  messageRouter.unregister(MESSAGE_ACTIONS.GET_TRANSLATION);
  messageRouter.unregister(MESSAGE_ACTIONS.FIND_TERM);

  // Get translation handler - uses sandbox via BackendService
  messageRouter.register(
    MESSAGE_ACTIONS.GET_TRANSLATION,
    createHandler(MESSAGE_ACTIONS.GET_TRANSLATION, async (params: { expression: string }) => {
      let expression = params.expression;
      // Fix trailing period issue
      if (expression.endsWith('.')) {
        expression = expression.slice(0, -1);
      }
      console.log('[ServiceWorker] getTranslation:', expression);
      return backend.findTerm(expression);
    })
  );

  // Find term handler - alias for getTranslation
  messageRouter.register(
    MESSAGE_ACTIONS.FIND_TERM,
    createHandler(MESSAGE_ACTIONS.FIND_TERM, async (params: { expression: string }) => {
      console.log('[ServiceWorker] findTerm:', params.expression);
      return backend.findTerm(params.expression);
    })
  );

  // Locale handler
  messageRouter.register(
    MESSAGE_ACTIONS.GET_LOCALE,
    createHandler(MESSAGE_ACTIONS.GET_LOCALE, async () => {
      return chrome.i18n.getUILanguage();
    })
  );

  // Fetch handler (for dictionary scripts)
  messageRouter.register(
    MESSAGE_ACTIONS.FETCH,
    createHandler(MESSAGE_ACTIONS.FETCH, async (params: { url: string }) => {
      try {
        let url = params.url;

        // Convert relative URLs to absolute extension URLs
        // Service workers cannot use relative URLs directly
        if (url.startsWith('/')) {
          url = chrome.runtime.getURL(url);
        }

        console.log('[ServiceWorker] Fetching:', url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.text();
      } catch (error) {
        console.error('Fetch error:', error);
        return null;
      }
    })
  );

  // Builtin dictionary handler (for Collins, etc.)
  messageRouter.register(
    MESSAGE_ACTIONS.GET_BUILTIN,
    createHandler(MESSAGE_ACTIONS.GET_BUILTIN, async (params: { dict: string; word: string }) => {
      if (!builtin) {
        console.warn('[ServiceWorker] Builtin not initialized');
        return null;
      }
      const result = builtin.findTerm(params.dict, params.word);
      console.log(`[ServiceWorker] getBuiltin(${params.dict}, ${params.word}):`, result ? 'found' : 'not found');
      return result;
    })
  );

  // Deinflect handler (word form stemming)
  messageRouter.register(
    MESSAGE_ACTIONS.DEINFLECT,
    createHandler(MESSAGE_ACTIONS.DEINFLECT, async (params: { word: string }) => {
      if (!deinflector) {
        console.warn('[ServiceWorker] Deinflector not initialized');
        return null;
      }
      const result = deinflector.deinflect(params.word);
      console.log(`[ServiceWorker] Deinflect(${params.word}):`, result);
      return result;
    })
  );
}

/**
 * Setup Chrome message listener
 */
function setupMessageListener(ctx: BootstrapContext, backend: BackendService): void {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action, params, target } = request;

    // Skip messages targeted to background (offscreen document)
    if (target === 'background') {
      return false;
    }

    // Handle sandbox ready message
    if (action === 'sandboxReady') {
      backend.markSandboxReady();
      sendResponse({ success: true });
      return true;
    }

    // Handle sandbox ping
    if (action === 'sandboxPing') {
      sendResponse({ ready: backend.areDictionariesLoaded() });
      return true;
    }

    // Route through MessageRouter
    if (ctx.messageRouter.hasHandler(action)) {
      const messageSender: MessageSender = {
        tabId: sender.tab?.id,
        frameId: sender.frameId,
        url: sender.url,
        extensionId: sender.id
      };

      ctx.messageRouter
        .route({ action, params }, messageSender)
        .then((response) => {
          sendResponse(response.data);
        })
        .catch((error) => {
          console.error(`Error handling ${action}:`, error);
          sendResponse(null);
        });

      return true; // Will respond asynchronously
    }

    // Not handled
    return false;
  });
}

/**
 * Setup event subscriptions
 */
function setupEventSubscriptions(ctx: BootstrapContext, backend: BackendService): void {
  const { eventBus, optionsManager } = ctx;

  // Subscribe to options changes
  optionsManager.subscribe(async (event) => {
    await backend.handleOptionsChanged(event.newOptions);
    eventBus.emit(EVENTS.OPTIONS_CHANGED, event);
  });

  // Subscribe to bootstrap complete
  eventBus.on(EVENTS.BOOTSTRAP_COMPLETE, async () => {
    // Initialize dictionaries after bootstrap
    try {
      await backend.initializeDictionaries();

      // Save updated options (with dictNamelist) to storage
      // so popup and options pages can access the dictionary list
      const updatedOptions = backend.getOptions();
      if (updatedOptions) {
        await optionsManager.save(updatedOptions);
        console.log('[ServiceWorker] Options saved with dictNamelist:', updatedOptions.dictNamelist?.length);
      }
    } catch (error) {
      console.error('Failed to initialize dictionaries:', error);
    }
  });
}

/**
 * Initialize the Service Worker
 */
async function initialize(config: ServiceWorkerConfig = {}): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Merge with defaults
  const finalConfig: Required<ServiceWorkerConfig> = {
    debug: config.debug ?? DEFAULT_CONFIG.debug,
    offscreenDocumentPath: config.offscreenDocumentPath ?? DEFAULT_CONFIG.offscreenDocumentPath
  };

  const log = (message: string) => {
    if (finalConfig.debug) {
      console.log(`[ServiceWorker] ${message}`);
    }
  };

  try {
    log('Initializing...');

    // Setup offscreen document first
    await setupOffscreenDocument(finalConfig.offscreenDocumentPath);
    log('Offscreen document ready');

    // Initialize builtin dictionary and deinflector
    builtin = createBuiltin();
    deinflector = createDeinflector({
      dataPath: 'bg/data/wordforms.json'
    });

    // Load builtin data (Collins dictionary)
    try {
      await builtin.loadData();
      log(`Builtin loaded: ${builtin.getTermCount('collins')} terms`);
    } catch (error) {
      console.warn('[ServiceWorker] Failed to load builtin data:', error);
    }

    // Load deinflector data (word forms)
    try {
      await deinflector.loadData();
      log('Deinflector loaded');
    } catch (error) {
      console.warn('[ServiceWorker] Failed to load deinflector data:', error);
    }

    // Bootstrap the application
    context = bootstrap({
      debug: finalConfig.debug,
      enableSecurity: true,
      hooks: {
        onBootstrapComplete: (_ctx) => {
          log('Bootstrap complete');
        },
        onBootstrapError: (error) => {
          console.error('Bootstrap error:', error);
        }
      }
    });

    // Load options from storage
    await context.optionsManager.load();
    const options = context.optionsManager.getCurrent();
    log(`Options loaded: enabled=${options?.enabled}`);

    // Create BackendService
    backendService = createBackendService(
      {
        ankiConnectService: context.ankiConnectService,
        ankiWebService: context.ankiWebService,
        noteFormatterService: context.noteFormatterService
      },
      {
        debug: finalConfig.debug
      },
      {
        onInitialized: () => log('BackendService initialized'),
        onDictionariesLoaded: () => log('Dictionaries loaded'),
        onOptionsChanged: (opts) => log(`Options changed: enabled=${opts.enabled}`),
        onError: (error, ctx) => console.error(`BackendService error in ${ctx}:`, error)
      }
    );

    // Initialize BackendService with options
    if (options) {
      await backendService.initialize(options);
    }

    // Register additional handlers
    registerAdditionalHandlers(context, backendService);
    log('Additional handlers registered');

    // Setup message listener
    setupMessageListener(context, backendService);
    log('Message listener setup');

    // Setup event subscriptions
    setupEventSubscriptions(context, backendService);
    log('Event subscriptions setup');

    // Register command handler
    backendService.onCommand('enabled', async () => {
      const currentOptions = context!.optionsManager.getCurrent();
      if (currentOptions) {
        const newOptions: ExtensionOptions = {
          ...currentOptions,
          enabled: !currentOptions.enabled
        };
        await context!.optionsManager.save(newOptions);
      }
    });

    // Emit bootstrap complete event
    context.eventBus.emit(EVENTS.BOOTSTRAP_COMPLETE, context);

    isInitialized = true;
    log('Initialization complete');
  } catch (error) {
    console.error('Failed to initialize Service Worker:', error);
    throw error;
  }
}

/**
 * Entry Point
 */

// Keep Service Worker alive
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

// Initialize on startup
initialize({ debug: true }).catch((error) => {
  console.error('Service Worker initialization failed:', error);
});

/**
 * Export for testing
 */
export {
  initialize,
  setupOffscreenDocument,
  context as getContext,
  backendService as getBackendService
};
