/**
 * Unit Tests for Builtin Dictionary
 */

import {
  Builtin,
  BuiltinLoadError,
  createBuiltin,
  getGlobalBuiltin,
  setGlobalBuiltin,
  resetGlobalBuiltin
} from '../../../src/bg/ts/utils/builtin';

describe('Builtin', () => {
  let builtin: Builtin;

  beforeEach(() => {
    resetGlobalBuiltin();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      builtin = new Builtin();
      expect(builtin.getAvailableDictionaries()).toContain('collins');
    });

    it('should accept custom data paths', () => {
      builtin = new Builtin({
        dataPaths: { custom: 'custom/path.json' }
      });
      expect(builtin.getAvailableDictionaries()).toContain('custom');
      expect(builtin.getAvailableDictionaries()).toContain('collins');
    });
  });

  describe('loadData', () => {
    it('should load collins dictionary successfully', async () => {
      const mockData = {
        hello: { definition: 'a greeting' },
        world: { definition: 'the earth' }
      };
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();

      expect(builtin.isDictionaryLoaded('collins')).toBe(true);
      expect(builtin.getLoadError('collins')).toBeNull();
      expect(builtin.getTermCount('collins')).toBe(2);
    });

    it('should handle load failure gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        status: 404
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();

      expect(builtin.isDictionaryLoaded('collins')).toBe(true);
      expect(builtin.getLoadError('collins')).not.toBeNull();
      expect(builtin.getTermCount('collins')).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();

      expect(builtin.isDictionaryLoaded('collins')).toBe(true);
      expect(builtin.getLoadError('collins')?.message).toBe('Network error');
    });
  });

  describe('loadDictionary', () => {
    it('should load a specific dictionary', async () => {
      const mockData = { test: { value: 'data' } };
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadDictionary('collins');

      expect(builtin.isDictionaryLoaded('collins')).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not reload already loaded dictionary', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadDictionary('collins');
      await builtin.loadDictionary('collins');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown dictionary name', async () => {
      const mockFetch = jest.fn();

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadDictionary('unknown');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(builtin.getLoadError('unknown')).not.toBeNull();
    });
  });

  describe('findTerm', () => {
    beforeEach(async () => {
      const mockData = {
        hello: { definition: 'a greeting', phonetic: '/həˈləʊ/' },
        world: { definition: 'the earth', examples: ['Hello world!'] },
        test: { definition: 'an examination' }
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();
    });

    it('should find term in dictionary', () => {
      const result = builtin.findTerm('collins', 'hello');
      expect(result).not.toBeNull();

      const parsed = JSON.parse(result!);
      expect(parsed.definition).toBe('a greeting');
    });

    it('should return JSON string for found terms', () => {
      const result = builtin.findTerm('collins', 'world');
      expect(result).not.toBeNull();

      const parsed = JSON.parse(result!);
      expect(parsed.examples).toContain('Hello world!');
    });

    it('should return null for unknown terms', () => {
      expect(builtin.findTerm('collins', 'unknownword')).toBeNull();
    });

    it('should return null for unknown dictionary', () => {
      expect(builtin.findTerm('unknowndict', 'hello')).toBeNull();
    });

    it('should return null if dictionary not loaded', () => {
      const unloadedBuiltin = new Builtin();
      expect(unloadedBuiltin.findTerm('collins', 'hello')).toBeNull();
    });
  });

  describe('findTermRaw', () => {
    beforeEach(async () => {
      const mockData = {
        hello: { definition: 'a greeting', phonetic: '/həˈləʊ/' }
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();
    });

    it('should return raw object for found terms', () => {
      const result = builtin.findTermRaw('collins', 'hello');
      expect(result).not.toBeNull();
      expect(result?.definition).toBe('a greeting');
    });

    it('should return null for unknown terms', () => {
      expect(builtin.findTermRaw('collins', 'unknown')).toBeNull();
    });

    it('should return null for unknown dictionary', () => {
      expect(builtin.findTermRaw('unknowndict', 'hello')).toBeNull();
    });
  });

  describe('hasTerm', () => {
    beforeEach(async () => {
      const mockData = { hello: { definition: 'a greeting' } };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();
    });

    it('should return true for existing terms', () => {
      expect(builtin.hasTerm('collins', 'hello')).toBe(true);
    });

    it('should return false for non-existing terms', () => {
      expect(builtin.hasTerm('collins', 'unknown')).toBe(false);
    });

    it('should return false for unknown dictionary', () => {
      expect(builtin.hasTerm('unknowndict', 'hello')).toBe(false);
    });
  });

  describe('getLoadedDictionaries', () => {
    it('should return list of loaded dictionaries', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();

      const loaded = builtin.getLoadedDictionaries();
      expect(loaded).toContain('collins');
    });

    it('should return empty array before loading', () => {
      builtin = new Builtin();
      expect(builtin.getLoadedDictionaries()).toEqual([]);
    });
  });

  describe('getTermCount', () => {
    it('should return correct term count', async () => {
      const mockData = {
        word1: {},
        word2: {},
        word3: {}
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();

      expect(builtin.getTermCount('collins')).toBe(3);
    });

    it('should return 0 for unloaded dictionary', () => {
      builtin = new Builtin();
      expect(builtin.getTermCount('collins')).toBe(0);
    });

    it('should return 0 for unknown dictionary', () => {
      builtin = new Builtin();
      expect(builtin.getTermCount('unknown')).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all loaded data', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ test: {} })
      });

      builtin = new Builtin({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await builtin.loadData();
      expect(builtin.isDictionaryLoaded('collins')).toBe(true);

      builtin.reset();

      expect(builtin.isDictionaryLoaded('collins')).toBe(false);
      expect(builtin.getLoadedDictionaries()).toEqual([]);
    });
  });
});

describe('BuiltinLoadError', () => {
  it('should include dictionary name and status code', () => {
    const error = new BuiltinLoadError('Load failed', 'collins', 404);

    expect(error.message).toBe('Load failed');
    expect(error.dictName).toBe('collins');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('BuiltinLoadError');
  });

  it('should work without status code', () => {
    const error = new BuiltinLoadError('Invalid data', 'collins');

    expect(error.message).toBe('Invalid data');
    expect(error.dictName).toBe('collins');
    expect(error.statusCode).toBeUndefined();
  });
});

describe('createBuiltin', () => {
  it('should create a new Builtin instance', () => {
    const builtin = createBuiltin();
    expect(builtin).toBeInstanceOf(Builtin);
  });

  it('should accept options', () => {
    const builtin = createBuiltin({
      dataPaths: { custom: 'custom/path.json' }
    });
    expect(builtin).toBeInstanceOf(Builtin);
    expect(builtin.getAvailableDictionaries()).toContain('custom');
  });
});

describe('global builtin', () => {
  beforeEach(() => {
    resetGlobalBuiltin();
  });

  it('should return the same global instance', () => {
    const first = getGlobalBuiltin();
    const second = getGlobalBuiltin();
    expect(first).toBe(second);
  });

  it('should allow setting a custom global builtin', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ custom: {} })
    });

    const customBuiltin = new Builtin({
      fetchFn: mockFetch,
      getURL: (path) => path
    });

    await customBuiltin.loadData();

    setGlobalBuiltin(customBuiltin);

    expect(getGlobalBuiltin()).toBe(customBuiltin);
    expect(getGlobalBuiltin().isDictionaryLoaded('collins')).toBe(true);
  });

  it('should reset global builtin', () => {
    const original = getGlobalBuiltin();

    resetGlobalBuiltin();

    const newGlobal = getGlobalBuiltin();
    expect(newGlobal).not.toBe(original);
  });
});
