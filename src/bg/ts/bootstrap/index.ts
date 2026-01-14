/**
 * Bootstrap Entry Point
 * Orchestrates application initialization using modular components
 *
 * Single Responsibility: Orchestrates bootstrap process
 * Open/Closed: Extensible via hooks and configuration
 * Dependency Inversion: Depends on abstractions from other modules
 */

import { createContainer } from '../core/Container';
import { createEventBus } from '../core/EventBus';
import { createMessageRouter } from '../core/MessageRouter';
import { createSecurityMiddleware, defaultSecurityMiddleware } from '../security/SecurityMiddleware';
import { createServiceFactory } from './ServiceFactory';
import { createHandlerRegistry, HandlerRegistry } from './HandlerRegistry';
import { createEventWiring } from './EventWiring';
import { SERVICE_NAMES } from './constants';
import type {
  BootstrapContext,
  BootstrapOptionsWithHooks,
  CoreServices
} from './types';

// Re-export all bootstrap-related types and constants
export * from './constants';
export * from './types';
export { ServiceFactory, createServiceFactory } from './ServiceFactory';
export { HandlerRegistry, createHandlerRegistry } from './HandlerRegistry';
export { EventWiring, createEventWiring } from './EventWiring';

/**
 * Bootstrap the application
 * Creates and wires all services following SOLID principles
 *
 * @param options - Bootstrap configuration
 * @returns Bootstrap context with all services
 */
export function bootstrap(options: BootstrapOptionsWithHooks = {}): BootstrapContext {
  const {
    debug = false,
    enableSecurity = true,
    securityConfig,
    middleware = [],
    credentials,
    hooks
  } = options;

  const log = (message: string) => {
    if (debug) console.log(`[Bootstrap] ${message}`);
  };

  try {
    // Call before hook
    hooks?.onBeforeBootstrap?.();

    log('Starting bootstrap...');

    // Phase 1: Create core infrastructure
    log('Phase 1: Creating core infrastructure...');
    const core = createCoreServices({ debug });

    // Register core services in container
    core.container.registerSingleton(SERVICE_NAMES.CONTAINER, () => core.container);
    core.container.registerSingleton(SERVICE_NAMES.EVENT_BUS, () => core.eventBus);
    core.container.registerSingleton(SERVICE_NAMES.MESSAGE_ROUTER, () => core.messageRouter);

    // Call core services hook
    hooks?.onCoreServicesCreated?.(core);

    // Phase 2: Add security middleware
    if (enableSecurity) {
      log('Phase 2: Adding security middleware...');
      const securityMw = securityConfig
        ? createSecurityMiddleware({
            debug,
            ...securityConfig
          })
        : defaultSecurityMiddleware;
      core.messageRouter.use(securityMw);
    }

    // Add custom middleware
    for (const mw of middleware) {
      core.messageRouter.use(mw);
    }

    // Phase 3: Create services
    log('Phase 3: Creating services...');
    const factory = createServiceFactory({
      debug,
      container: core.container,
      eventBus: core.eventBus
    });

    const { managers, ankiServices, handlers } = factory.createAll({
      credentialExpiryMs: credentials?.defaultExpiryMs
    });

    // Partial context for hooks
    const partialContext = {
      ...core,
      ...managers,
      ...ankiServices,
      ...handlers
    };

    // Call services created hook
    hooks?.onServicesCreated?.(partialContext);

    // Phase 4: Register handlers
    log('Phase 4: Registering handlers...');
    const registry = createHandlerRegistry({
      debug,
      messageRouter: core.messageRouter
    });
    registry.registerDefaults(handlers);

    // Phase 5: Wire events
    log('Phase 5: Wiring events...');
    const wiring = createEventWiring({
      debug,
      eventBus: core.eventBus
    });

    // Complete context
    const context: BootstrapContext = {
      container: core.container,
      eventBus: core.eventBus,
      messageRouter: core.messageRouter,
      optionsManager: managers.optionsManager,
      credentialManager: managers.credentialManager,
      ankiConnectService: ankiServices.ankiConnectService,
      ankiWebService: ankiServices.ankiWebService,
      noteFormatterService: ankiServices.noteFormatterService,
      optionsHandler: handlers.optionsHandler,
      dictionaryHandler: handlers.dictionaryHandler,
      audioHandler: handlers.audioHandler
    };

    // Wire events with full context
    wiring.wireDefaults(context);

    // Call handlers registered hook
    hooks?.onHandlersRegistered?.(context);

    // Emit bootstrap complete
    wiring.emitBootstrapComplete(context);

    // Call complete hook
    hooks?.onBootstrapComplete?.(context);

    log('Bootstrap complete!');

    if (debug) {
      logBootstrapSummary(context, registry);
    }

    return context;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    hooks?.onBootstrapError?.(err);
    throw err;
  }
}

/**
 * Create core infrastructure services
 */
function createCoreServices(options: { debug: boolean }): CoreServices {
  const { debug } = options;

  const container = createContainer({ debug });
  const eventBus = createEventBus({ debug, catchErrors: true });
  const messageRouter = createMessageRouter({ debug, throwOnUnknown: false });

  return { container, eventBus, messageRouter };
}

/**
 * Log bootstrap summary
 */
function logBootstrapSummary(_context: BootstrapContext, registry: HandlerRegistry): void {
  console.log('[Bootstrap] Summary:');
  console.log('  Services:');
  console.log('    - Container');
  console.log('    - EventBus');
  console.log('    - MessageRouter');
  console.log('    - OptionsManager');
  console.log('    - CredentialManager');
  console.log('    - AnkiConnectService');
  console.log('    - AnkiWebService');
  console.log('    - NoteFormatterService');
  console.log('  Handlers:');
  for (const reg of registry.getAllRegistrations()) {
    console.log(`    - ${reg.action}: ${reg.description ?? 'No description'}`);
  }
}

/**
 * Async bootstrap with initialization
 * Loads options before returning context
 */
export async function bootstrapAsync(
  options: BootstrapOptionsWithHooks = {}
): Promise<BootstrapContext> {
  const context = bootstrap(options);

  // Load options from storage
  await context.optionsManager.load();

  return context;
}

// ============================================================================
// Global Context Management
// ============================================================================

let globalContext: BootstrapContext | null = null;

/**
 * Get the global bootstrap context
 */
export function getBootstrapContext(): BootstrapContext | null {
  return globalContext;
}

/**
 * Set the global bootstrap context
 */
export function setBootstrapContext(context: BootstrapContext): void {
  globalContext = context;
}

/**
 * Clear the global bootstrap context
 */
export function clearBootstrapContext(): void {
  globalContext = null;
}

/**
 * Initialize and set global context
 */
export function initializeGlobalContext(
  options: BootstrapOptionsWithHooks = {}
): BootstrapContext {
  const context = bootstrap(options);
  setBootstrapContext(context);
  return context;
}

/**
 * Initialize and set global context (async)
 */
export async function initializeGlobalContextAsync(
  options: BootstrapOptionsWithHooks = {}
): Promise<BootstrapContext> {
  const context = await bootstrapAsync(options);
  setBootstrapContext(context);
  return context;
}
