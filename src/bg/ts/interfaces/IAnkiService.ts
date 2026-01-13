/**
 * Anki Service Interface
 * Defines the contract for Anki integration services (AnkiConnect, AnkiWeb)
 */

/**
 * Anki note structure for creating flashcards
 */
export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
  options?: {
    allowDuplicate?: boolean;
  };
  audio?: {
    url: string;
    filename: string;
    fields: string[];
  };
}

/**
 * Result of adding a note to Anki
 */
export interface AddNoteResult {
  success: boolean;
  noteId?: number;
  error?: string;
}

/**
 * Anki deck information
 */
export interface AnkiDeck {
  name: string;
  id?: number;
}

/**
 * Anki model (note type) information
 */
export interface AnkiModel {
  name: string;
  fields: string[];
}

/**
 * Anki service interface
 * Implements the Interface Segregation Principle (ISP)
 * Each method represents a single responsibility
 */
export interface IAnkiService {
  /**
   * Get the version of the Anki service/API
   * @returns Version string or null if not connected
   */
  getVersion(): Promise<string | null>;

  /**
   * Add a note (flashcard) to Anki
   * @param note - The note to add
   * @returns Result containing success status and note ID
   */
  addNote(note: AnkiNote): Promise<AddNoteResult>;

  /**
   * Get all deck names in Anki
   * @returns Array of deck names
   */
  getDeckNames(): Promise<string[]>;

  /**
   * Get all model (note type) names in Anki
   * @returns Array of model names
   */
  getModelNames(): Promise<string[]>;

  /**
   * Get field names for a specific model
   * @param modelName - Name of the model
   * @returns Array of field names
   */
  getModelFieldNames(modelName: string): Promise<string[]>;
}

/**
 * Type guard to check if an object implements IAnkiService
 */
export function isAnkiService(obj: unknown): obj is IAnkiService {
  if (!obj || typeof obj !== 'object') return false;
  const service = obj as IAnkiService;
  return (
    typeof service.getVersion === 'function' &&
    typeof service.addNote === 'function' &&
    typeof service.getDeckNames === 'function' &&
    typeof service.getModelNames === 'function' &&
    typeof service.getModelFieldNames === 'function'
  );
}
