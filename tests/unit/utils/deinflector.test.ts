/**
 * Unit Tests for Deinflector
 */

import {
  Deinflector,
  DeinflectorLoadError,
  createDeinflector,
  getGlobalDeinflector,
  setGlobalDeinflector,
  resetGlobalDeinflector
} from '../../../src/bg/ts/utils/deinflector';

describe('Deinflector', () => {
  let deinflector: Deinflector;

  beforeEach(() => {
    resetGlobalDeinflector();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      deinflector = new Deinflector();
      expect(deinflector.isLoaded()).toBe(false);
    });

    it('should accept custom data path', () => {
      deinflector = new Deinflector({ dataPath: 'custom/path.json' });
      expect(deinflector.isLoaded()).toBe(false);
    });
  });

  describe('loadData', () => {
    it('should load word forms data successfully', async () => {
      const mockData = { running: 'run', books: 'book', went: 'go' };
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();

      expect(deinflector.isLoaded()).toBe(true);
      expect(deinflector.getLoadError()).toBeNull();
      expect(deinflector.getFormCount()).toBe(3);
    });

    it('should handle load failure gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        status: 404
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      // Should not throw, but set error state
      await deinflector.loadData();

      expect(deinflector.isLoaded()).toBe(true);
      expect(deinflector.getLoadError()).not.toBeNull();
      expect(deinflector.getFormCount()).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();

      expect(deinflector.isLoaded()).toBe(true);
      expect(deinflector.getLoadError()?.message).toBe('Network error');
    });

    it('should not reload if already loaded', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ test: 'data' })
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();
      await deinflector.loadData();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON data', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([1, 2, 3]) // Array instead of object
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();

      expect(deinflector.isLoaded()).toBe(true);
      expect(deinflector.getLoadError()).not.toBeNull();
    });
  });

  describe('deinflect', () => {
    beforeEach(async () => {
      const mockData = {
        running: 'run',
        books: 'book',
        went: 'go',
        better: 'good',
        mice: 'mouse'
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();
    });

    it('should find base form: "running" -> "run"', () => {
      expect(deinflector.deinflect('running')).toBe('run');
    });

    it('should find base form: "books" -> "book"', () => {
      expect(deinflector.deinflect('books')).toBe('book');
    });

    it('should find base form: "went" -> "go"', () => {
      expect(deinflector.deinflect('went')).toBe('go');
    });

    it('should return null for unknown terms', () => {
      expect(deinflector.deinflect('unknown')).toBeNull();
    });

    it('should return null if data not loaded', () => {
      const unloadedDeinflector = new Deinflector();
      expect(unloadedDeinflector.deinflect('running')).toBeNull();
    });

    it('should return null for base forms themselves', () => {
      expect(deinflector.deinflect('run')).toBeNull();
    });
  });

  describe('hasBaseForm', () => {
    beforeEach(async () => {
      const mockData = { running: 'run', books: 'book' };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();
    });

    it('should return true for known inflected forms', () => {
      expect(deinflector.hasBaseForm('running')).toBe(true);
      expect(deinflector.hasBaseForm('books')).toBe(true);
    });

    it('should return false for unknown terms', () => {
      expect(deinflector.hasBaseForm('unknown')).toBe(false);
    });

    it('should return false if data not loaded', () => {
      const unloadedDeinflector = new Deinflector();
      expect(unloadedDeinflector.hasBaseForm('running')).toBe(false);
    });
  });

  describe('getKnownForms', () => {
    it('should return all known inflected forms', async () => {
      const mockData = { running: 'run', books: 'book', went: 'go' };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();

      const forms = deinflector.getKnownForms();
      expect(forms).toContain('running');
      expect(forms).toContain('books');
      expect(forms).toContain('went');
      expect(forms).toHaveLength(3);
    });

    it('should return empty array if data not loaded', () => {
      deinflector = new Deinflector();
      expect(deinflector.getKnownForms()).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset the deinflector state', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ test: 'data' })
      });

      deinflector = new Deinflector({
        fetchFn: mockFetch,
        getURL: (path) => path
      });

      await deinflector.loadData();
      expect(deinflector.isLoaded()).toBe(true);

      deinflector.reset();

      expect(deinflector.isLoaded()).toBe(false);
      expect(deinflector.getLoadError()).toBeNull();
      expect(deinflector.getFormCount()).toBe(0);
    });
  });
});

describe('DeinflectorLoadError', () => {
  it('should include path and status code', () => {
    const error = new DeinflectorLoadError('Load failed', 'data/words.json', 404);

    expect(error.message).toBe('Load failed');
    expect(error.path).toBe('data/words.json');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('DeinflectorLoadError');
  });

  it('should work without status code', () => {
    const error = new DeinflectorLoadError('Invalid data', 'data/words.json');

    expect(error.message).toBe('Invalid data');
    expect(error.path).toBe('data/words.json');
    expect(error.statusCode).toBeUndefined();
  });
});

describe('createDeinflector', () => {
  it('should create a new Deinflector instance', () => {
    const deinflector = createDeinflector();
    expect(deinflector).toBeInstanceOf(Deinflector);
  });

  it('should accept options', () => {
    const deinflector = createDeinflector({ dataPath: 'custom/path.json' });
    expect(deinflector).toBeInstanceOf(Deinflector);
  });
});

describe('global deinflector', () => {
  beforeEach(() => {
    resetGlobalDeinflector();
  });

  it('should return the same global instance', () => {
    const first = getGlobalDeinflector();
    const second = getGlobalDeinflector();
    expect(first).toBe(second);
  });

  it('should allow setting a custom global deinflector', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ custom: 'data' })
    });

    const customDeinflector = new Deinflector({
      fetchFn: mockFetch,
      getURL: (path) => path
    });

    await customDeinflector.loadData();

    setGlobalDeinflector(customDeinflector);

    expect(getGlobalDeinflector()).toBe(customDeinflector);
    expect(getGlobalDeinflector().isLoaded()).toBe(true);
  });

  it('should reset global deinflector', async () => {
    const original = getGlobalDeinflector();

    resetGlobalDeinflector();

    const newGlobal = getGlobalDeinflector();
    expect(newGlobal).not.toBe(original);
  });
});
