/**
 * Message Handler Interface
 * Defines the contract for handling extension messages
 */

/**
 * Message sender information
 */
export interface MessageSender {
  /** Tab ID if message came from a content script */
  tabId?: number;
  /** Frame ID within the tab */
  frameId?: number;
  /** Extension ID if message came from another extension */
  extensionId?: string;
  /** URL of the sender */
  url?: string;
  /** Origin of the sender */
  origin?: string;
}

/**
 * Base message structure
 */
export interface Message<T = unknown> {
  /** Action/type of the message */
  action: string;
  /** Message parameters */
  params?: T;
  /** Target component (e.g., 'serviceworker', 'background') */
  target?: string;
  /** Callback ID for async responses */
  callbackId?: string;
}

/**
 * Message response structure
 */
export interface MessageResponse<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
}

/**
 * Message handler interface
 * Follows the Single Responsibility Principle - handles one type of message
 */
export interface IMessageHandler<TParams = unknown, TResponse = unknown> {
  /**
   * Handle the message
   * @param params - Message parameters
   * @param sender - Information about the sender
   * @returns Promise resolving to the response
   */
  handle(params: TParams, sender: MessageSender): Promise<TResponse>;

  /**
   * Check if this handler can handle a given action
   * @param action - The action string
   * @returns true if this handler can handle the action
   */
  canHandle(action: string): boolean;
}

/**
 * Message router interface
 * Routes messages to appropriate handlers
 */
export interface IMessageRouter {
  /**
   * Register a handler for a specific action
   * @param action - The action string
   * @param handler - The handler to register
   */
  register(action: string, handler: IMessageHandler): void;

  /**
   * Unregister a handler for a specific action
   * @param action - The action string
   */
  unregister(action: string): void;

  /**
   * Route a message to the appropriate handler
   * @param message - The message to route
   * @param sender - Information about the sender
   * @returns Promise resolving to the response
   */
  route<T>(message: Message, sender: MessageSender): Promise<MessageResponse<T>>;

  /**
   * Check if a handler is registered for an action
   * @param action - The action string
   * @returns true if a handler is registered
   */
  hasHandler(action: string): boolean;
}

/**
 * Message types for type-safe message handling
 */
export type MessageType =
  | 'getTranslation'
  | 'addNote'
  | 'playAudio'
  | 'isConnected'
  | 'getDeckNames'
  | 'getModelNames'
  | 'getModelFieldNames'
  | 'getVersion'
  | 'optionsChanged'
  | 'loadScript'
  | 'findTerm'
  | 'setScriptsOptions'
  | 'Fetch'
  | 'Deinflect'
  | 'getBuiltin'
  | 'getLocale';

/**
 * Type guard to check if an object implements IMessageHandler
 */
export function isMessageHandler(obj: unknown): obj is IMessageHandler {
  if (!obj || typeof obj !== 'object') return false;
  const handler = obj as IMessageHandler;
  return (
    typeof handler.handle === 'function' &&
    typeof handler.canHandle === 'function'
  );
}
