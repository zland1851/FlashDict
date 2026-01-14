/**
 * AnkiConnect Service
 * Implements IAnkiService for communication with Anki via AnkiConnect plugin
 * Uses fetch API for HTTP requests (compatible with Service Worker)
 */

import { IAnkiService, AnkiNote, AddNoteResult } from '../interfaces/IAnkiService';

/**
 * AnkiConnect response structure
 */
export interface AnkiConnectResponse<T = unknown> {
  result: T;
  error: string | null;
}

/**
 * AnkiConnect service configuration
 */
export interface AnkiConnectConfig {
  /** Base URL for AnkiConnect (default: http://127.0.0.1:8765) */
  baseUrl?: string;
  /** API version (default: 6) */
  version?: number;
  /** Default timeout in milliseconds (default: 3000) */
  timeout?: number;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
}

/**
 * Error thrown when AnkiConnect operations fail
 */
export class AnkiConnectError extends Error {
  constructor(
    message: string,
    public readonly action: string,
    public readonly originalError?: Error | string
  ) {
    super(message);
    this.name = 'AnkiConnectError';
  }
}

/**
 * Error thrown when AnkiConnect request times out
 */
export class AnkiConnectTimeoutError extends AnkiConnectError {
  constructor(action: string, timeout: number) {
    super(`Request timed out after ${timeout}ms`, action);
    this.name = 'AnkiConnectTimeoutError';
  }
}

/**
 * Error thrown when AnkiConnect is not reachable
 */
export class AnkiConnectConnectionError extends AnkiConnectError {
  constructor(action: string, originalError?: Error) {
    super('Failed to connect to AnkiConnect. Is Anki running?', action, originalError);
    this.name = 'AnkiConnectConnectionError';
  }
}

/**
 * AnkiConnect Service
 * Communicates with Anki desktop via the AnkiConnect plugin
 */
export class AnkiConnectService implements IAnkiService {
  private readonly baseUrl: string;
  private readonly version: number;
  private readonly defaultTimeout: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: AnkiConnectConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://127.0.0.1:8765';
    this.version = config.version ?? 6;
    this.defaultTimeout = config.timeout ?? 3000;
    this.fetchFn = config.fetchFn ?? fetch.bind(globalThis);
  }

  /**
   * Invoke an AnkiConnect action
   * @param action - The action to invoke
   * @param params - Parameters for the action
   * @param timeout - Request timeout in milliseconds
   * @returns The result of the action or null on error
   */
  async invoke<T>(
    action: string,
    params: Record<string, unknown> = {},
    timeout: number = this.defaultTimeout
  ): Promise<T | null> {
    const request = {
      action,
      version: this.version,
      params
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await this.fetchFn(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AnkiConnectError(
          `HTTP error: ${response.status} ${response.statusText}`,
          action
        );
      }

      const responseData = await response.json() as AnkiConnectResponse<T>;

      // Validate response structure
      this.validateResponse(responseData, action);

      if (responseData.error) {
        throw new AnkiConnectError(responseData.error, action);
      }

      return responseData.result;
    } catch (error) {
      if (error instanceof AnkiConnectError) {
        // Re-throw our custom errors
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AnkiConnectTimeoutError(action, timeout);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AnkiConnectConnectionError(action, error);
      }

      // For unknown errors, return null to maintain backward compatibility
      return null;
    }
  }

  /**
   * Invoke an action without throwing errors (returns null on failure)
   * This maintains backward compatibility with the original implementation
   */
  async invokeQuiet<T>(
    action: string,
    params: Record<string, unknown> = {},
    timeout: number = this.defaultTimeout
  ): Promise<T | null> {
    try {
      return await this.invoke<T>(action, params, timeout);
    } catch {
      return null;
    }
  }

  /**
   * Add a note to Anki
   * @param note - The note to add
   * @returns Result containing success status and note ID
   */
  async addNote(note: AnkiNote): Promise<AddNoteResult> {
    if (!note) {
      return {
        success: false,
        error: 'Note is required'
      };
    }

    try {
      const noteId = await this.invoke<number>('addNote', { note });

      if (noteId === null) {
        return {
          success: false,
          error: 'Failed to add note'
        };
      }

      return {
        success: true,
        noteId
      };
    } catch (error) {
      if (error instanceof AnkiConnectError) {
        // Check for duplicate error
        if (error.message.includes('duplicate') || error.message.includes('cannot create')) {
          return {
            success: false,
            error: 'Duplicate note'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Unknown error adding note'
      };
    }
  }

  /**
   * Get all deck names from Anki
   * @returns Array of deck names or empty array on error
   */
  async getDeckNames(): Promise<string[]> {
    const result = await this.invokeQuiet<string[]>('deckNames');
    return result ?? [];
  }

  /**
   * Get all model (note type) names from Anki
   * @returns Array of model names or empty array on error
   */
  async getModelNames(): Promise<string[]> {
    const result = await this.invokeQuiet<string[]>('modelNames');
    return result ?? [];
  }

  /**
   * Get field names for a specific model
   * @param modelName - Name of the model
   * @returns Array of field names or empty array on error
   */
  async getModelFieldNames(modelName: string): Promise<string[]> {
    if (!modelName) {
      return [];
    }

    const result = await this.invokeQuiet<string[]>('modelFieldNames', { modelName });
    return result ?? [];
  }

  /**
   * Get the AnkiConnect version
   * @returns Version string or null if not connected
   */
  async getVersion(): Promise<string | null> {
    const version = await this.invokeQuiet<number>('version', {}, 100);
    return version !== null ? `ver:${version}` : null;
  }

  /**
   * Check if AnkiConnect is available and responding
   * @returns true if AnkiConnect is available
   */
  async isAvailable(): Promise<boolean> {
    const version = await this.getVersion();
    return version !== null;
  }

  /**
   * Sync Anki (trigger sync with AnkiWeb)
   * @returns true if sync was triggered successfully
   */
  async sync(): Promise<boolean> {
    try {
      await this.invoke<null>('sync');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find notes matching a query
   * @param query - Anki search query
   * @returns Array of note IDs
   */
  async findNotes(query: string): Promise<number[]> {
    const result = await this.invokeQuiet<number[]>('findNotes', { query });
    return result ?? [];
  }

  /**
   * Get note info for specific note IDs
   * @param noteIds - Array of note IDs
   * @returns Array of note info objects
   */
  async notesInfo(noteIds: number[]): Promise<Record<string, unknown>[]> {
    if (!noteIds || noteIds.length === 0) {
      return [];
    }

    const result = await this.invokeQuiet<Record<string, unknown>[]>('notesInfo', { notes: noteIds });
    return result ?? [];
  }

  /**
   * Store a media file in Anki
   * @param filename - Name for the file
   * @param data - Base64 encoded file data
   * @returns Stored filename or null on error
   */
  async storeMediaFile(filename: string, data: string): Promise<string | null> {
    if (!filename || !data) {
      return null;
    }

    return await this.invokeQuiet<string>('storeMediaFile', {
      filename,
      data
    });
  }

  /**
   * Store a media file from URL
   * @param filename - Name for the file
   * @param url - URL to download the file from
   * @returns Stored filename or null on error
   */
  async storeMediaFileByUrl(filename: string, url: string): Promise<string | null> {
    if (!filename || !url) {
      return null;
    }

    return await this.invokeQuiet<string>('storeMediaFile', {
      filename,
      url
    });
  }

  /**
   * Validate the AnkiConnect response structure
   */
  private validateResponse<T>(response: AnkiConnectResponse<T>, action: string): void {
    // Check for required fields first (more specific errors)
    if (!Object.prototype.hasOwnProperty.call(response, 'error')) {
      throw new AnkiConnectError(
        'Response is missing required error field',
        action
      );
    }

    if (!Object.prototype.hasOwnProperty.call(response, 'result')) {
      throw new AnkiConnectError(
        'Response is missing required result field',
        action
      );
    }

    // Check for unexpected extra fields
    const keys = Object.getOwnPropertyNames(response);
    if (keys.length !== 2) {
      throw new AnkiConnectError(
        'Response has an unexpected number of fields',
        action
      );
    }
  }
}

/**
 * Create a new AnkiConnectService instance
 * @param config - Service configuration
 * @returns New AnkiConnectService instance
 */
export function createAnkiConnectService(config?: AnkiConnectConfig): AnkiConnectService {
  return new AnkiConnectService(config);
}

/**
 * Global AnkiConnect service instance
 */
let globalAnkiConnectService: AnkiConnectService | null = null;

/**
 * Get or create the global AnkiConnect service instance
 * @returns Global AnkiConnect service
 */
export function getGlobalAnkiConnectService(): AnkiConnectService {
  if (!globalAnkiConnectService) {
    globalAnkiConnectService = new AnkiConnectService();
  }
  return globalAnkiConnectService;
}

/**
 * Set the global AnkiConnect service instance
 * @param service - Service to set as global
 */
export function setGlobalAnkiConnectService(service: AnkiConnectService): void {
  globalAnkiConnectService = service;
}

/**
 * Reset the global AnkiConnect service
 */
export function resetGlobalAnkiConnectService(): void {
  globalAnkiConnectService = null;
}
