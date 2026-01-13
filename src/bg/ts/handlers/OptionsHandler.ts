/**
 * Options Handler
 * Handles options-related messages and routes them to appropriate methods
 * Implements IMessageHandler for MessageRouter system
 */

import {
  IMessageHandler,
  MessageSender
} from '../interfaces/IMessageHandler';
import {
  IOptionsStore,
  ExtensionOptions,
  PartialOptions
} from '../interfaces/IOptionsStore';

/**
 * Options handler messages
 */
export interface OptionsHandlerParams {
  options?: Partial<ExtensionOptions>;
  forceLogout?: boolean;
  modelName?: string;
}

/**
 * Options Handler
 * Handles all options-related messages from popup and options pages
 */
export class OptionsHandler implements IMessageHandler<OptionsHandlerParams, ExtensionOptions | { success: boolean }> {
  constructor(private readonly optionsStore: IOptionsStore) {}

  /**
   * Handle options-related messages
   * @param params - Message parameters
   * @param _sender - Message sender information
   * @returns Promise resolving to response
   */
  async handle(params: OptionsHandlerParams, _sender: MessageSender): Promise<ExtensionOptions | { success: boolean }> {
    if (!params) {
      throw new Error('Invalid params: params is required');
    }

    // Handle options change
    if (params.options) {
      await this.optionsStore.update(params.options as PartialOptions);
      const current = this.optionsStore.getCurrent();
      if (!current) {
        throw new Error('Options not loaded');
      }
      return current;
    }

    // Handle force logout
    if (params.forceLogout !== undefined) {
      const current = this.optionsStore.getCurrent();
      if (current) {
        await this.optionsStore.save(current);
      }
      return { success: true };
    }

    // Default: return current options
    const current = this.optionsStore.getCurrent();
    if (!current) {
      throw new Error('Options not loaded yet');
    }
    return current;
  }

  /**
   * Check if this handler can handle action
   * @param action - The action string
   * @returns true if this handler can handle
   */
  canHandle(action: string): boolean {
    const handledActions = [
      'opt_optionsChanged'
    ];
    return handledActions.includes(action);
  }
}

/**
 * Create options handler for message router
 * @param optionsStore - Options store instance
 * @returns OptionsHandler instance
 */
export function createOptionsHandler(optionsStore: IOptionsStore): OptionsHandler {
  return new OptionsHandler(optionsStore);
}
