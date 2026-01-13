/**
 * Service Bootstrap
 * Initializes all services and sets up DI container with message router
 * This is the main entry point for TypeScript backend architecture
 */

import { Container, createContainer } from './core/Container';
import { MessageRouter, createMessageRouter } from './core/MessageRouter';
import { EventBus, createEventBus } from './core/EventBus';
import { createOptionsManager, type OptionsManager } from './managers/OptionsManager';
import { createAnkiConnectService, type AnkiConnectService } from './services/AnkiConnectService';
import { createAnkiWebService, type AnkiWebService } from './services/AnkiWebService';
import { createNoteFormatterService, type NoteFormatterService } from './services/NoteFormatterService';
import { createOptionsHandler, type OptionsHandler } from './handlers/OptionsHandler';
import { createDictionaryHandler, type DictionaryHandler } from './handlers/DictionaryHandler';
import { createAudioHandler, type AudioHandler } from './handlers/AudioHandler';

// Service names for DI container
export const SERVICE_NAMES = {
  // Core services
  CONTAINER: 'container',
  EVENT_BUS: 'eventBus',
  MESSAGE_ROUTER: 'messageRouter',

  // Managers
  OPTIONS_MANAGER: 'optionsManager',

  // Services
  ANKI_CONNECT: 'ankiConnect',
  ANKI_WEB: 'ankiWeb',
  NOTE_FORMATTER: 'noteFormatter',

  // Handlers
  OPTIONS_HANDLER: 'optionsHandler',
  DICTIONARY_HANDLER: 'dictionaryHandler',
  AUDIO_HANDLER: 'audioHandler'
} as const;

// Event names
export const EVENTS = {
  OPTIONS_CHANGED: 'options:changed',
  OPTIONS_LOADED: 'options:loaded',
  TRANSLATION_REQUESTED: 'translation:requested',
  TRANSLATION_COMPLETED: 'translation:completed',
  NOTE_ADDED: 'note:added',
  NOTE_FAILED: 'note:failed',
  DICTIONARY_LOADED: 'dictionary:loaded',
  DICTIONARY_SELECTED: 'dictionary:selected',
  ANKI_CONNECTED: 'anki:connected',
  ANKI_DISCONNECTED: 'anki:disconnected'
} as const;

/**
 * Bootstrap context - holds all initialized services
 */
export interface BootstrapContext {
  container: Container;
  eventBus: EventBus;
  messageRouter: MessageRouter;
  optionsManager: OptionsManager;
  ankiConnectService: AnkiConnectService;
  ankiWebService: AnkiWebService;
  noteFormatterService: NoteFormatterService;
  optionsHandler: OptionsHandler;
  dictionaryHandler: DictionaryHandler;
  audioHandler: AudioHandler;
}

/**
 * Bootstrap configuration options
 */
export interface BootstrapOptions {
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Offscreen document URL for audio playback */
  offscreenDocumentUrl?: string;
}

/**
 * Bootstrap application
 * Creates and wires up all services through DI container
 * @param options - Bootstrap configuration
 * @returns Bootstrap context with all services
 */
export function bootstrap(options: BootstrapOptions = {}): BootstrapContext {
  const debug = options.debug ?? false;

  // 1. Create core infrastructure
  const container = createContainer({ debug });
  const eventBus = createEventBus({ debug, catchErrors: true });
  const messageRouter = createMessageRouter({ debug, throwOnUnknown: true });

  // 2. Register core services in container
  container.registerSingleton(SERVICE_NAMES.CONTAINER, () => container);
  container.registerSingleton(SERVICE_NAMES.EVENT_BUS, () => eventBus);
  container.registerSingleton(SERVICE_NAMES.MESSAGE_ROUTER, () => messageRouter);

  // 3. Create and register options manager
  const optionsManager = createOptionsManager();
  container.registerSingleton(SERVICE_NAMES.OPTIONS_MANAGER, () => optionsManager);

  // 4. Create and register Anki services
  const ankiConnectService = createAnkiConnectService();
  container.registerSingleton(SERVICE_NAMES.ANKI_CONNECT, () => ankiConnectService);

  const ankiWebService = createAnkiWebService({
    id: '',
    password: ''
  });
  container.registerSingleton(SERVICE_NAMES.ANKI_WEB, () => ankiWebService);

  // 5. Create and register note formatter
  const noteFormatterService = createNoteFormatterService();
  container.registerSingleton(SERVICE_NAMES.NOTE_FORMATTER, () => noteFormatterService);

  // 6. Create and register message handlers
  const optionsHandler = createOptionsHandler(optionsManager);
  container.registerSingleton(SERVICE_NAMES.OPTIONS_HANDLER, () => optionsHandler);

  const dictionaryHandler = createDictionaryHandler(new Map());
  container.registerSingleton(SERVICE_NAMES.DICTIONARY_HANDLER, () => dictionaryHandler);

  const audioHandler = createAudioHandler();
  container.registerSingleton(SERVICE_NAMES.AUDIO_HANDLER, () => audioHandler);

  // 7. Wire up options change events
  optionsManager.subscribe((event) => {
    eventBus.emit(EVENTS.OPTIONS_CHANGED, event);
  });

  // 8. Register handlers with message router
  messageRouter.register('opt_optionsChanged', optionsHandler);
  messageRouter.register('findTerm', dictionaryHandler);
  messageRouter.register('getTranslation', dictionaryHandler);
  messageRouter.register('playAudio', audioHandler);

  // 9. Emit initialization complete event
  eventBus.emit(EVENTS.OPTIONS_LOADED, { options: optionsManager.getCurrent() });

  // 10. Log bootstrap completion
  if (debug) {
    console.log('[Bootstrap] Services initialized:');
    console.log('  - Container');
    console.log('  - EventBus');
    console.log('  - MessageRouter');
    console.log('  - OptionsManager');
    console.log('  - AnkiConnectService');
    console.log('  - AnkiWebService');
    console.log('  - NoteFormatterService');
    console.log('  - OptionsHandler');
    console.log('  - DictionaryHandler');
    console.log('  - AudioHandler');
  }

  return {
    container,
    eventBus,
    messageRouter,
    optionsManager,
    ankiConnectService,
    ankiWebService,
    noteFormatterService,
    optionsHandler,
    dictionaryHandler,
    audioHandler
  };
}

/**
 * Get bootstrap context
 * @returns Current bootstrap context or null if not initialized
 */
let bootstrapContext: BootstrapContext | null = null;

export function getBootstrapContext(): BootstrapContext | null {
  return bootstrapContext;
}

/**
 * Set bootstrap context
 * @param context - Bootstrap context to set
 */
export function setBootstrapContext(context: BootstrapContext): void {
  bootstrapContext = context;
}

/**
 * Clear bootstrap context
 */
export function clearBootstrapContext(): void {
  bootstrapContext = null;
}
