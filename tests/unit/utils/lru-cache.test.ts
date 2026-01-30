/**
 * Unit Tests for LRU Cache
 */

import { LRUCache, EvictionCallback } from '../../../src/fg/ts/utils/lru-cache';

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should set and get values', () => {
      const cache = new LRUCache<string>(10);
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for missing keys', () => {
      const cache = new LRUCache<string>(10);
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      const cache = new LRUCache<string>(10);
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
      expect(cache.size).toBe(1);
    });

    it('should report correct size', () => {
      const cache = new LRUCache<string>(10);
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });

    it('should check if key exists with has()', () => {
      const cache = new LRUCache<string>(10);
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete entries', () => {
      const cache = new LRUCache<string>(10);
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.size).toBe(0);
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<string>(10);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      const cache = new LRUCache<string>(3);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
      expect(cache.size).toBe(3);
    });

    it('should update LRU order on get', () => {
      const cache = new LRUCache<string>(3);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1, making it most recently used
      cache.get('key1');

      cache.set('key4', 'value4'); // Should evict key2 (now oldest)

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on set of existing key', () => {
      const cache = new LRUCache<string>(3);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update key1, making it most recently used
      cache.set('key1', 'updated');

      cache.set('key4', 'value4'); // Should evict key2 (now oldest)

      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire entries after TTL', () => {
      const cache = new LRUCache<string>(10, 1000); // 1 second TTL
      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');

      // Advance time past TTL
      jest.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire entries when TTL is 0', () => {
      const cache = new LRUCache<string>(10, 0); // No TTL
      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1000000);

      expect(cache.get('key1')).toBe('value1');
    });

    it('should return false for has() on expired entries', () => {
      const cache = new LRUCache<string>(10, 1000);
      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1001);

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('eviction callback', () => {
    it('should call eviction callback when entry is evicted by capacity', () => {
      const evicted: Array<{ key: string; value: string }> = [];
      const onEvict: EvictionCallback<string> = (key, value) => {
        evicted.push({ key, value });
      };

      const cache = new LRUCache<string>(2, 0, onEvict);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Evicts key1

      expect(evicted).toEqual([{ key: 'key1', value: 'value1' }]);
    });

    it('should call eviction callback when entry is deleted', () => {
      const evicted: Array<{ key: string; value: string }> = [];
      const onEvict: EvictionCallback<string> = (key, value) => {
        evicted.push({ key, value });
      };

      const cache = new LRUCache<string>(10, 0, onEvict);
      cache.set('key1', 'value1');
      cache.delete('key1');

      expect(evicted).toEqual([{ key: 'key1', value: 'value1' }]);
    });

    it('should call eviction callback for each entry on clear', () => {
      const evicted: Array<{ key: string; value: string }> = [];
      const onEvict: EvictionCallback<string> = (key, value) => {
        evicted.push({ key, value });
      };

      const cache = new LRUCache<string>(10, 0, onEvict);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(evicted).toHaveLength(2);
      expect(evicted).toContainEqual({ key: 'key1', value: 'value1' });
      expect(evicted).toContainEqual({ key: 'key2', value: 'value2' });
    });

    it('should call eviction callback when TTL expires on get', () => {
      jest.useFakeTimers();
      const evicted: Array<{ key: string; value: string }> = [];
      const onEvict: EvictionCallback<string> = (key, value) => {
        evicted.push({ key, value });
      };

      const cache = new LRUCache<string>(10, 1000, onEvict);
      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1001);
      cache.get('key1'); // Triggers expiration check

      expect(evicted).toEqual([{ key: 'key1', value: 'value1' }]);
      jest.useRealTimers();
    });
  });

  describe('audio element cleanup use case', () => {
    it('should clean up audio elements when evicted', () => {
      const pauseCalls: string[] = [];
      const srcClears: string[] = [];

      const createMockAudio = (url: string) => ({
        url,
        pause: () => pauseCalls.push(url),
        set src(value: string) {
          if (value === '') srcClears.push(url);
        },
      });

      type MockAudio = ReturnType<typeof createMockAudio>;

      const cache = new LRUCache<MockAudio>(2, 0, (_key, audio) => {
        audio.pause();
        audio.src = '';
      });

      cache.set('url1', createMockAudio('url1'));
      cache.set('url2', createMockAudio('url2'));
      cache.set('url3', createMockAudio('url3')); // Evicts url1

      expect(pauseCalls).toContain('url1');
      expect(srcClears).toContain('url1');
    });
  });
});
