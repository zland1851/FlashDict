/**
 * Event Bus
 * Implements the publish/subscribe pattern for loose coupling between components
 * Supports typed events, async handlers, and event namespacing
 */

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Async event handler function type
 */
export type AsyncEventHandler<T = unknown> = (data: T) => Promise<void>;

/**
 * Event subscription options
 */
export interface SubscriptionOptions {
  /** Only fire once, then automatically unsubscribe */
  once?: boolean;
  /** Priority (higher = called first, default = 0) */
  priority?: number;
}

/**
 * Internal event handler entry
 */
interface HandlerEntry<T = unknown> {
  handler: EventHandler<T>;
  options: Required<SubscriptionOptions>;
  id: number;
}

/**
 * Unsubscribe function returned by subscribe
 */
export type Unsubscribe = () => void;

/**
 * Event bus configuration options
 */
export interface EventBusOptions {
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Maximum number of handlers per event (0 = unlimited) */
  maxHandlers?: number;
  /** Whether to catch and log handler errors instead of throwing */
  catchErrors?: boolean;
}

/**
 * Error thrown when max handlers exceeded
 */
export class MaxHandlersExceededError extends Error {
  constructor(public readonly eventName: string, public readonly maxHandlers: number) {
    super(`Maximum handlers (${maxHandlers}) exceeded for event '${eventName}'`);
    this.name = 'MaxHandlersExceededError';
  }
}

/**
 * Event Bus
 * Central event dispatcher for decoupled communication
 */
export class EventBus {
  private readonly handlers = new Map<string, HandlerEntry[]>();
  private readonly options: Required<EventBusOptions>;
  private nextHandlerId = 1;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
      maxHandlers: options.maxHandlers ?? 0,
      catchErrors: options.catchErrors ?? true
    };
  }

  /**
   * Subscribe to an event
   * @param eventName - Name of the event to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on<T = unknown>(
    eventName: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): Unsubscribe {
    const fullOptions: Required<SubscriptionOptions> = {
      once: options.once ?? false,
      priority: options.priority ?? 0
    };

    let eventHandlers = this.handlers.get(eventName);

    if (!eventHandlers) {
      eventHandlers = [];
      this.handlers.set(eventName, eventHandlers);
    }

    // Check max handlers
    if (this.options.maxHandlers > 0 && eventHandlers.length >= this.options.maxHandlers) {
      throw new MaxHandlersExceededError(eventName, this.options.maxHandlers);
    }

    const entry: HandlerEntry = {
      handler: handler as EventHandler<unknown>,
      options: fullOptions,
      id: this.nextHandlerId++
    };

    // Insert in priority order (higher priority first)
    const insertIndex = eventHandlers.findIndex(h => h.options.priority < fullOptions.priority);
    if (insertIndex === -1) {
      eventHandlers.push(entry);
    } else {
      eventHandlers.splice(insertIndex, 0, entry);
    }

    this.log(`Subscribed to '${eventName}' (id: ${entry.id}, priority: ${fullOptions.priority})`);

    // Return unsubscribe function
    return () => this.off(eventName, entry.id);
  }

  /**
   * Subscribe to an event (only fires once)
   * @param eventName - Name of the event
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  once<T = unknown>(eventName: string, handler: EventHandler<T>): Unsubscribe {
    return this.on(eventName, handler, { once: true });
  }

  /**
   * Unsubscribe from an event by handler ID
   * @param eventName - Name of the event
   * @param handlerId - ID of the handler to remove
   * @returns true if handler was removed
   */
  private off(eventName: string, handlerId: number): boolean {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers) return false;

    const index = eventHandlers.findIndex(h => h.id === handlerId);
    if (index === -1) return false;

    eventHandlers.splice(index, 1);

    // Clean up empty handler arrays
    if (eventHandlers.length === 0) {
      this.handlers.delete(eventName);
    }

    this.log(`Unsubscribed from '${eventName}' (id: ${handlerId})`);
    return true;
  }

  /**
   * Emit an event synchronously
   * @param eventName - Name of the event to emit
   * @param data - Data to pass to handlers
   */
  emit<T = unknown>(eventName: string, data?: T): void {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers || eventHandlers.length === 0) {
      this.log(`No handlers for event '${eventName}'`);
      return;
    }

    this.log(`Emitting '${eventName}' to ${eventHandlers.length} handler(s)`);

    // Create a copy to allow modifications during iteration
    const handlersToCall = [...eventHandlers];
    const handlersToRemove: number[] = [];

    for (const entry of handlersToCall) {
      try {
        entry.handler(data);

        if (entry.options.once) {
          handlersToRemove.push(entry.id);
        }
      } catch (error) {
        if (this.options.catchErrors) {
          console.error(`Error in handler for event '${eventName}':`, error);
        } else {
          throw error;
        }
      }
    }

    // Remove one-time handlers
    for (const id of handlersToRemove) {
      this.off(eventName, id);
    }
  }

  /**
   * Emit an event and wait for all async handlers to complete
   * @param eventName - Name of the event to emit
   * @param data - Data to pass to handlers
   * @returns Promise that resolves when all handlers complete
   */
  async emitAsync<T = unknown>(eventName: string, data?: T): Promise<void> {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers || eventHandlers.length === 0) {
      this.log(`No handlers for event '${eventName}'`);
      return;
    }

    this.log(`Emitting '${eventName}' async to ${eventHandlers.length} handler(s)`);

    const handlersToCall = [...eventHandlers];
    const handlersToRemove: number[] = [];
    const promises: Promise<void>[] = [];

    for (const entry of handlersToCall) {
      const promise = (async () => {
        try {
          await entry.handler(data);

          if (entry.options.once) {
            handlersToRemove.push(entry.id);
          }
        } catch (error) {
          if (this.options.catchErrors) {
            console.error(`Error in async handler for event '${eventName}':`, error);
          } else {
            throw error;
          }
        }
      })();

      promises.push(promise);
    }

    await Promise.all(promises);

    // Remove one-time handlers
    for (const id of handlersToRemove) {
      this.off(eventName, id);
    }
  }

  /**
   * Check if an event has any subscribers
   * @param eventName - Name of the event
   * @returns true if event has subscribers
   */
  hasSubscribers(eventName: string): boolean {
    const handlers = this.handlers.get(eventName);
    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * Get the number of subscribers for an event
   * @param eventName - Name of the event
   * @returns Number of subscribers
   */
  subscriberCount(eventName: string): number {
    return this.handlers.get(eventName)?.length ?? 0;
  }

  /**
   * Get all event names with subscribers
   * @returns Array of event names
   */
  getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Remove all subscribers for a specific event
   * @param eventName - Name of the event to clear
   */
  clearEvent(eventName: string): void {
    this.handlers.delete(eventName);
    this.log(`Cleared all handlers for '${eventName}'`);
  }

  /**
   * Remove all subscribers for all events
   */
  clear(): void {
    this.handlers.clear();
    this.log('Cleared all event handlers');
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[EventBus] ${message}`);
    }
  }
}

/**
 * Create a new EventBus instance
 * @param options - Configuration options
 * @returns New EventBus instance
 */
export function createEventBus(options?: EventBusOptions): EventBus {
  return new EventBus(options);
}

/**
 * Global event bus instance (optional - for convenience)
 */
let globalEventBus: EventBus | null = null;

/**
 * Get or create the global event bus instance
 * @returns Global event bus
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * Set the global event bus instance
 * @param eventBus - Event bus to set as global
 */
export function setGlobalEventBus(eventBus: EventBus): void {
  globalEventBus = eventBus;
}

/**
 * Reset the global event bus
 */
export function resetGlobalEventBus(): void {
  globalEventBus?.clear();
  globalEventBus = null;
}

/**
 * Typed event definitions for the ODH extension
 * Use these for type-safe event handling
 */
export interface ODHEvents {
  'options:changed': { oldOptions: unknown; newOptions: unknown };
  'options:loaded': { options: unknown };
  'translation:requested': { expression: string };
  'translation:completed': { expression: string; result: unknown };
  'note:added': { noteId: number };
  'note:failed': { error: string };
  'dictionary:loaded': { name: string };
  'dictionary:selected': { name: string };
  'anki:connected': { version: string };
  'anki:disconnected': void;
}

/**
 * Type-safe event bus wrapper
 * Provides compile-time type checking for event data
 */
export class TypedEventBus<TEvents extends Record<string, unknown>> {
  private readonly bus: EventBus;

  constructor(options?: EventBusOptions) {
    this.bus = new EventBus(options);
  }

  on<K extends keyof TEvents & string>(
    eventName: K,
    handler: EventHandler<TEvents[K]>,
    options?: SubscriptionOptions
  ): Unsubscribe {
    return this.bus.on(eventName, handler as EventHandler<unknown>, options);
  }

  once<K extends keyof TEvents & string>(
    eventName: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    return this.bus.once(eventName, handler as EventHandler<unknown>);
  }

  emit<K extends keyof TEvents & string>(eventName: K, data: TEvents[K]): void {
    this.bus.emit(eventName, data);
  }

  async emitAsync<K extends keyof TEvents & string>(eventName: K, data: TEvents[K]): Promise<void> {
    return this.bus.emitAsync(eventName, data);
  }

  hasSubscribers<K extends keyof TEvents & string>(eventName: K): boolean {
    return this.bus.hasSubscribers(eventName);
  }

  clear(): void {
    this.bus.clear();
  }
}
