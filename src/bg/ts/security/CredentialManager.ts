/**
 * Credential Manager
 * Secure session-only credential storage
 *
 * Security principles:
 * - Credentials are NEVER persisted to storage
 * - Credentials are cleared on session end (service worker restart)
 * - Credentials are encrypted in memory (basic obfuscation)
 * - Access is controlled through typed interface
 */

/**
 * Credential types supported
 */
export type CredentialType = 'ankiweb' | 'api_key';

/**
 * Credential entry
 */
interface CredentialEntry {
  /** Obfuscated value */
  value: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** Expiry timestamp (0 = no expiry) */
  expiresAt: number;
}

/**
 * Credential Manager configuration
 */
export interface CredentialManagerConfig {
  /** Default credential expiry in milliseconds (0 = no expiry) */
  defaultExpiryMs?: number;
  /** Whether to log access (sanitized) */
  debug?: boolean;
  /** Maximum credentials per type */
  maxCredentialsPerType?: number;
}

/**
 * Credential Manager
 * Provides secure, session-only credential storage
 */
export class CredentialManager {
  private readonly credentials = new Map<string, CredentialEntry>();
  private readonly config: Required<CredentialManagerConfig>;
  private readonly obfuscationKey: string;

  constructor(config: CredentialManagerConfig = {}) {
    this.config = {
      defaultExpiryMs: config.defaultExpiryMs ?? 0,
      debug: config.debug ?? false,
      maxCredentialsPerType: config.maxCredentialsPerType ?? 10
    };

    // Generate session-unique obfuscation key
    this.obfuscationKey = this.generateObfuscationKey();

    // Clear expired credentials periodically
    setInterval(() => this.clearExpired(), 60000);
  }

  /**
   * Store a credential
   * @param type - Credential type
   * @param key - Credential key (e.g., username, service name)
   * @param value - Credential value (password, API key)
   * @param expiryMs - Optional expiry in milliseconds
   */
  set(
    type: CredentialType,
    key: string,
    value: string,
    expiryMs?: number
  ): void {
    const compositeKey = this.makeKey(type, key);
    const now = Date.now();
    const expiry = expiryMs ?? this.config.defaultExpiryMs;

    // Check max credentials limit
    const typeCredentials = this.getCredentialsByType(type);
    if (typeCredentials.length >= this.config.maxCredentialsPerType) {
      // Remove oldest
      const oldest = typeCredentials.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)[0];
      if (oldest) {
        this.credentials.delete(this.makeKey(type, oldest.key));
      }
    }

    this.credentials.set(compositeKey, {
      value: this.obfuscate(value),
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: expiry > 0 ? now + expiry : 0
    });

    if (this.config.debug) {
      console.log('[CredentialManager] Stored credential:', {
        type,
        key: this.sanitizeKey(key),
        expiresIn: expiry > 0 ? `${expiry}ms` : 'never'
      });
    }
  }

  /**
   * Get a credential
   * @param type - Credential type
   * @param key - Credential key
   * @returns Credential value or undefined
   */
  get(type: CredentialType, key: string): string | undefined {
    const compositeKey = this.makeKey(type, key);
    const entry = this.credentials.get(compositeKey);

    if (!entry) {
      return undefined;
    }

    // Check expiry
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.credentials.delete(compositeKey);
      if (this.config.debug) {
        console.log('[CredentialManager] Credential expired:', {
          type,
          key: this.sanitizeKey(key)
        });
      }
      return undefined;
    }

    // Update last access
    entry.lastAccessedAt = Date.now();

    if (this.config.debug) {
      console.log('[CredentialManager] Accessed credential:', {
        type,
        key: this.sanitizeKey(key)
      });
    }

    return this.deobfuscate(entry.value);
  }

  /**
   * Check if credential exists
   * @param type - Credential type
   * @param key - Credential key
   * @returns true if exists and not expired
   */
  has(type: CredentialType, key: string): boolean {
    const compositeKey = this.makeKey(type, key);
    const entry = this.credentials.get(compositeKey);

    if (!entry) {
      return false;
    }

    // Check expiry
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.credentials.delete(compositeKey);
      return false;
    }

    return true;
  }

  /**
   * Delete a credential
   * @param type - Credential type
   * @param key - Credential key
   * @returns true if deleted
   */
  delete(type: CredentialType, key: string): boolean {
    const compositeKey = this.makeKey(type, key);
    const deleted = this.credentials.delete(compositeKey);

    if (this.config.debug && deleted) {
      console.log('[CredentialManager] Deleted credential:', {
        type,
        key: this.sanitizeKey(key)
      });
    }

    return deleted;
  }

  /**
   * Delete all credentials of a type
   * @param type - Credential type
   * @returns Number of deleted credentials
   */
  deleteByType(type: CredentialType): number {
    const prefix = `${type}:`;
    let count = 0;

    for (const key of this.credentials.keys()) {
      if (key.startsWith(prefix)) {
        this.credentials.delete(key);
        count++;
      }
    }

    if (this.config.debug && count > 0) {
      console.log('[CredentialManager] Deleted credentials by type:', {
        type,
        count
      });
    }

    return count;
  }

  /**
   * Clear all credentials
   */
  clear(): void {
    const count = this.credentials.size;
    this.credentials.clear();

    if (this.config.debug) {
      console.log('[CredentialManager] Cleared all credentials:', { count });
    }
  }

  /**
   * Get credential count
   * @param type - Optional type filter
   * @returns Number of credentials
   */
  count(type?: CredentialType): number {
    if (!type) {
      return this.credentials.size;
    }

    return this.getCredentialsByType(type).length;
  }

  /**
   * Clear expired credentials
   */
  private clearExpired(): void {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.credentials) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        this.credentials.delete(key);
        count++;
      }
    }

    if (this.config.debug && count > 0) {
      console.log('[CredentialManager] Cleared expired credentials:', { count });
    }
  }

  /**
   * Get credentials by type (metadata only)
   */
  private getCredentialsByType(type: CredentialType): Array<{
    key: string;
    createdAt: number;
    lastAccessedAt: number;
  }> {
    const prefix = `${type}:`;
    const result: Array<{
      key: string;
      createdAt: number;
      lastAccessedAt: number;
    }> = [];

    for (const [compositeKey, entry] of this.credentials) {
      if (compositeKey.startsWith(prefix)) {
        result.push({
          key: compositeKey.slice(prefix.length),
          createdAt: entry.createdAt,
          lastAccessedAt: entry.lastAccessedAt
        });
      }
    }

    return result;
  }

  /**
   * Make composite key
   */
  private makeKey(type: CredentialType, key: string): string {
    return `${type}:${key}`;
  }

  /**
   * Sanitize key for logging
   */
  private sanitizeKey(key: string): string {
    if (key.length <= 4) {
      return '****';
    }
    return key.slice(0, 2) + '****' + key.slice(-2);
  }

  /**
   * Generate session-unique obfuscation key
   */
  private generateObfuscationKey(): string {
    // Use crypto if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: less secure but still provides some obfuscation
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /**
   * Obfuscate value (basic XOR-based obfuscation)
   * Note: This is NOT encryption, just memory obfuscation to prevent casual inspection
   */
  private obfuscate(value: string): string {
    const result: number[] = [];
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      const keyCode = this.obfuscationKey.charCodeAt(i % this.obfuscationKey.length);
      result.push(charCode ^ keyCode);
    }
    return btoa(String.fromCharCode(...result));
  }

  /**
   * Deobfuscate value
   */
  private deobfuscate(obfuscated: string): string {
    const decoded = atob(obfuscated);
    const result: string[] = [];
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyCode = this.obfuscationKey.charCodeAt(i % this.obfuscationKey.length);
      result.push(String.fromCharCode(charCode ^ keyCode));
    }
    return result.join('');
  }
}

/**
 * AnkiWeb specific credential helpers
 */
export class AnkiWebCredentials {
  constructor(private readonly manager: CredentialManager) {}

  /**
   * Store AnkiWeb credentials
   */
  setCredentials(username: string, password: string): void {
    this.manager.set('ankiweb', 'username', username);
    this.manager.set('ankiweb', 'password', password);
  }

  /**
   * Get AnkiWeb credentials
   */
  getCredentials(): { username: string; password: string } | null {
    const username = this.manager.get('ankiweb', 'username');
    const password = this.manager.get('ankiweb', 'password');

    if (!username || !password) {
      return null;
    }

    return { username, password };
  }

  /**
   * Check if AnkiWeb credentials exist
   */
  hasCredentials(): boolean {
    return (
      this.manager.has('ankiweb', 'username') &&
      this.manager.has('ankiweb', 'password')
    );
  }

  /**
   * Clear AnkiWeb credentials
   */
  clearCredentials(): void {
    this.manager.deleteByType('ankiweb');
  }

  /**
   * Store session token
   */
  setSessionToken(token: string, expiryMs: number = 3600000): void {
    this.manager.set('ankiweb', 'session', token, expiryMs);
  }

  /**
   * Get session token
   */
  getSessionToken(): string | undefined {
    return this.manager.get('ankiweb', 'session');
  }
}

/**
 * Create credential manager with default config
 */
export function createCredentialManager(
  config?: CredentialManagerConfig
): CredentialManager {
  return new CredentialManager(config);
}

/**
 * Global credential manager instance
 */
let globalCredentialManager: CredentialManager | null = null;

/**
 * Get global credential manager
 */
export function getCredentialManager(): CredentialManager {
  if (!globalCredentialManager) {
    globalCredentialManager = new CredentialManager();
  }
  return globalCredentialManager;
}

/**
 * Set global credential manager
 */
export function setCredentialManager(manager: CredentialManager): void {
  globalCredentialManager = manager;
}

/**
 * Reset global credential manager
 */
export function resetCredentialManager(): void {
  globalCredentialManager?.clear();
  globalCredentialManager = null;
}
