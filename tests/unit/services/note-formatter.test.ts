/**
 * Unit Tests for Note Formatter Service
 */

import {
  NoteFormatterService,
  NoteDefinition,
  NoteFormatterOptions,
  MAPPABLE_FIELDS,
  createNoteFormatterService,
  getGlobalNoteFormatter,
  setGlobalNoteFormatter,
  resetGlobalNoteFormatter
} from '../../../src/bg/ts/services/NoteFormatterService';

describe('NoteFormatterService', () => {
  let formatter: NoteFormatterService;

  beforeEach(() => {
    formatter = new NoteFormatterService();
    resetGlobalNoteFormatter();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const formatter = new NoteFormatterService();
      expect(formatter).toBeInstanceOf(NoteFormatterService);
    });

    it('should accept custom separator', () => {
      const formatter = new NoteFormatterService({ separator: '\n' });
      expect(formatter).toBeInstanceOf(NoteFormatterService);
    });
  });

  describe('format', () => {
    const baseNotedef: NoteDefinition = {
      expression: 'hello',
      reading: '/həˈləʊ/',
      definition: 'a greeting',
      sentence: 'Hello, world!',
      audios: ['https://example.com/audio.mp3']
    };

    const baseOptions: NoteFormatterOptions = {
      deckname: 'Test Deck',
      typename: 'Basic',
      duplicate: '0',
      tags: 'english vocabulary',
      dictSelected: 'Collins',
      expression: 'Front',
      reading: 'Front',
      definition: 'Back',
      sentence: 'Back'
    };

    it('should format a basic note correctly', () => {
      const note = formatter.format(baseNotedef, baseOptions);

      expect(note).not.toBeNull();
      expect(note!.deckName).toBe('Test Deck');
      expect(note!.modelName).toBe('Basic');
      expect(note!.tags).toEqual(['english', 'vocabulary']);
    });

    it('should return null if deckname is missing', () => {
      const options = { ...baseOptions, deckname: '' };
      const note = formatter.format(baseNotedef, options);

      expect(note).toBeNull();
    });

    it('should return null if typename is missing', () => {
      const options = { ...baseOptions, typename: '' };
      const note = formatter.format(baseNotedef, options);

      expect(note).toBeNull();
    });

    it('should return null if expression field mapping is missing', () => {
      const options = { ...baseOptions, expression: '' };
      const note = formatter.format(baseNotedef, options);

      expect(note).toBeNull();
    });

    it('should merge multiple fields to same Anki field', () => {
      const note = formatter.format(baseNotedef, baseOptions);

      expect(note).not.toBeNull();
      // Front should have expression and reading merged
      expect(note!.fields['Front']).toBe('hello<br>/həˈləʊ/');
      // Back should have definition and sentence merged
      expect(note!.fields['Back']).toBe('a greeting<br>Hello, world!');
    });

    it('should handle single field mappings', () => {
      const options: NoteFormatterOptions = {
        ...baseOptions,
        reading: undefined, // Only expression maps to Front
        sentence: undefined // Only definition maps to Back
      };

      const note = formatter.format(baseNotedef, options);

      expect(note).not.toBeNull();
      expect(note!.fields['Front']).toBe('hello');
      expect(note!.fields['Back']).toBe('a greeting');
    });

    it('should handle empty notedef fields', () => {
      const notedef: NoteDefinition = {
        expression: 'test',
        audios: []
      };

      const options: NoteFormatterOptions = {
        ...baseOptions,
        reading: 'Reading',
        definition: 'Definition'
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.fields['Front']).toBe('test');
      expect(note!.fields['Reading']).toBeUndefined();
      expect(note!.fields['Definition']).toBeUndefined();
    });

    it('should allow duplicates when duplicate is "1"', () => {
      const options = { ...baseOptions, duplicate: '1' };
      const note = formatter.format(baseNotedef, options);

      expect(note!.options?.allowDuplicate).toBe(true);
    });

    it('should allow duplicates when duplicate is true', () => {
      const options = { ...baseOptions, duplicate: true };
      const note = formatter.format(baseNotedef, options);

      expect(note!.options?.allowDuplicate).toBe(true);
    });

    it('should not allow duplicates when duplicate is "0"', () => {
      const options = { ...baseOptions, duplicate: '0' };
      const note = formatter.format(baseNotedef, options);

      expect(note!.options?.allowDuplicate).toBe(false);
    });

    it('should not allow duplicates when duplicate is false', () => {
      const options = { ...baseOptions, duplicate: false };
      const note = formatter.format(baseNotedef, options);

      expect(note!.options?.allowDuplicate).toBe(false);
    });
  });

  describe('validateOptions', () => {
    it('should return valid for complete options', () => {
      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front'
      };

      const result = formatter.validateOptions(options);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid for missing deckname', () => {
      const options: NoteFormatterOptions = {
        deckname: '',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front'
      };

      const result = formatter.validateOptions(options);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('deckname');
    });

    it('should return invalid for missing typename', () => {
      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: '',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front'
      };

      const result = formatter.validateOptions(options);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('typename');
    });

    it('should return invalid for missing expression field', () => {
      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: ''
      };

      const result = formatter.validateOptions(options);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('expression');
    });

    it('should return all missing fields', () => {
      const options: NoteFormatterOptions = {
        deckname: '',
        typename: '',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: ''
      };

      const result = formatter.validateOptions(options);

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(3);
      expect(result.missing).toContain('deckname');
      expect(result.missing).toContain('typename');
      expect(result.missing).toContain('expression');
    });
  });

  describe('buildFieldMappings', () => {
    it('should build mappings for all defined fields', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        reading: '/həˈləʊ/',
        definition: 'a greeting',
        audios: []
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        reading: 'Front',
        definition: 'Back'
      };

      const mappings = formatter.buildFieldMappings(notedef, options);

      expect(mappings.get('Front')).toEqual(['hello', '/həˈləʊ/']);
      expect(mappings.get('Back')).toEqual(['a greeting']);
    });

    it('should skip unmapped fields', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        reading: '/həˈləʊ/',
        audios: []
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front'
        // reading not mapped
      };

      const mappings = formatter.buildFieldMappings(notedef, options);

      expect(mappings.get('Front')).toEqual(['hello']);
      expect(mappings.size).toBe(1);
    });

    it('should skip empty notedef values', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        reading: '', // Empty
        audios: []
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        reading: 'Front'
      };

      const mappings = formatter.buildFieldMappings(notedef, options);

      expect(mappings.get('Front')).toEqual(['hello']);
    });
  });

  describe('mergeFieldMappings', () => {
    it('should merge values with default separator', () => {
      const mappings = new Map<string, string[]>();
      mappings.set('Front', ['hello', 'world']);

      const result = formatter.mergeFieldMappings(mappings);

      expect(result['Front']).toBe('hello<br>world');
    });

    it('should merge values with custom separator', () => {
      const mappings = new Map<string, string[]>();
      mappings.set('Front', ['hello', 'world']);

      const result = formatter.mergeFieldMappings(mappings, '\n');

      expect(result['Front']).toBe('hello\nworld');
    });

    it('should handle single values', () => {
      const mappings = new Map<string, string[]>();
      mappings.set('Front', ['hello']);

      const result = formatter.mergeFieldMappings(mappings);

      expect(result['Front']).toBe('hello');
    });

    it('should skip empty arrays', () => {
      const mappings = new Map<string, string[]>();
      mappings.set('Front', []);

      const result = formatter.mergeFieldMappings(mappings);

      expect(result['Front']).toBeUndefined();
    });
  });

  describe('parseDuplicateOption', () => {
    it('should parse "1" as true', () => {
      expect(formatter.parseDuplicateOption('1')).toBe(true);
    });

    it('should parse "true" as true', () => {
      expect(formatter.parseDuplicateOption('true')).toBe(true);
    });

    it('should parse "0" as false', () => {
      expect(formatter.parseDuplicateOption('0')).toBe(false);
    });

    it('should parse "false" as false', () => {
      expect(formatter.parseDuplicateOption('false')).toBe(false);
    });

    it('should parse boolean true as true', () => {
      expect(formatter.parseDuplicateOption(true)).toBe(true);
    });

    it('should parse boolean false as false', () => {
      expect(formatter.parseDuplicateOption(false)).toBe(false);
    });

    it('should parse empty string as false', () => {
      expect(formatter.parseDuplicateOption('')).toBe(false);
    });
  });

  describe('parseTags', () => {
    it('should parse space-separated tags', () => {
      const result = formatter.parseTags('english vocabulary test');

      expect(result).toEqual(['english', 'vocabulary', 'test']);
    });

    it('should handle single tag', () => {
      const result = formatter.parseTags('english');

      expect(result).toEqual(['english']);
    });

    it('should handle empty string', () => {
      const result = formatter.parseTags('');

      expect(result).toEqual([]);
    });

    it('should handle whitespace-only string', () => {
      const result = formatter.parseTags('   ');

      expect(result).toEqual([]);
    });

    it('should trim leading/trailing whitespace', () => {
      const result = formatter.parseTags('  english vocabulary  ');

      expect(result).toEqual(['english', 'vocabulary']);
    });

    it('should handle multiple spaces between tags', () => {
      const result = formatter.parseTags('english    vocabulary');

      expect(result).toEqual(['english', 'vocabulary']);
    });
  });

  describe('generateAudioFilename', () => {
    it('should generate correct filename', () => {
      const filename = formatter.generateAudioFilename('Collins', 'hello', 0);

      expect(filename).toBe('ODH_Collins_hello_0.mp3');
    });

    it('should encode special characters in expression', () => {
      const filename = formatter.generateAudioFilename('Collins', 'hello world', 0);

      expect(filename).toBe('ODH_Collins_hello%20world_0.mp3');
    });

    it('should include audio index', () => {
      const filename = formatter.generateAudioFilename('Collins', 'hello', 2);

      expect(filename).toBe('ODH_Collins_hello_2.mp3');
    });

    it('should handle unicode expressions', () => {
      const filename = formatter.generateAudioFilename('Dict', '你好', 0);

      expect(filename).toBe('ODH_Dict_%E4%BD%A0%E5%A5%BD_0.mp3');
    });
  });

  describe('audio handling', () => {
    it('should add audio to note when audio field is set', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        audios: ['https://example.com/audio.mp3']
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        audio: 'Audio'
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.audio).toBeDefined();
      expect(note!.audio!.url).toBe('https://example.com/audio.mp3');
      expect(note!.audio!.filename).toBe('ODH_Collins_hello_0.mp3');
      expect(note!.audio!.fields).toEqual(['Audio']);
    });

    it('should not add audio if no audio field is set', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        audios: ['https://example.com/audio.mp3']
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front'
        // No audio field
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.audio).toBeUndefined();
    });

    it('should not add audio if no audios available', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        audios: []
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        audio: 'Audio'
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.audio).toBeUndefined();
    });

    it('should use preferred audio index', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        audios: [
          'https://example.com/audio0.mp3',
          'https://example.com/audio1.mp3',
          'https://example.com/audio2.mp3'
        ]
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        audio: 'Audio',
        preferredaudio: '2'
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.audio!.url).toBe('https://example.com/audio2.mp3');
      expect(note!.audio!.filename).toContain('_2.mp3');
    });

    it('should fall back to first audio if preferred index is invalid', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        audios: ['https://example.com/audio0.mp3']
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        audio: 'Audio',
        preferredaudio: '5' // Out of range
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.audio!.url).toBe('https://example.com/audio0.mp3');
    });

    it('should ensure audio field exists in note fields', () => {
      const notedef: NoteDefinition = {
        expression: 'hello',
        audios: ['https://example.com/audio.mp3']
      };

      const options: NoteFormatterOptions = {
        deckname: 'Test',
        typename: 'Basic',
        duplicate: '0',
        tags: '',
        dictSelected: 'Collins',
        expression: 'Front',
        audio: 'Audio'
      };

      const note = formatter.format(notedef, options);

      expect(note).not.toBeNull();
      expect(note!.fields['Audio']).toBe('');
    });
  });
});

describe('MAPPABLE_FIELDS', () => {
  it('should contain all expected fields', () => {
    expect(MAPPABLE_FIELDS).toContain('expression');
    expect(MAPPABLE_FIELDS).toContain('reading');
    expect(MAPPABLE_FIELDS).toContain('extrainfo');
    expect(MAPPABLE_FIELDS).toContain('definition');
    expect(MAPPABLE_FIELDS).toContain('definitions');
    expect(MAPPABLE_FIELDS).toContain('sentence');
    expect(MAPPABLE_FIELDS).toContain('url');
  });

  it('should have 7 fields', () => {
    expect(MAPPABLE_FIELDS).toHaveLength(7);
  });
});

describe('createNoteFormatterService', () => {
  it('should create a new NoteFormatterService', () => {
    const formatter = createNoteFormatterService();
    expect(formatter).toBeInstanceOf(NoteFormatterService);
  });

  it('should accept options', () => {
    const formatter = createNoteFormatterService({ separator: '\n' });
    expect(formatter).toBeInstanceOf(NoteFormatterService);
  });
});

describe('global note formatter', () => {
  beforeEach(() => {
    resetGlobalNoteFormatter();
  });

  it('should return the same global instance', () => {
    const first = getGlobalNoteFormatter();
    const second = getGlobalNoteFormatter();
    expect(first).toBe(second);
  });

  it('should allow setting a custom global formatter', () => {
    const customFormatter = new NoteFormatterService({ separator: '\n' });

    setGlobalNoteFormatter(customFormatter);

    expect(getGlobalNoteFormatter()).toBe(customFormatter);
  });

  it('should reset global formatter', () => {
    const original = getGlobalNoteFormatter();

    resetGlobalNoteFormatter();

    const newGlobal = getGlobalNoteFormatter();
    expect(newGlobal).not.toBe(original);
  });
});
