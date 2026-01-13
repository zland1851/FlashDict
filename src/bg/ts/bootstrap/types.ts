/**
 * Bootstrap Types
 * Type definitions for bootstrap system
 *
 * Single Responsibility: Only defines types and interfaces
 */

import type { Container } from '../core/Container';
import type { EventBus } from '../core/EventBus';
import type { MessageRouter } from '../core/MessageRouter';
import type { OptionsManager } from '../managers/OptionsManager';
import type { AnkiConnectService } from '../services/AnkiConnectService';
import type { AnkiWebService } from '../services/AnkiWebService';
import type { NoteFormatterService } from '../services/NoteFormatterService';
import type { OptionsHandler } from '../handlers/OptionsHandler';
import type { DictionaryHandler } from '../handlers/DictionaryHandler';
import type { AudioHandler } from '../handlers/AudioHandler';
import type { CredentialManager } from '../security/CredentialManager';
import type { MiddlewareFn } from '../security/SecurityMiddleware';

/**
 * Core infrastructure services
 */
export interface CoreServices {
  container: Container;
  eventBus: EventBus;
  messageRouter: MessageRouter;
}

/**
 * Manager services
 */
export interface ManagerServices {
  optionsManager: OptionsManager;
  credentialManager: CredentialManager;
}

/**
 * Anki-related services
 */
export interface AnkiServices {
  ankiConnectService: AnkiConnectService;
  ankiWebService: AnkiWebService;
  noteFormatterService: NoteFormatterService;
}

/**
 * Message handlers
 */
export interface MessageHandlers {
  optionsHandler: OptionsHandler;
  dictionaryHandler: DictionaryHandler;
  audioHandler: AudioHandler;
}

/**
 * Complete bootstrap context
 * Contains all initialized services and handlers
 */
export interface BootstrapContext extends
  CoreServices,
  ManagerServices,
  AnkiServices,
  MessageHandlers {}

/**
 * Bootstrap configuration options
 */
export interface BootstrapOptions {
  /** Enable debug logging */
  debug?: boolean;

  /** Enable security middleware */
  enableSecurity?: boolean;

  /** Security middleware configuration */
  securityConfig?: {
    /** Enable sender verification */
    verifySender?: boolean;
    /** Enable rate limiting */
    rateLimit?: number;
    /** Enable strict validation */
    strictValidation?: boolean;
  };

  /** Custom middleware to add */
  middleware?: MiddlewareFn[];

  /** Credential manager configuration */
  credentials?: {
    /** Default expiry in milliseconds */
    defaultExpiryMs?: number;
  };
}

/**
 * Service factory configuration
 */
export interface ServiceFactoryConfig {
  debug?: boolean;
  container: Container;
  eventBus: EventBus;
}

/**
 * Handler registry configuration
 */
export interface HandlerRegistryConfig {
  debug?: boolean;
  messageRouter: MessageRouter;
}

/**
 * Event wiring configuration
 */
export interface EventWiringConfig {
  debug?: boolean;
  eventBus: EventBus;
}

/**
 * Bootstrap phase result
 */
export interface PhaseResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
}

/**
 * Bootstrap lifecycle hooks
 */
export interface BootstrapHooks {
  /** Called before bootstrap starts */
  onBeforeBootstrap?: () => void | Promise<void>;

  /** Called after core services are created */
  onCoreServicesCreated?: (services: CoreServices) => void | Promise<void>;

  /** Called after all services are created */
  onServicesCreated?: (context: Partial<BootstrapContext>) => void | Promise<void>;

  /** Called after handlers are registered */
  onHandlersRegistered?: (context: BootstrapContext) => void | Promise<void>;

  /** Called after bootstrap completes */
  onBootstrapComplete?: (context: BootstrapContext) => void | Promise<void>;

  /** Called if bootstrap fails */
  onBootstrapError?: (error: Error) => void | Promise<void>;
}

/**
 * Extended bootstrap options with hooks
 */
export interface BootstrapOptionsWithHooks extends BootstrapOptions {
  hooks?: BootstrapHooks;
}
