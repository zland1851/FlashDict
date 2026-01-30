/**
 * LRU Cache with eviction callback
 * Used for resource management (e.g., audio elements) with automatic cleanup
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export type EvictionCallback<T> = (key: string, value: T) => void;

export class LRUCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly onEvict?: EvictionCallback<T>;

  /**
   * Create a new LRU cache
   * @param maxSize Maximum number of entries (default: 100)
   * @param ttlMs Time-to-live in milliseconds (default: 5 minutes, 0 = no TTL)
   * @param onEvict Callback invoked when an entry is evicted
   */
  constructor(maxSize: number = 100, ttlMs: number = 5 * 60 * 1000, onEvict?: EvictionCallback<T>) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
    this.onEvict = onEvict;
  }

  /**
   * Get a value from the cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL (skip if ttl is 0)
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // Delete existing entry to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry and invoke eviction callback
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all entries, invoking eviction callback for each
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache.entries()) {
        this.onEvict(key, entry.value);
      }
    }
    this.cache.clear();
  }

  /**
   * Get the current number of entries
   */
  get size(): number {
    return this.cache.size;
  }
}
