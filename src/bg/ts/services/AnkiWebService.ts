/**
 * AnkiWeb Service
 * Implements IAnkiService for communication with AnkiWeb
 * Uses fetch API for HTTP requests (compatible with Service Worker)
 */

import {
  IAnkiService,
  AnkiNote,
  AddNoteResult
} from '../interfaces/IAnkiService';

/**
 * AnkiWeb profile information
 */
interface AnkiWebProfile {
  /** List of deck names */
  decknames: string[];
  /** Map of deck name to deck ID */
  deckids: Record<string, number>;
  /** List of model/note type names */
  modelnames: string[];
  /** Map of model name to model ID */
  modelids: Record<string, number>;
  /** Map of model name to field names */
  modelfieldnames: Record<string, string[]>;
  /** CSRF token for API requests */
  token: string;
}

/**
 * AnkiWeb add info response
 */
interface AnkiWebAddInfo {
  decks: Array<{ name: string; id: number }>;
  notetypes: Array<{ name: string; id: number }>;
}

/**
 * AnkiWeb note type fields response
 */
interface AnkiWebNoteTypeFields {
  fields: Array<{ name: string }>;
}

/**
 * AnkiWeb connect response
 */
interface AnkiWebConnectResponse {
  /** Action to take */
  action: 'edit' | 'login';
  /** Response data (profile or CSRF token) */
  data: AnkiWebProfile | string;
}

/**
 * AnkiWeb service configuration
 */
export interface AnkiWebConfig {
  /** AnkiWeb username/email */
  id: string;
  /** AnkiWeb password */
  password: string;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
  /** Base URL for AnkiWeb */
  baseUrl?: string;
}

/**
 * Error thrown when AnkiWeb operations fail
 */
export class AnkiWebError extends Error {
  constructor(
    message: string,
    public readonly action: string,
    public readonly originalError?: Error | string
  ) {
    super(message);
    this.name = 'AnkiWebError';
  }
}

/**
 * Error thrown when AnkiWeb login fails
 */
export class AnkiWebLoginError extends AnkiWebError {
  constructor(originalError?: Error) {
    super('Failed to login to AnkiWeb', 'login', originalError);
    this.name = 'AnkiWebLoginError';
  }
}

/**
 * Error thrown when AnkiWeb session is not authenticated
 */
export class AnkiWebAuthError extends AnkiWebError {
  constructor(action: string) {
    super('Not authenticated with AnkiWeb. Please login first.', action);
    this.name = 'AnkiWebAuthError';
  }
}

/**
 * AnkiWeb Service
 * Communicates with AnkiWeb via web interface
 */
export class AnkiWebService implements IAnkiService {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private id: string;
  private password: string;
  private profile: AnkiWebProfile | null = null;

  constructor(config: AnkiWebConfig) {
    this.id = config.id;
    this.password = config.password;
    this.fetchFn = config.fetchFn ?? fetch.bind(globalThis);
    this.baseUrl = config.baseUrl ?? 'https://ankiweb.net';
  }

  /**
   * Initialize connection to AnkiWeb
   * @param options - Options with id and password
   * @param forceLogout - Force logout before connecting
   * @returns Promise resolving when connected
   */
  async initConnection(options: { id: string; password: string }, forceLogout: boolean = false): Promise<void> {
    this.id = options.id;
    this.password = options.password;
    const retryCount = 1;
    this.profile = await this.getProfile(retryCount, forceLogout);

    if (!this.profile) {
      throw new AnkiWebLoginError();
    }
  }

  /**
   * Get the AnkiWeb version
   * @returns Version string or null if not connected
   */
  async getVersion(): Promise<string | null> {
    return this.profile ? 'web' : null;
  }

  /**
   * Add a note to AnkiWeb
   * @param note - The note to add
   * @returns Result containing success status
   */
  async addNote(note: AnkiNote): Promise<AddNoteResult> {
    if (!note) {
      return {
        success: false,
        error: 'Note is required'
      };
    }

    if (!this.profile) {
      return {
        success: false,
        error: 'Not connected to AnkiWeb'
      };
    }

    try {
      const result = await this.saveNote(note);

      if (result === null) {
        return {
          success: false,
          error: 'Failed to save note to AnkiWeb'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get all deck names from AnkiWeb
   * @returns Array of deck names
   */
  async getDeckNames(): Promise<string[]> {
    return this.profile?.decknames ?? [];
  }

  /**
   * Get all model (note type) names from AnkiWeb
   * @returns Array of model names
   */
  async getModelNames(): Promise<string[]> {
    return this.profile?.modelnames ?? [];
  }

  /**
   * Get field names for a specific model
   * @param modelName - Name of the model
   * @returns Array of field names
   */
  async getModelFieldNames(modelName: string): Promise<string[]> {
    if (!this.profile || !modelName) {
      return [];
    }

    return this.profile.modelfieldnames[modelName] ?? [];
  }

  /**
   * Connect to AnkiWeb API
   * @param forceLogout - Force logout before connecting
   * @returns Connect response with action and data
   */
  private async apiConnect(forceLogout: boolean = false): Promise<AnkiWebConnectResponse> {
    try {
      const url = forceLogout
        ? `${this.baseUrl}/account/logout`
        : 'https://ankiuser.net/edit/';

      const response = await this.fetchFn(url, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new AnkiWebError(
          `HTTP error: ${response.status} ${response.statusText}`,
          'connect'
        );
      }

      const result = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, 'text/html');
      const title = doc.querySelectorAll('h1');

      if (title.length === 0) {
        throw new AnkiWebError('Unexpected page structure', 'connect');
      }

      const firstTitle = title[0];
      if (!firstTitle || !firstTitle.innerText) {
        throw new AnkiWebError('Unexpected page structure', 'connect');
      }

      switch (firstTitle.innerText) {
        case 'Add':
          return {
            action: 'edit',
            data: await this.parseData(result)
          };
        case 'Log in':
          const token = doc.querySelector('input[name=csrf_token]');
          return {
            action: 'login',
            data: token?.getAttribute('value') ?? ''
          };
        default:
          throw new AnkiWebError('Unexpected page title', 'connect');
      }
    } catch (error) {
      if (error instanceof AnkiWebError) {
        throw error;
      }
      throw new AnkiWebError(
        `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        'connect',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Login to AnkiWeb
   * @param id - Username/email
   * @param password - Password
   * @param token - CSRF token
   * @returns true if login successful
   */
  private async apiLogin(id: string, password: string, token: string): Promise<boolean> {
    try {
      const formData = new URLSearchParams();
      formData.append('submitted', '1');
      formData.append('username', id);
      formData.append('password', password);
      formData.append('csrf_token', token);

      const response = await this.fetchFn(`${this.baseUrl}/account/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString(),
        credentials: 'include'
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, 'text/html');
      const title = doc.querySelectorAll('h1');

      if (title.length === 0) {
        return false;
      }

      const firstTitle = title[0];
      return firstTitle?.innerText === 'Decks';
    } catch (error) {
      return false;
    }
  }

  /**
   * Save note to AnkiWeb
   * @param note - Note to save
   * @param profile - AnkiWeb profile
   * @returns Response text or null on error
   */
  private async apiSave(note: AnkiNote, profile: AnkiWebProfile): Promise<string | null> {
    try {
      const fields: string[] = [];
      const fieldNames = profile.modelfieldnames[note.modelName] ?? [];

      for (const field of fieldNames) {
        fields.push(note.fields[field] ?? '');
      }

      const data = [fields, note.tags.join(' ')];

      const formData = new URLSearchParams();
      formData.append('csrf_token', profile.token);
      formData.append('data', JSON.stringify(data));
      formData.append('mid', String(profile.modelids[note.modelName]));
      formData.append('deck', String(profile.deckids[note.deckName]));

      const response = await this.fetchFn('https://ankiuser.net/edit/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString(),
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get AnkiWeb profile with decks and models
   * @param retryCount - Number of retries remaining
   * @param forceLogout - Force logout before getting profile
   * @returns Profile or null on error
   */
  private async getProfile(
    retryCount: number = 1,
    forceLogout: boolean = false
  ): Promise<AnkiWebProfile | null> {
    try {
      const resp = await this.apiConnect(forceLogout);

      if (resp.action === 'edit') {
        return resp.data as AnkiWebProfile;
      } else if (
        resp.action === 'login' &&
        retryCount > 0 &&
        await this.apiLogin(this.id, this.password, resp.data as string)
      ) {
        return this.getProfile(retryCount - 1);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save note with retry logic
   * @param note - Note to save
   * @param retryCount - Number of retries remaining
   * @returns true if successful, null on failure
   */
  private async saveNote(note: AnkiNote, retryCount: number = 1): Promise<boolean | null> {
    try {
      const resp = await this.apiSave(note, this.profile!);

      if (resp !== null) {
        return true;
      } else if (retryCount > 0) {
        this.profile = await this.getProfile();
        if (this.profile) {
          return this.saveNote(note, retryCount - 1);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get add info from AnkiWeb
   * @returns Add info or null on error
   */
  private async getAddInfo(): Promise<AnkiWebAddInfo | null> {
    try {
      const response = await this.fetchFn('https://ankiuser.net/edit/getAddInfo', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      return await response.json() as AnkiWebAddInfo;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get note type fields
   * @param nid - Note type ID
   * @returns Note type fields or null on error
   */
  private async getNotetypeFields(nid: number): Promise<AnkiWebNoteTypeFields | null> {
    try {
      const response = await this.fetchFn(
        `https://ankiuser.net/edit/getNotetypeFields?ntid=${nid}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json() as AnkiWebNoteTypeFields;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse profile data from AnkiWeb response
   * @param response - HTML response text
   * @returns Parsed profile
   */
  private async parseData(response: string): Promise<AnkiWebProfile> {
    const tokenMatch = /anki\.Editor\('(.*)'/.exec(response);
    if (!tokenMatch || tokenMatch[1] === undefined) {
      throw new AnkiWebError('Could not parse CSRF token', 'parseData');
    }
    const token = tokenMatch[1];

    const addInfo = await this.getAddInfo();
    if (!addInfo) {
      throw new AnkiWebError('Could not get add info', 'parseData');
    }

    const decknames: string[] = [];
    const deckids: Record<string, number> = {};
    const modelnames: string[] = [];
    const modelids: Record<string, number> = {};
    const modelfieldnames: Record<string, string[]> = {};

    for (const deck of addInfo.decks) {
      decknames.push(deck.name);
      deckids[deck.name] = deck.id;
    }

    for (const notetype of addInfo.notetypes) {
      modelnames.push(notetype.name);
      modelids[notetype.name] = notetype.id;

      const notetypeFields = await this.getNotetypeFields(notetype.id);
      if (notetypeFields) {
        const fieldnames: string[] = [];
        for (const field of notetypeFields.fields) {
          fieldnames.push(field.name);
        }
        modelfieldnames[notetype.name] = fieldnames;
      }
    }

    return {
      decknames,
      deckids,
      modelnames,
      modelids,
      modelfieldnames,
      token
    };
  }
}

/**
 * Create a new AnkiWebService instance
 * @param config - Service configuration
 * @returns New AnkiWebService instance
 */
export function createAnkiWebService(config: AnkiWebConfig): AnkiWebService {
  return new AnkiWebService(config);
}

/**
 * Global AnkiWeb service instance
 */
let globalAnkiWebService: AnkiWebService | null = null;

/**
 * Get or create the global AnkiWeb service instance
 * @param config - Configuration for the service
 * @returns Global AnkiWeb service
 */
export function getGlobalAnkiWebService(config?: AnkiWebConfig): AnkiWebService {
  if (!globalAnkiWebService) {
    if (!config) {
      throw new Error('AnkiWebService requires config on first initialization');
    }
    globalAnkiWebService = new AnkiWebService(config);
  }
  return globalAnkiWebService;
}

/**
 * Set the global AnkiWeb service instance
 * @param service - Service to set as global
 */
export function setGlobalAnkiWebService(service: AnkiWebService): void {
  globalAnkiWebService = service;
}

/**
 * Reset the global AnkiWeb service
 */
export function resetGlobalAnkiWebService(): void {
  globalAnkiWebService = null;
}
