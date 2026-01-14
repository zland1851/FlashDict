/**
 * Unit Tests for Options Manager
 */

import {
  OptionsManager,
  MemoryStorageAdapter,
  createOptionsManager,
  getGlobalOptionsManager,
  setGlobalOptionsManager,
  resetGlobalOptionsManager
} from '../../../src/bg/ts/managers/OptionsManager';
import {
  ExtensionOptions,
  DEFAULT_OPTIONS,
  OptionsChangeEvent
} from '../../../src/bg/ts/interfaces/IOptionsStore';

describe('OptionsManager', () => {
  let manager: OptionsManager;
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    manager = new OptionsManager({ storage });
    resetGlobalOptionsManager();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const manager = new OptionsManager({ storage });
      expect(manager).toBeInstanceOf(OptionsManager);
      expect(manager.isLoaded()).toBe(false);
    });

    it('should accept custom defaults', () => {
      const customDefaults = { deckname: 'CustomDeck' };
      const manager = new OptionsManager({ storage, defaults: customDefaults });

      const defaults = manager.getDefaults();
      expect(defaults.deckname).toBe('CustomDeck');
      expect(defaults.typename).toBe(DEFAULT_OPTIONS.typename);
    });
  });

  describe('load', () => {
    it('should load options from storage', async () => {
      storage.setData({ deckname: 'TestDeck', typename: 'TestType' });

      const options = await manager.load();

      expect(options.deckname).toBe('TestDeck');
      expect(options.typename).toBe('TestType');
      expect(manager.isLoaded()).toBe(true);
    });

    it('should apply defaults for missing options', async () => {
      storage.setData({ deckname: 'TestDeck' });

      const options = await manager.load();

      expect(options.deckname).toBe('TestDeck');
      expect(options.typename).toBe(DEFAULT_OPTIONS.typename);
      expect(options.enabled).toBe(DEFAULT_OPTIONS.enabled);
    });

    it('should return all default options when storage is empty', async () => {
      const options = await manager.load();

      expect(options).toEqual(DEFAULT_OPTIONS);
    });

    it('should update current options cache', async () => {
      storage.setData({ deckname: 'TestDeck' });

      await manager.load();
      const current = manager.getCurrent();

      expect(current).not.toBeNull();
      expect(current!.deckname).toBe('TestDeck');
    });
  });

  describe('save', () => {
    it('should save options to storage', async () => {
      const options: ExtensionOptions = {
        ...DEFAULT_OPTIONS,
        deckname: 'SavedDeck',
        typename: 'SavedType'
      };

      await manager.save(options);

      const stored = storage.getData();
      expect(stored.deckname).toBe('SavedDeck');
      expect(stored.typename).toBe('SavedType');
    });

    it('should update current options cache', async () => {
      const options: ExtensionOptions = {
        ...DEFAULT_OPTIONS,
        deckname: 'SavedDeck'
      };

      await manager.save(options);

      expect(manager.getCurrent()!.deckname).toBe('SavedDeck');
    });

    it('should notify subscribers of changes', async () => {
      const callback = jest.fn();
      await manager.load();
      manager.subscribe(callback);

      const newOptions: ExtensionOptions = {
        ...DEFAULT_OPTIONS,
        deckname: 'NewDeck'
      };

      await manager.save(newOptions);

      expect(callback).toHaveBeenCalled();
      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('deckname');
      expect(event.newOptions.deckname).toBe('NewDeck');
    });

    it('should not notify if no previous options (first save)', async () => {
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.save(DEFAULT_OPTIONS);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update specific options', async () => {
      await manager.load();

      const updated = await manager.update({ deckname: 'UpdatedDeck' });

      expect(updated.deckname).toBe('UpdatedDeck');
      expect(updated.typename).toBe(DEFAULT_OPTIONS.typename);
    });

    it('should persist changes to storage', async () => {
      await manager.load();

      await manager.update({ deckname: 'UpdatedDeck' });

      const stored = storage.getData();
      expect(stored.deckname).toBe('UpdatedDeck');
    });

    it('should load options first if not loaded', async () => {
      storage.setData({ deckname: 'ExistingDeck' });

      const updated = await manager.update({ typename: 'NewType' });

      expect(updated.deckname).toBe('ExistingDeck');
      expect(updated.typename).toBe('NewType');
    });

    it('should notify subscribers of changes', async () => {
      const callback = jest.fn();
      await manager.load();
      manager.subscribe(callback);

      await manager.update({ deckname: 'UpdatedDeck' });

      expect(callback).toHaveBeenCalled();
      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('deckname');
    });

    it('should not notify if values did not change', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.update({ deckname: DEFAULT_OPTIONS.deckname });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getCurrent', () => {
    it('should return null before loading', () => {
      expect(manager.getCurrent()).toBeNull();
    });

    it('should return current options after loading', async () => {
      storage.setData({ deckname: 'TestDeck' });

      await manager.load();
      const current = manager.getCurrent();

      expect(current).not.toBeNull();
      expect(current!.deckname).toBe('TestDeck');
    });

    it('should return a copy, not the original', async () => {
      await manager.load();
      const current1 = manager.getCurrent();
      const current2 = manager.getCurrent();

      expect(current1).not.toBe(current2);
      expect(current1).toEqual(current2);
    });
  });

  describe('subscribe', () => {
    it('should add subscriber', async () => {
      await manager.load();
      const callback = jest.fn();

      manager.subscribe(callback);

      expect(manager.getSubscriberCount()).toBe(1);
    });

    it('should return unsubscribe function', async () => {
      await manager.load();
      const callback = jest.fn();

      const unsubscribe = manager.subscribe(callback);
      expect(manager.getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(manager.getSubscriberCount()).toBe(0);
    });

    it('should call subscriber on changes', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.update({ deckname: 'NewDeck' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call subscriber after unsubscribe', async () => {
      await manager.load();
      const callback = jest.fn();
      const unsubscribe = manager.subscribe(callback);

      unsubscribe();
      await manager.update({ deckname: 'NewDeck' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', async () => {
      await manager.load();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.subscribe(callback1);
      manager.subscribe(callback2);

      await manager.update({ deckname: 'NewDeck' });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should continue notifying other subscribers if one throws', async () => {
      await manager.load();
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const successCallback = jest.fn();

      manager.subscribe(errorCallback);
      manager.subscribe(successCallback);

      await manager.update({ deckname: 'NewDeck' });

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset options to defaults', async () => {
      storage.setData({ deckname: 'CustomDeck', typename: 'CustomType' });
      await manager.load();

      const reset = await manager.reset();

      expect(reset).toEqual(DEFAULT_OPTIONS);
      expect(manager.getCurrent()).toEqual(DEFAULT_OPTIONS);
    });

    it('should clear storage and save defaults', async () => {
      storage.setData({ deckname: 'CustomDeck' });
      await manager.load();

      await manager.reset();

      const stored = storage.getData();
      expect(stored.deckname).toBe(DEFAULT_OPTIONS.deckname);
    });

    it('should notify subscribers of reset', async () => {
      storage.setData({ deckname: 'CustomDeck' });
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.reset();

      expect(callback).toHaveBeenCalled();
      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('deckname');
    });
  });

  describe('get', () => {
    it('should get a specific option value', async () => {
      storage.setData({ deckname: 'TestDeck' });
      await manager.load();

      expect(manager.get('deckname')).toBe('TestDeck');
    });

    it('should return undefined before loading', () => {
      expect(manager.get('deckname')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set a specific option value', async () => {
      await manager.load();

      await manager.set('deckname', 'NewDeck');

      expect(manager.get('deckname')).toBe('NewDeck');
    });

    it('should notify subscribers', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.set('deckname', 'NewDeck');

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getDefaults', () => {
    it('should return copy of default options', () => {
      const defaults1 = manager.getDefaults();
      const defaults2 = manager.getDefaults();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });

    it('should include custom defaults', () => {
      const customManager = new OptionsManager({
        storage,
        defaults: { deckname: 'CustomDefault' }
      });

      const defaults = customManager.getDefaults();
      expect(defaults.deckname).toBe('CustomDefault');
    });
  });

  describe('change detection', () => {
    it('should detect changed string values', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.update({ deckname: 'NewDeck' });

      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('deckname');
      expect(event.changedKeys).toHaveLength(1);
    });

    it('should detect changed boolean values', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.update({ enabled: false });

      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('enabled');
    });

    it('should detect changed array values', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.update({
        dictNamelist: [{ objectname: 'test', displayname: 'Test' }]
      });

      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('dictNamelist');
    });

    it('should not report unchanged values', async () => {
      await manager.load();
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.update({
        deckname: 'NewDeck',
        typename: DEFAULT_OPTIONS.typename // Same as default
      });

      const event: OptionsChangeEvent = callback.mock.calls[0][0];
      expect(event.changedKeys).toContain('deckname');
      expect(event.changedKeys).not.toContain('typename');
    });
  });
});

describe('MemoryStorageAdapter', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  it('should get and set data', async () => {
    await storage.set({ key: 'value' });
    const result = await storage.get(null);

    expect(result.key).toBe('value');
  });

  it('should clear data', async () => {
    await storage.set({ key: 'value' });
    await storage.clear();
    const result = await storage.get(null);

    expect(result.key).toBeUndefined();
  });

  it('should merge data on set', async () => {
    await storage.set({ key1: 'value1' });
    await storage.set({ key2: 'value2' });
    const result = await storage.get(null);

    expect(result.key1).toBe('value1');
    expect(result.key2).toBe('value2');
  });
});

describe('createOptionsManager', () => {
  it('should create a new OptionsManager', () => {
    const manager = createOptionsManager({ storage: new MemoryStorageAdapter() });
    expect(manager).toBeInstanceOf(OptionsManager);
  });
});

describe('global options manager', () => {
  beforeEach(() => {
    resetGlobalOptionsManager();
  });

  it('should return the same global instance', () => {
    const first = getGlobalOptionsManager();
    const second = getGlobalOptionsManager();
    expect(first).toBe(second);
  });

  it('should allow setting a custom global manager', () => {
    const customManager = new OptionsManager({
      storage: new MemoryStorageAdapter()
    });

    setGlobalOptionsManager(customManager);

    expect(getGlobalOptionsManager()).toBe(customManager);
  });

  it('should reset global manager', () => {
    const original = getGlobalOptionsManager();

    resetGlobalOptionsManager();

    const newGlobal = getGlobalOptionsManager();
    expect(newGlobal).not.toBe(original);
  });
});
