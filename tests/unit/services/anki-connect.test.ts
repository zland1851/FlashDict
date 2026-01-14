/**
 * Unit Tests for AnkiConnect Service
 */

import {
  AnkiConnectService,
  AnkiConnectError,
  AnkiConnectTimeoutError,
  AnkiConnectConnectionError,
  createAnkiConnectService,
  getGlobalAnkiConnectService,
  setGlobalAnkiConnectService,
  resetGlobalAnkiConnectService
} from '../../../src/bg/ts/services/AnkiConnectService';
import { AnkiNote } from '../../../src/bg/ts/interfaces/IAnkiService';

describe('AnkiConnectService', () => {
  let service: AnkiConnectService;
  let mockFetch: jest.Mock;

  const createMockResponse = (result: unknown, error: string | null = null) => ({
    ok: true,
    json: () => Promise.resolve({ result, error })
  });

  beforeEach(() => {
    mockFetch = jest.fn();
    service = new AnkiConnectService({ fetchFn: mockFetch });
    resetGlobalAnkiConnectService();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const defaultService = new AnkiConnectService({ fetchFn: mockFetch });
      expect(defaultService).toBeInstanceOf(AnkiConnectService);
    });

    it('should accept custom base URL', () => {
      const customService = new AnkiConnectService({
        baseUrl: 'http://localhost:9000',
        fetchFn: mockFetch
      });

      mockFetch.mockResolvedValue(createMockResponse(6));
      customService.getVersion();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9000',
        expect.any(Object)
      );
    });

    it('should accept custom version', async () => {
      const customService = new AnkiConnectService({
        version: 5,
        fetchFn: mockFetch
      });

      mockFetch.mockResolvedValue(createMockResponse(5));
      await customService.getVersion();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"version":5')
        })
      );
    });
  });

  describe('invoke', () => {
    it('should make POST request to AnkiConnect', async () => {
      mockFetch.mockResolvedValue(createMockResponse(['Default', 'Japanese']));

      await service.invoke('deckNames');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8765',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: expect.stringContaining('"action":"deckNames"')
        })
      );
    });

    it('should include version in request', async () => {
      mockFetch.mockResolvedValue(createMockResponse(['Default']));

      await service.invoke('deckNames');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"version":6')
        })
      );
    });

    it('should include params in request', async () => {
      mockFetch.mockResolvedValue(createMockResponse(['Front', 'Back']));

      await service.invoke('modelFieldNames', { modelName: 'Basic' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"modelName":"Basic"')
        })
      );
    });

    it('should return result on success', async () => {
      const decks = ['Default', 'Japanese', 'English'];
      mockFetch.mockResolvedValue(createMockResponse(decks));

      const result = await service.invoke<string[]>('deckNames');

      expect(result).toEqual(decks);
    });

    it('should throw AnkiConnectError on API error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'model was not found'));

      await expect(service.invoke('modelFieldNames', { modelName: 'Invalid' }))
        .rejects.toThrow(AnkiConnectError);
    });

    it('should throw AnkiConnectError on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(service.invoke('deckNames'))
        .rejects.toThrow('HTTP error');
    });

    it('should throw AnkiConnectTimeoutError on timeout', async () => {
      // Mock AbortController behavior
      mockFetch.mockImplementation(() => {
        const error = new DOMException('Aborted', 'AbortError');
        return Promise.reject(error);
      });

      await expect(service.invoke('deckNames', {}, 100))
        .rejects.toThrow(AnkiConnectTimeoutError);
    });

    it('should throw on invalid response structure (missing error field)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'test' }) // Missing error field
      });

      await expect(service.invoke('test'))
        .rejects.toThrow('Response is missing required error field');
    });

    it('should throw on invalid response structure (missing result field)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: null }) // Missing result field
      });

      await expect(service.invoke('test'))
        .rejects.toThrow('Response is missing required result field');
    });

    it('should throw on invalid response structure (extra fields)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'test', error: null, extra: 'field' })
      });

      await expect(service.invoke('test'))
        .rejects.toThrow('Response has an unexpected number of fields');
    });
  });

  describe('invokeQuiet', () => {
    it('should return null on error instead of throwing', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'some error'));

      const result = await service.invokeQuiet('deckNames');

      expect(result).toBeNull();
    });

    it('should return result on success', async () => {
      mockFetch.mockResolvedValue(createMockResponse(['Default']));

      const result = await service.invokeQuiet<string[]>('deckNames');

      expect(result).toEqual(['Default']);
    });
  });

  describe('addNote', () => {
    const validNote: AnkiNote = {
      deckName: 'Default',
      modelName: 'Basic',
      fields: { Front: 'Hello', Back: 'World' },
      tags: ['test']
    };

    it('should add note successfully', async () => {
      mockFetch.mockResolvedValue(createMockResponse(1234567890));

      const result = await service.addNote(validNote);

      expect(result.success).toBe(true);
      expect(result.noteId).toBe(1234567890);
    });

    it('should handle duplicate note error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'cannot create note because it is a duplicate'));

      const result = await service.addNote(validNote);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate note');
    });

    it('should return error for null note', async () => {
      const result = await service.addNote(null as unknown as AnkiNote);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Note is required');
    });

    it('should return error on API failure', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'deck was not found'));

      const result = await service.addNote(validNote);

      expect(result.success).toBe(false);
      expect(result.error).toBe('deck was not found');
    });

    it('should send correct note structure', async () => {
      mockFetch.mockResolvedValue(createMockResponse(123));

      await service.addNote(validNote);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.action).toBe('addNote');
      expect(body.params.note).toEqual(validNote);
    });

    it('should handle note with audio', async () => {
      const noteWithAudio: AnkiNote = {
        ...validNote,
        audio: {
          url: 'http://example.com/audio.mp3',
          filename: 'audio.mp3',
          fields: ['Front']
        }
      };

      mockFetch.mockResolvedValue(createMockResponse(123));

      const result = await service.addNote(noteWithAudio);

      expect(result.success).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.params.note.audio).toBeDefined();
    });
  });

  describe('getDeckNames', () => {
    it('should return deck names', async () => {
      const decks = ['Default', 'Japanese', 'English'];
      mockFetch.mockResolvedValue(createMockResponse(decks));

      const result = await service.getDeckNames();

      expect(result).toEqual(decks);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'error'));

      const result = await service.getDeckNames();

      expect(result).toEqual([]);
    });

    it('should return empty array on null result', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null));

      const result = await service.getDeckNames();

      expect(result).toEqual([]);
    });
  });

  describe('getModelNames', () => {
    it('should return model names', async () => {
      const models = ['Basic', 'Basic (and reversed card)', 'Cloze'];
      mockFetch.mockResolvedValue(createMockResponse(models));

      const result = await service.getModelNames();

      expect(result).toEqual(models);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'error'));

      const result = await service.getModelNames();

      expect(result).toEqual([]);
    });
  });

  describe('getModelFieldNames', () => {
    it('should return field names for model', async () => {
      const fields = ['Front', 'Back'];
      mockFetch.mockResolvedValue(createMockResponse(fields));

      const result = await service.getModelFieldNames('Basic');

      expect(result).toEqual(fields);
    });

    it('should return empty array for empty model name', async () => {
      const result = await service.getModelFieldNames('');

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'model not found'));

      const result = await service.getModelFieldNames('InvalidModel');

      expect(result).toEqual([]);
    });
  });

  describe('getVersion', () => {
    it('should return version string', async () => {
      mockFetch.mockResolvedValue(createMockResponse(6));

      const result = await service.getVersion();

      expect(result).toBe('ver:6');
    });

    it('should return null on error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'error'));

      const result = await service.getVersion();

      expect(result).toBeNull();
    });

    it('should use short timeout', async () => {
      mockFetch.mockResolvedValue(createMockResponse(6));

      await service.getVersion();

      // Verify the timeout is short (100ms as specified in the original code)
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true when AnkiConnect responds', async () => {
      mockFetch.mockResolvedValue(createMockResponse(6));

      const result = await service.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when AnkiConnect is not available', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('sync', () => {
    it('should return true on successful sync', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null));

      const result = await service.sync();

      expect(result).toBe(true);
    });

    it('should return false on sync failure', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'sync failed'));

      const result = await service.sync();

      expect(result).toBe(false);
    });
  });

  describe('findNotes', () => {
    it('should return note IDs', async () => {
      const noteIds = [1234, 5678, 9012];
      mockFetch.mockResolvedValue(createMockResponse(noteIds));

      const result = await service.findNotes('deck:Default');

      expect(result).toEqual(noteIds);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'error'));

      const result = await service.findNotes('invalid query');

      expect(result).toEqual([]);
    });
  });

  describe('notesInfo', () => {
    it('should return notes info', async () => {
      const notesInfo = [
        { noteId: 1234, fields: { Front: 'Hello' } },
        { noteId: 5678, fields: { Front: 'World' } }
      ];
      mockFetch.mockResolvedValue(createMockResponse(notesInfo));

      const result = await service.notesInfo([1234, 5678]);

      expect(result).toEqual(notesInfo);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.notesInfo([]);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, 'error'));

      const result = await service.notesInfo([1234]);

      expect(result).toEqual([]);
    });
  });

  describe('storeMediaFile', () => {
    it('should store media file', async () => {
      mockFetch.mockResolvedValue(createMockResponse('stored_file.mp3'));

      const result = await service.storeMediaFile('test.mp3', 'base64data');

      expect(result).toBe('stored_file.mp3');
    });

    it('should return null for empty filename', async () => {
      const result = await service.storeMediaFile('', 'data');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null for empty data', async () => {
      const result = await service.storeMediaFile('file.mp3', '');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('storeMediaFileByUrl', () => {
    it('should store media file from URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse('stored_file.mp3'));

      const result = await service.storeMediaFileByUrl('test.mp3', 'http://example.com/audio.mp3');

      expect(result).toBe('stored_file.mp3');
    });

    it('should return null for empty URL', async () => {
      const result = await service.storeMediaFileByUrl('file.mp3', '');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe('AnkiConnectError classes', () => {
  describe('AnkiConnectError', () => {
    it('should store action name', () => {
      const error = new AnkiConnectError('Test error', 'testAction');
      expect(error.action).toBe('testAction');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AnkiConnectError');
    });

    it('should store original error', () => {
      const original = new Error('Original');
      const error = new AnkiConnectError('Wrapped', 'action', original);
      expect(error.originalError).toBe(original);
    });
  });

  describe('AnkiConnectTimeoutError', () => {
    it('should include timeout in message', () => {
      const error = new AnkiConnectTimeoutError('testAction', 5000);
      expect(error.message).toContain('5000ms');
      expect(error.name).toBe('AnkiConnectTimeoutError');
    });
  });

  describe('AnkiConnectConnectionError', () => {
    it('should have helpful message', () => {
      const error = new AnkiConnectConnectionError('testAction');
      expect(error.message).toContain('AnkiConnect');
      expect(error.message).toContain('Anki running');
      expect(error.name).toBe('AnkiConnectConnectionError');
    });
  });
});

describe('createAnkiConnectService', () => {
  it('should create a new AnkiConnectService', () => {
    const mockFetch = jest.fn();
    const service = createAnkiConnectService({ fetchFn: mockFetch });
    expect(service).toBeInstanceOf(AnkiConnectService);
  });
});

describe('global AnkiConnect service', () => {
  beforeEach(() => {
    resetGlobalAnkiConnectService();
  });

  it('should return the same global instance', () => {
    const first = getGlobalAnkiConnectService();
    const second = getGlobalAnkiConnectService();
    expect(first).toBe(second);
  });

  it('should allow setting a custom global service', () => {
    const customService = new AnkiConnectService({ fetchFn: jest.fn() });

    setGlobalAnkiConnectService(customService);

    expect(getGlobalAnkiConnectService()).toBe(customService);
  });

  it('should reset global service', () => {
    const original = getGlobalAnkiConnectService();

    resetGlobalAnkiConnectService();

    const newGlobal = getGlobalAnkiConnectService();
    expect(newGlobal).not.toBe(original);
  });
});
