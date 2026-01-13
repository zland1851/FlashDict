/**
 * Service Factory
 * Creates and registers all application services
 *
 * Single Responsibility: Only creates services
 * Open/Closed: Extensible via factory methods
 * Dependency Inversion: Depends on abstractions (interfaces)
 */

import type { Container } from '../core/Container';
import { createOptionsManager, type OptionsManager } from '../managers/OptionsManager';
import { createAnkiConnectService } from '../services/AnkiConnectService';
import { createAnkiWebService } from '../services/AnkiWebService';
import { createNoteFormatterService } from '../services/NoteFormatterService';
import { createOptionsHandler } from '../handlers/OptionsHandler';
import { createDictionaryHandler } from '../handlers/DictionaryHandler';
import { createAudioHandler } from '../handlers/AudioHandler';
import { createCredentialManager, type CredentialManager, AnkiWebCredentials } from '../security/CredentialManager';
import { SERVICE_NAMES } from './constants';
import type { ServiceFactoryConfig, ManagerServices, AnkiServices, MessageHandlers } from './types';

/**
 * Service Factory
 * Responsible for creating and registering services with the DI container
 */
export class ServiceFactory {
  private readonly container: Container;
  private readonly debug: boolean;

  constructor(config: ServiceFactoryConfig) {
    this.container = config.container;
    // eventBus available for future use when services need to emit events
    this.debug = config.debug ?? false;
  }

  /**
   * Create and register all manager services
   */
  createManagers(config?: { credentialExpiryMs?: number }): ManagerServices {
    this.log('Creating manager services...');

    // Create OptionsManager
    const optionsManager = createOptionsManager();
    this.container.registerSingleton(
      SERVICE_NAMES.OPTIONS_MANAGER,
      () => optionsManager
    );

    // Create CredentialManager
    const credentialManager = createCredentialManager({
      defaultExpiryMs: config?.credentialExpiryMs ?? 0,
      debug: this.debug
    });
    this.container.registerSingleton(
      SERVICE_NAMES.CREDENTIAL_MANAGER,
      () => credentialManager
    );

    this.log('Manager services created');

    return {
      optionsManager,
      credentialManager
    };
  }

  /**
   * Create and register all Anki services
   */
  createAnkiServices(credentialManager: CredentialManager): AnkiServices {
    this.log('Creating Anki services...');

    // Create AnkiConnectService
    const ankiConnectService = createAnkiConnectService();
    this.container.registerSingleton(
      SERVICE_NAMES.ANKI_CONNECT,
      () => ankiConnectService
    );

    // Create AnkiWebService with credential integration
    const ankiWebCredentials = new AnkiWebCredentials(credentialManager);
    const credentials = ankiWebCredentials.getCredentials();

    const ankiWebService = createAnkiWebService({
      id: credentials?.username ?? '',
      password: credentials?.password ?? ''
    });
    this.container.registerSingleton(
      SERVICE_NAMES.ANKI_WEB,
      () => ankiWebService
    );

    // Create NoteFormatterService
    const noteFormatterService = createNoteFormatterService();
    this.container.registerSingleton(
      SERVICE_NAMES.NOTE_FORMATTER,
      () => noteFormatterService
    );

    this.log('Anki services created');

    return {
      ankiConnectService,
      ankiWebService,
      noteFormatterService
    };
  }

  /**
   * Create and register all message handlers
   */
  createHandlers(optionsManager: OptionsManager): MessageHandlers {
    this.log('Creating message handlers...');

    // Create OptionsHandler
    const optionsHandler = createOptionsHandler(optionsManager);
    this.container.registerSingleton(
      SERVICE_NAMES.OPTIONS_HANDLER,
      () => optionsHandler
    );

    // Create DictionaryHandler
    const dictionaryHandler = createDictionaryHandler(new Map());
    this.container.registerSingleton(
      SERVICE_NAMES.DICTIONARY_HANDLER,
      () => dictionaryHandler
    );

    // Create AudioHandler
    const audioHandler = createAudioHandler();
    this.container.registerSingleton(
      SERVICE_NAMES.AUDIO_HANDLER,
      () => audioHandler
    );

    this.log('Message handlers created');

    return {
      optionsHandler,
      dictionaryHandler,
      audioHandler
    };
  }

  /**
   * Create all services at once
   */
  createAll(config?: { credentialExpiryMs?: number }): {
    managers: ManagerServices;
    ankiServices: AnkiServices;
    handlers: MessageHandlers;
  } {
    const managers = this.createManagers(config);
    const ankiServices = this.createAnkiServices(managers.credentialManager);
    const handlers = this.createHandlers(managers.optionsManager);

    return {
      managers,
      ankiServices,
      handlers
    };
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(serviceName: string): T {
    return this.container.resolve<T>(serviceName);
  }

  /**
   * Check if a service is registered
   */
  has(serviceName: string): boolean {
    return this.container.has(serviceName);
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[ServiceFactory] ${message}`);
    }
  }
}

/**
 * Create a service factory instance
 */
export function createServiceFactory(config: ServiceFactoryConfig): ServiceFactory {
  return new ServiceFactory(config);
}
