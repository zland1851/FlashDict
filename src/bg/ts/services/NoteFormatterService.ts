/**
 * Note Formatter Service
 * Handles formatting of dictionary lookups into Anki notes
 * Follows Single Responsibility Principle - only responsible for note formatting
 */

import { AnkiNote } from '../interfaces/IAnkiService';

/**
 * Raw note definition from dictionary lookup
 */
export interface NoteDefinition {
  /** The word/expression being defined */
  expression: string;
  /** Pronunciation/reading (e.g., IPA) */
  reading?: string;
  /** Extra information (e.g., part of speech) */
  extrainfo?: string;
  /** Primary definition */
  definition?: string;
  /** Multiple definitions */
  definitions?: string;
  /** Example sentence */
  sentence?: string;
  /** Source URL */
  url?: string;
  /** Audio URLs for pronunciation */
  audios: string[];
}

/**
 * Options for note formatting
 */
export interface NoteFormatterOptions {
  /** Anki deck name */
  deckname: string;
  /** Anki model/note type name */
  typename: string;
  /** Allow duplicate notes */
  duplicate: string | boolean;
  /** Tags to add (space-separated) */
  tags: string;
  /** Selected dictionary name (for audio filename) */
  dictSelected: string;
  /** Preferred audio index */
  preferredaudio?: string | number;

  // Field mappings - maps ODH fields to Anki field names
  /** Anki field for expression */
  expression?: string;
  /** Anki field for reading */
  reading?: string;
  /** Anki field for extra info */
  extrainfo?: string;
  /** Anki field for definition */
  definition?: string;
  /** Anki field for definitions */
  definitions?: string;
  /** Anki field for sentence */
  sentence?: string;
  /** Anki field for URL */
  url?: string;
  /** Anki field for audio */
  audio?: string;
}

/**
 * Field names that can be mapped to Anki fields
 */
export const MAPPABLE_FIELDS = [
  'expression',
  'reading',
  'extrainfo',
  'definition',
  'definitions',
  'sentence',
  'url'
] as const;

export type MappableField = typeof MAPPABLE_FIELDS[number];

/**
 * Error thrown when note formatting fails due to missing required options
 */
export class NoteFormatError extends Error {
  constructor(
    message: string,
    public readonly missingFields: string[]
  ) {
    super(message);
    this.name = 'NoteFormatError';
  }
}

/**
 * Note Formatter Service
 * Converts dictionary lookup results into Anki note format
 */
export class NoteFormatterService {
  private readonly defaultSeparator: string;

  constructor(options: { separator?: string } = {}) {
    this.defaultSeparator = options.separator ?? '<br>';
  }

  /**
   * Format a note definition into an Anki note
   * @param notedef - The raw note definition from dictionary lookup
   * @param options - Formatting options including field mappings
   * @returns Formatted AnkiNote or null if required options are missing
   */
  format(notedef: NoteDefinition, options: NoteFormatterOptions): AnkiNote | null {
    // Validate required options
    const validation = this.validateOptions(options);
    if (!validation.valid) {
      return null;
    }

    const note: AnkiNote = {
      deckName: options.deckname,
      modelName: options.typename,
      options: {
        allowDuplicate: this.parseDuplicateOption(options.duplicate)
      },
      fields: {},
      tags: []
    };

    // Build field mappings
    const fieldMappings = this.buildFieldMappings(notedef, options);

    // Merge fields that map to the same Anki field
    note.fields = this.mergeFieldMappings(fieldMappings);

    // Parse and add tags
    note.tags = this.parseTags(options.tags);

    // Handle audio field
    this.addAudioToNote(note, notedef, options);

    return note;
  }

  /**
   * Validate that required options are present
   * @param options - Options to validate
   * @returns Validation result
   */
  validateOptions(options: NoteFormatterOptions): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!options.deckname) {
      missing.push('deckname');
    }
    if (!options.typename) {
      missing.push('typename');
    }
    if (!options.expression) {
      missing.push('expression');
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Build field mappings from note definition and options
   * @param notedef - The note definition
   * @param options - The formatting options
   * @returns Map of Anki field names to arrays of values
   */
  buildFieldMappings(
    notedef: NoteDefinition,
    options: NoteFormatterOptions
  ): Map<string, string[]> {
    const fieldMappings = new Map<string, string[]>();

    for (const fieldname of MAPPABLE_FIELDS) {
      const ankiField = options[fieldname];
      if (!ankiField) continue;

      const value = notedef[fieldname];
      if (!value) continue;

      if (!fieldMappings.has(ankiField)) {
        fieldMappings.set(ankiField, []);
      }
      fieldMappings.get(ankiField)!.push(value);
    }

    return fieldMappings;
  }

  /**
   * Merge multiple values that map to the same Anki field
   * @param fieldMappings - Map of Anki fields to value arrays
   * @param separator - Separator to use when joining values
   * @returns Record of Anki field names to merged values
   */
  mergeFieldMappings(
    fieldMappings: Map<string, string[]>,
    separator: string = this.defaultSeparator
  ): Record<string, string> {
    const fields: Record<string, string> = {};

    for (const [ankiField, values] of fieldMappings) {
      if (values.length > 0) {
        fields[ankiField] = values.join(separator);
      }
    }

    return fields;
  }

  /**
   * Parse the duplicate option to boolean
   * @param duplicate - The duplicate option value
   * @returns Boolean indicating if duplicates are allowed
   */
  parseDuplicateOption(duplicate: string | boolean): boolean {
    if (typeof duplicate === 'boolean') {
      return duplicate;
    }
    return duplicate === '1' || duplicate === 'true';
  }

  /**
   * Parse tags string into array
   * @param tags - Space-separated tags string
   * @returns Array of tags
   */
  parseTags(tags: string): string[] {
    if (!tags) return [];

    const trimmed = tags.trim();
    if (trimmed.length === 0) return [];

    return trimmed.split(/\s+/).filter(tag => tag.length > 0);
  }

  /**
   * Generate audio filename for Anki
   * @param dictName - Dictionary name
   * @param expression - The word/expression
   * @param audioIndex - Index of the audio file
   * @returns Generated filename
   */
  generateAudioFilename(
    dictName: string,
    expression: string,
    audioIndex: number
  ): string {
    const encodedExpression = encodeURIComponent(expression);
    return `ODH_${dictName}_${encodedExpression}_${audioIndex}.mp3`;
  }

  /**
   * Add audio configuration to note if available
   * @param note - The note to add audio to
   * @param notedef - The note definition with audio URLs
   * @param options - The formatting options
   */
  private addAudioToNote(
    note: AnkiNote,
    notedef: NoteDefinition,
    options: NoteFormatterOptions
  ): void {
    if (!options.audio || !notedef.audios || notedef.audios.length === 0) {
      return;
    }

    const audioIndex = this.selectAudioIndex(notedef.audios, options.preferredaudio);
    const audioUrl = notedef.audios[audioIndex];

    if (!audioUrl) {
      return;
    }

    const audioField = options.audio;

    // Ensure the audio field exists in the note
    if (!note.fields[audioField]) {
      note.fields[audioField] = '';
    }

    note.audio = {
      url: audioUrl,
      filename: this.generateAudioFilename(
        options.dictSelected,
        notedef.expression,
        audioIndex
      ),
      fields: [audioField]
    };
  }

  /**
   * Select the audio index to use
   * @param audios - Available audio URLs
   * @param preferred - Preferred audio index
   * @returns Selected audio index
   */
  private selectAudioIndex(audios: string[], preferred?: string | number): number {
    if (preferred === undefined || preferred === null) {
      return 0;
    }

    const index = typeof preferred === 'string' ? parseInt(preferred, 10) : preferred;

    if (isNaN(index) || index < 0 || index >= audios.length) {
      return 0;
    }

    return index;
  }
}

/**
 * Create a new NoteFormatterService instance
 * @param options - Service options
 * @returns New NoteFormatterService instance
 */
export function createNoteFormatterService(
  options?: { separator?: string }
): NoteFormatterService {
  return new NoteFormatterService(options);
}

/**
 * Global note formatter instance (optional - for convenience)
 */
let globalNoteFormatter: NoteFormatterService | null = null;

/**
 * Get or create the global note formatter instance
 * @returns Global note formatter
 */
export function getGlobalNoteFormatter(): NoteFormatterService {
  if (!globalNoteFormatter) {
    globalNoteFormatter = new NoteFormatterService();
  }
  return globalNoteFormatter;
}

/**
 * Set the global note formatter instance
 * @param formatter - Note formatter to set as global
 */
export function setGlobalNoteFormatter(formatter: NoteFormatterService): void {
  globalNoteFormatter = formatter;
}

/**
 * Reset the global note formatter
 */
export function resetGlobalNoteFormatter(): void {
  globalNoteFormatter = null;
}
