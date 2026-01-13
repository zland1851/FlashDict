/**
 * Handler Registry
 * Registers message handlers with the message router
 *
 * Single Responsibility: Only registers handlers
 * Open/Closed: New handlers can be added without modifying existing code
 */

import { MessageRouter } from '../core/MessageRouter';
import { IMessageHandler } from '../interfaces/IMessageHandler';
import { MESSAGE_ACTIONS } from './constants';
import type { MessageHandlers, HandlerRegistryConfig } from './types';

/**
 * Handler registration entry
 */
interface HandlerRegistration {
  action: string;
  handler: IMessageHandler;
  description?: string;
}

/**
 * Handler Registry
 * Manages registration of message handlers with the router
 */
export class HandlerRegistry {
  private readonly router: MessageRouter;
  private readonly debug: boolean;
  private readonly registrations: HandlerRegistration[] = [];

  constructor(config: HandlerRegistryConfig) {
    this.router = config.messageRouter;
    this.debug = config.debug ?? false;
  }

  /**
   * Register a single handler for an action
   */
  register(action: string, handler: IMessageHandler, description?: string): this {
    this.router.register(action, handler);
    this.registrations.push({ action, handler, description });
    this.log(`Registered handler for '${action}'${description ? `: ${description}` : ''}`);
    return this;
  }

  /**
   * Register multiple handlers at once
   */
  registerAll(handlers: Array<{ action: string; handler: IMessageHandler; description?: string }>): this {
    for (const { action, handler, description } of handlers) {
      this.register(action, handler, description);
    }
    return this;
  }

  /**
   * Register default handlers from MessageHandlers
   */
  registerDefaults(handlers: MessageHandlers): this {
    this.log('Registering default handlers...');

    // Options handlers
    this.register(
      MESSAGE_ACTIONS.OPTIONS_CHANGED,
      handlers.optionsHandler,
      'Options change handler'
    );

    // Dictionary/Translation handlers
    this.register(
      MESSAGE_ACTIONS.FIND_TERM,
      handlers.dictionaryHandler,
      'Dictionary term lookup'
    );
    this.register(
      MESSAGE_ACTIONS.GET_TRANSLATION,
      handlers.dictionaryHandler,
      'Translation request'
    );

    // Audio handler
    this.register(
      MESSAGE_ACTIONS.PLAY_AUDIO,
      handlers.audioHandler,
      'Audio playback'
    );

    this.log(`Registered ${this.registrations.length} default handlers`);
    return this;
  }

  /**
   * Unregister a handler
   */
  unregister(action: string): boolean {
    const index = this.registrations.findIndex(r => r.action === action);
    if (index !== -1) {
      this.router.unregister(action);
      this.registrations.splice(index, 1);
      this.log(`Unregistered handler for '${action}'`);
      return true;
    }
    return false;
  }

  /**
   * Check if an action has a registered handler
   */
  hasHandler(action: string): boolean {
    return this.router.hasHandler(action);
  }

  /**
   * Get all registered actions
   */
  getRegisteredActions(): string[] {
    return this.registrations.map(r => r.action);
  }

  /**
   * Get registration info for an action
   */
  getRegistration(action: string): HandlerRegistration | undefined {
    return this.registrations.find(r => r.action === action);
  }

  /**
   * Get all registrations
   */
  getAllRegistrations(): ReadonlyArray<HandlerRegistration> {
    return [...this.registrations];
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    for (const { action } of this.registrations) {
      this.router.unregister(action);
    }
    this.registrations.length = 0;
    this.log('Cleared all handler registrations');
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[HandlerRegistry] ${message}`);
    }
  }
}

/**
 * Create a handler registry instance
 */
export function createHandlerRegistry(config: HandlerRegistryConfig): HandlerRegistry {
  return new HandlerRegistry(config);
}
