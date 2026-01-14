/**
 * Event Wiring
 * Sets up event subscriptions between services
 *
 * Single Responsibility: Only handles event wiring
 * Dependency Inversion: Works with event bus abstraction
 */

import { EventBus } from '../core/EventBus';
import { OptionsManager } from '../managers/OptionsManager';
import { EVENTS } from './constants';
import type { EventWiringConfig, BootstrapContext } from './types';

/**
 * Event subscription entry
 */
interface EventSubscription {
  event: string;
  description: string;
  unsubscribe: () => void;
}

/**
 * Event Wiring
 * Manages event subscriptions between services
 */
export class EventWiring {
  private readonly eventBus: EventBus;
  private readonly debug: boolean;
  private readonly subscriptions: EventSubscription[] = [];

  constructor(config: EventWiringConfig) {
    this.eventBus = config.eventBus;
    this.debug = config.debug ?? false;
  }

  /**
   * Wire options manager events
   */
  wireOptionsManager(optionsManager: OptionsManager): this {
    this.log('Wiring OptionsManager events...');

    // Subscribe to options changes and emit to event bus
    const unsubscribe = optionsManager.subscribe((event) => {
      this.eventBus.emit(EVENTS.OPTIONS_CHANGED, event);
      this.log(`Options changed: ${event.changedKeys.join(', ')}`);
    });

    this.subscriptions.push({
      event: EVENTS.OPTIONS_CHANGED,
      description: 'OptionsManager change -> EventBus',
      unsubscribe
    });

    return this;
  }

  /**
   * Wire Anki service events
   */
  wireAnkiEvents(_context: Pick<BootstrapContext, 'ankiConnectService' | 'ankiWebService'>): this {
    this.log('Wiring Anki service events...');

    // Note: AnkiConnectService and AnkiWebService don't currently have
    // event emitters. This is a placeholder for future implementation.
    // When services emit events, wire them here.

    // Example of how this would work:
    // const unsubscribe = ankiConnectService.on('connected', () => {
    //   this.eventBus.emit(EVENTS.ANKI_CONNECTED, { service: 'ankiconnect' });
    // });

    return this;
  }

  /**
   * Wire all default events
   */
  wireDefaults(context: BootstrapContext): this {
    this.wireOptionsManager(context.optionsManager);
    this.wireAnkiEvents(context);

    this.log(`Wired ${this.subscriptions.length} event subscriptions`);
    return this;
  }

  /**
   * Add custom event listener
   */
  on<T>(event: string, handler: (data: T) => void, description?: string): this {
    const unsubscribe = this.eventBus.on(event, handler);

    this.subscriptions.push({
      event,
      description: description ?? `Custom handler for ${event}`,
      unsubscribe
    });

    this.log(`Added listener for '${event}'`);
    return this;
  }

  /**
   * Add one-time event listener
   */
  once<T>(event: string, handler: (data: T) => void, description?: string): this {
    const unsubscribe = this.eventBus.once(event, handler);

    this.subscriptions.push({
      event,
      description: description ?? `One-time handler for ${event}`,
      unsubscribe
    });

    this.log(`Added one-time listener for '${event}'`);
    return this;
  }

  /**
   * Emit an event
   */
  emit<T>(event: string, data?: T): void {
    this.eventBus.emit(event, data);
  }

  /**
   * Emit bootstrap started event
   */
  emitBootstrapStarted(): void {
    this.emit(EVENTS.BOOTSTRAP_STARTED, { timestamp: Date.now() });
    this.log('Emitted bootstrap started event');
  }

  /**
   * Emit bootstrap complete event
   */
  emitBootstrapComplete(context: BootstrapContext): void {
    this.emit(EVENTS.BOOTSTRAP_COMPLETE, {
      timestamp: Date.now(),
      services: Object.keys(context).length
    });
    this.log('Emitted bootstrap complete event');
  }

  /**
   * Emit bootstrap error event
   */
  emitBootstrapError(error: Error): void {
    this.emit(EVENTS.BOOTSTRAP_ERROR, {
      timestamp: Date.now(),
      error: error.message
    });
    this.log(`Emitted bootstrap error event: ${error.message}`);
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): ReadonlyArray<EventSubscription> {
    return [...this.subscriptions];
  }

  /**
   * Unsubscribe all
   */
  dispose(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.length = 0;
    this.log('Disposed all event subscriptions');
  }

  /**
   * Log debug message
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[EventWiring] ${message}`);
    }
  }
}

/**
 * Create an event wiring instance
 */
export function createEventWiring(config: EventWiringConfig): EventWiring {
  return new EventWiring(config);
}
