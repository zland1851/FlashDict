/**
 * Dictionary Handler
 * Handles dictionary-related messages for lookups and term finding
 * Implements IMessageHandler for MessageRouter system
 */

import {
  IMessageHandler,
  MessageSender
} from '../interfaces/IMessageHandler';
import {
  IDictionary,
  DictionaryDefinition
} from '../interfaces/IDictionary';

/**
 * Dictionary handler messages
 */
export interface DictionaryHandlerParams {
  dict?: string;
  word?: string;
  expression?: string;
  callbackId?: string;
}

/**
 * Dictionary Handler
 * Handles dictionary lookup and term finding messages
 */
export class DictionaryHandler implements IMessageHandler<DictionaryHandlerParams, DictionaryDefinition | null | string> {
  constructor(private readonly dictionaries: Map<string, IDictionary>) {}

  /**
   * Handle dictionary-related messages
   * @param params - Message parameters
   * @param _sender - Message sender information
   * @returns Promise resolving to response
   */
  async handle(
    params: DictionaryHandlerParams,
    _sender: MessageSender
  ): Promise<DictionaryDefinition | null | string> {
    if (!params) {
      throw new Error('Invalid params: params is required');
    }

    // Handle term lookup
    if (params.dict && params.word) {
      const dict = this.dictionaries.get(params.dict);
      if (!dict) {
        console.warn(`Dictionary not found: ${params.dict}`);
        return null;
      }
      return dict.findTerm(params.word);
    }

    // Handle expression lookup (same as word lookup)
    if (params.expression) {
      // Try to find in all dictionaries or selected one
      const dictNames = Array.from(this.dictionaries.keys());
      const dictName = params.dict ?? dictNames[0];
      if (!dictName) {
        throw new Error('No dictionaries available');
      }
      const dict = this.dictionaries.get(dictName);
      if (!dict) {
        return null;
      }
      return dict.findTerm(params.expression);
    }

    throw new Error('Invalid params: dict+word or expression is required');
  }

  /**
   * Check if this handler can handle action
   * @param action - The action string
   * @returns true if this handler can handle
   */
  canHandle(action: string): boolean {
    const handledActions = [
      'findTerm',
      'getTranslation'
    ];
    return handledActions.includes(action);
  }

  /**
   * Add a dictionary to the handler
   * @param name - Dictionary name
   * @param dict - Dictionary implementation
   */
  addDictionary(name: string, dict: IDictionary): void {
    this.dictionaries.set(name, dict);
  }

  /**
   * Remove a dictionary from the handler
   * @param name - Dictionary name
   * @returns true if dictionary was removed
   */
  removeDictionary(name: string): boolean {
    return this.dictionaries.delete(name);
  }

  /**
   * Get all loaded dictionaries
   * @returns Map of dictionary name to instance
   */
  getDictionaries(): Map<string, IDictionary> {
    return new Map(this.dictionaries);
  }

  /**
   * Get a specific dictionary
   * @param name - Dictionary name
   * @returns Dictionary or undefined
   */
  getDictionary(name: string): IDictionary | undefined {
    return this.dictionaries.get(name);
  }

  /**
   * Get all available dictionary names
   * @returns Array of dictionary names
   */
  getDictionaryNames(): string[] {
    return Array.from(this.dictionaries.keys());
  }

  /**
   * Check if a dictionary is loaded
   * @param name - Dictionary name
   * @returns true if loaded
   */
  hasDictionary(name: string): boolean {
    return this.dictionaries.has(name);
  }
}

/**
 * Create dictionary handler for message router
 * @param dictionaries - Map of dictionary name to instance
 * @returns DictionaryHandler instance
 */
export function createDictionaryHandler(
  dictionaries: Map<string, IDictionary>
): DictionaryHandler {
  return new DictionaryHandler(dictionaries);
}
