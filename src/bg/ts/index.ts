/**
 * Background TypeScript Entry Point
 * Main export for TypeScript backend architecture
 */

// Export core infrastructure
export * from './core/Container';
export { EventBus, createEventBus, type TypedEventBus } from './core/EventBus';
export * from './core/MessageRouter';

// Export interfaces
export * from './interfaces';

// Export services
export * from './services';

// Export managers
export * from './managers/OptionsManager';

// Export handlers
export * from './handlers';

// Export utilities
export * from './utils/deinflector';
export * from './utils/builtin';

// Export security
export * from './security';

// Export bootstrap
export * from './bootstrap';
