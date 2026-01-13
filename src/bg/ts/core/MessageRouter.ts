/**
 * Message Router
 * Routes messages to appropriate handlers based on action type
 * Implements the IMessageRouter interface for decoupled message handling
 */

import {
  IMessageHandler,
  IMessageRouter,
  Message,
  MessageResponse,
  MessageSender,
  isMessageHandler
} from '../interfaces/IMessageHandler';

/**
 * Middleware function type for processing messages before handling
 */
export type MessageMiddleware = (
  message: Message,
  sender: MessageSender,
  next: () => Promise<MessageResponse>
) => Promise<MessageResponse>;

/**
 * Message router configuration options
 */
export interface MessageRouterOptions {
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Whether to throw on unknown actions (default: true) */
  throwOnUnknown?: boolean;
  /** Default response for unknown actions when throwOnUnknown is false */
  defaultResponse?: MessageResponse;
}

/**
 * Error thrown when no handler is registered for an action
 */
export class UnknownActionError extends Error {
  constructor(public readonly action: string) {
    super(`No handler registered for action '${action}'`);
    this.name = 'UnknownActionError';
  }
}

/**
 * Error thrown when trying to register a duplicate handler
 */
export class DuplicateHandlerError extends Error {
  constructor(public readonly action: string) {
    super(`Handler already registered for action '${action}'`);
    this.name = 'DuplicateHandlerError';
  }
}

/**
 * Error thrown when an invalid handler is provided
 */
export class InvalidHandlerError extends Error {
  constructor(public readonly action: string) {
    super(`Invalid handler provided for action '${action}'`);
    this.name = 'InvalidHandlerError';
  }
}

/**
 * Message Router
 * Central routing mechanism for extension messages
 */
export class MessageRouter implements IMessageRouter {
  private readonly handlers = new Map<string, IMessageHandler>();
  private readonly middleware: MessageMiddleware[] = [];
  private readonly options: Required<MessageRouterOptions>;

  constructor(options: MessageRouterOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
      throwOnUnknown: options.throwOnUnknown ?? true,
      defaultResponse: options.defaultResponse ?? {
        success: false,
        error: 'Unknown action'
      }
    };
  }

  /**
   * Register a handler for a specific action
   * @param action - The action string
   * @param handler - The handler to register
   * @throws DuplicateHandlerError if handler already exists for action
   * @throws InvalidHandlerError if handler doesn't implement IMessageHandler
   */
  register(action: string, handler: IMessageHandler): void {
    if (this.handlers.has(action)) {
      throw new DuplicateHandlerError(action);
    }

    if (!isMessageHandler(handler)) {
      throw new InvalidHandlerError(action);
    }

    this.handlers.set(action, handler);
    this.log(`Registered handler for action '${action}'`);
  }

  /**
   * Register multiple handlers at once
   * @param handlers - Map of action to handler
   */
  registerAll(handlers: Record<string, IMessageHandler>): void {
    for (const [action, handler] of Object.entries(handlers)) {
      this.register(action, handler);
    }
  }

  /**
   * Unregister a handler for a specific action
   * @param action - The action string
   * @returns true if handler was removed
   */
  unregister(action: string): boolean {
    const removed = this.handlers.delete(action);
    if (removed) {
      this.log(`Unregistered handler for action '${action}'`);
    }
    return removed;
  }

  /**
   * Check if a handler is registered for an action
   * @param action - The action string
   * @returns true if a handler is registered
   */
  hasHandler(action: string): boolean {
    return this.handlers.has(action);
  }

  /**
   * Get all registered action names
   * @returns Array of action names
   */
  getRegisteredActions(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Add middleware to the processing pipeline
   * Middleware is executed in order of addition
   * @param middleware - The middleware function
   */
  use(middleware: MessageMiddleware): void {
    this.middleware.push(middleware);
    this.log(`Added middleware (total: ${this.middleware.length})`);
  }

  /**
   * Route a message to the appropriate handler
   * @param message - The message to route
   * @param sender - Information about the sender
   * @returns Promise resolving to the response
   */
  async route<T>(message: Message, sender: MessageSender): Promise<MessageResponse<T>> {
    const { action } = message;

    this.log(`Routing message: ${action}`);

    // Build the handler chain with middleware
    const handler = this.handlers.get(action);

    if (!handler) {
      this.log(`No handler for action '${action}'`);
      if (this.options.throwOnUnknown) {
        throw new UnknownActionError(action);
      }
      return this.options.defaultResponse as MessageResponse<T>;
    }

    // Create the final handler function
    const finalHandler = async (): Promise<MessageResponse<T>> => {
      try {
        const result = await handler.handle(message.params, sender);
        return {
          success: true,
          data: result as T
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`Handler error for '${action}': ${errorMessage}`);
        return {
          success: false,
          error: errorMessage
        };
      }
    };

    // Execute middleware chain
    if (this.middleware.length === 0) {
      return finalHandler();
    }

    return this.executeMiddlewareChain(message, sender, finalHandler, 0);
  }

  /**
   * Execute the middleware chain recursively
   */
  private async executeMiddlewareChain<T>(
    message: Message,
    sender: MessageSender,
    finalHandler: () => Promise<MessageResponse<T>>,
    index: number
  ): Promise<MessageResponse<T>> {
    if (index >= this.middleware.length) {
      return finalHandler();
    }

    const currentMiddleware = this.middleware[index];
    if (!currentMiddleware) {
      return finalHandler();
    }
    return currentMiddleware(
      message,
      sender,
      () => this.executeMiddlewareChain(message, sender, finalHandler, index + 1)
    ) as Promise<MessageResponse<T>>;
  }

  /**
   * Clear all handlers and middleware
   */
  clear(): void {
    this.handlers.clear();
    this.middleware.length = 0;
    this.log('Router cleared');
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[MessageRouter] ${message}`);
    }
  }
}

/**
 * Create a new MessageRouter instance
 * @param options - Configuration options
 * @returns New MessageRouter instance
 */
export function createMessageRouter(options?: MessageRouterOptions): MessageRouter {
  return new MessageRouter(options);
}

/**
 * Simple handler wrapper for creating handlers from functions
 * @param action - The action this handler responds to
 * @param handleFn - The handler function
 * @returns IMessageHandler implementation
 */
export function createHandler<TParams = unknown, TResponse = unknown>(
  action: string,
  handleFn: (params: TParams, sender: MessageSender) => Promise<TResponse>
): IMessageHandler<TParams, TResponse> {
  return {
    handle: handleFn,
    canHandle: (a: string) => a === action
  };
}

/**
 * Create logging middleware
 * @param logger - Optional custom logger function
 * @returns Middleware that logs all messages
 */
export function createLoggingMiddleware(
  logger: (message: string) => void = console.log
): MessageMiddleware {
  return async (message, sender, next) => {
    const start = Date.now();
    logger(`[${message.action}] Request from ${sender.url || 'unknown'}`);

    const response = await next();

    const duration = Date.now() - start;
    logger(`[${message.action}] Response: ${response.success ? 'success' : 'error'} (${duration}ms)`);

    return response;
  };
}

/**
 * Create validation middleware using a validator function
 * @param validator - Function to validate messages
 * @returns Middleware that validates all messages
 */
export function createValidationMiddleware(
  validator: (message: Message, sender: MessageSender) => boolean | string
): MessageMiddleware {
  return async (message, sender, next) => {
    const validationResult = validator(message, sender);

    if (validationResult === true) {
      return next();
    }

    const errorMessage = typeof validationResult === 'string'
      ? validationResult
      : 'Message validation failed';

    return {
      success: false,
      error: errorMessage
    };
  };
}

/**
 * Create rate limiting middleware
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 * @returns Middleware that rate limits requests
 */
export function createRateLimitMiddleware(
  maxRequests: number,
  windowMs: number
): MessageMiddleware {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (_message, sender, next) => {
    const key = sender.tabId?.toString() || sender.extensionId || 'unknown';
    const now = Date.now();

    let record = requests.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(key, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      return {
        success: false,
        error: 'Rate limit exceeded'
      };
    }

    return next();
  };
}
