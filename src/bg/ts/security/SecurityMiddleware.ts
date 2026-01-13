/**
 * Security Middleware
 * Provides message validation, sender verification, and security controls
 * for the message routing system
 */

import { MessageSender, Message, MessageResponse } from '../interfaces/IMessageHandler';
import {
  validateMessage,
  getActionValidator,
  sanitizeForLog
} from './Validator';

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Enable strict validation (reject unknown actions) */
  strictValidation?: boolean;
  /** Enable sender verification */
  verifySender?: boolean;
  /** Enable debug logging (sanitized) */
  debug?: boolean;
  /** Allowed extension IDs (empty = only self) */
  allowedExtensionIds?: string[];
  /** Rate limit: max messages per second per sender */
  rateLimit?: number;
  /** Actions that bypass validation */
  bypassActions?: string[];
}

/**
 * Security error types
 */
export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly code: SecurityErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export type SecurityErrorCode =
  | 'INVALID_MESSAGE'
  | 'INVALID_PARAMS'
  | 'UNAUTHORIZED_SENDER'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ACTION';

/**
 * Rate limiter for message throttling
 */
class RateLimiter {
  private readonly requests = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs = 1000; // 1 second window

  constructor(maxRequestsPerSecond: number) {
    this.maxRequests = maxRequestsPerSecond;
  }

  /**
   * Check if request should be allowed
   */
  isAllowed(senderId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this sender
    let timestamps = this.requests.get(senderId) || [];

    // Filter to only requests within window
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if under limit
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(senderId, timestamps);

    return true;
  }

  /**
   * Get sender ID from MessageSender
   */
  static getSenderId(sender: MessageSender): string {
    if (sender.tabId !== undefined) {
      return `tab:${sender.tabId}:${sender.frameId || 0}`;
    }
    if (sender.extensionId) {
      return `ext:${sender.extensionId}`;
    }
    return 'unknown';
  }

  /**
   * Clear old entries periodically
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [senderId, timestamps] of this.requests) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(senderId);
      } else {
        this.requests.set(senderId, filtered);
      }
    }
  }
}

/**
 * Security context passed to handlers
 */
export interface SecurityContext {
  /** Whether sender was verified */
  senderVerified: boolean;
  /** Whether params were validated */
  paramsValidated: boolean;
  /** Validated params (if validation succeeded) */
  validatedParams?: unknown;
  /** Original sender info */
  sender: MessageSender;
  /** Timestamp of request */
  timestamp: number;
}

/**
 * Middleware function type
 */
export type MiddlewareFn = (
  message: Message,
  sender: MessageSender,
  next: () => Promise<MessageResponse>
) => Promise<MessageResponse>;

/**
 * Create security middleware
 */
export function createSecurityMiddleware(config: SecurityConfig = {}): MiddlewareFn {
  const {
    strictValidation = false,
    verifySender = true,
    debug = false,
    allowedExtensionIds = [],
    rateLimit = 0,
    bypassActions = []
  } = config;

  // Create rate limiter if configured
  const rateLimiter = rateLimit > 0 ? new RateLimiter(rateLimit) : null;

  // Cleanup rate limiter periodically
  if (rateLimiter) {
    setInterval(() => rateLimiter.cleanup(), 10000);
  }

  return async (
    message: Message,
    sender: MessageSender,
    next: () => Promise<MessageResponse>
  ): Promise<MessageResponse> => {
    const action = message.action;

    // Debug logging (sanitized)
    if (debug) {
      console.log('[Security] Processing message:', {
        action,
        sender: {
          tabId: sender.tabId,
          frameId: sender.frameId,
          extensionId: sender.extensionId ? '[ext]' : undefined
        },
        params: sanitizeForLog(message.params)
      });
    }

    // Check if action bypasses security
    if (bypassActions.includes(action)) {
      return next();
    }

    // 1. Sender verification
    if (verifySender) {
      const senderResult = verifySenderOrigin(sender, allowedExtensionIds);
      if (!senderResult.allowed) {
        if (debug) {
          console.warn('[Security] Sender verification failed:', senderResult.reason);
        }
        return {
          success: false,
          error: 'Unauthorized sender'
        };
      }
    }

    // 2. Rate limiting
    if (rateLimiter) {
      const senderId = RateLimiter.getSenderId(sender);
      if (!rateLimiter.isAllowed(senderId)) {
        if (debug) {
          console.warn('[Security] Rate limit exceeded for:', senderId);
        }
        return {
          success: false,
          error: 'Rate limit exceeded'
        };
      }
    }

    // 3. Message structure validation
    const messageResult = validateMessage(message);
    if (!messageResult.success) {
      if (debug) {
        console.warn('[Security] Message validation failed:', messageResult.error);
      }
      return {
        success: false,
        error: 'Invalid message format'
      };
    }

    // 4. Action-specific parameter validation
    const actionValidator = getActionValidator(action);
    if (actionValidator && message.params !== undefined) {
      const paramsResult = actionValidator(message.params);
      if (!paramsResult.success) {
        if (debug) {
          console.warn('[Security] Params validation failed:', paramsResult.error);
        }
        return {
          success: false,
          error: 'Invalid parameters'
        };
      }
    } else if (strictValidation && !actionValidator && !bypassActions.includes(action)) {
      // In strict mode, reject unknown actions
      if (debug) {
        console.warn('[Security] Unknown action in strict mode:', action);
      }
      return {
        success: false,
        error: 'Unknown action'
      };
    }

    // 5. Continue to handler
    try {
      return await next();
    } catch (error) {
      // Catch and sanitize errors
      if (debug) {
        console.error('[Security] Handler error:', error);
      }
      return {
        success: false,
        error: 'Internal error'
      };
    }
  };
}

/**
 * Verify sender origin
 */
interface SenderVerificationResult {
  allowed: boolean;
  reason?: string;
}

function verifySenderOrigin(
  sender: MessageSender,
  allowedExtensionIds: string[]
): SenderVerificationResult {
  // Get our extension ID
  const selfId = typeof chrome !== 'undefined' && chrome.runtime?.id;

  // If sender has extension ID
  if (sender.extensionId) {
    // Always allow self
    if (selfId && sender.extensionId === selfId) {
      return { allowed: true };
    }
    // Check allowlist
    if (allowedExtensionIds.includes(sender.extensionId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Extension not in allowlist' };
  }

  // Content script from our extension (has tabId but no extensionId in some contexts)
  if (sender.tabId !== undefined) {
    // Verify URL is not a dangerous origin
    if (sender.url) {
      const dangerousOrigins = ['chrome://', 'chrome-extension://', 'moz-extension://'];
      for (const origin of dangerousOrigins) {
        if (sender.url.startsWith(origin) && (!selfId || !sender.url.includes(selfId))) {
          return { allowed: false, reason: 'Dangerous origin' };
        }
      }
    }
    return { allowed: true };
  }

  // Internal messages (no tabId, no extensionId) - typically from service worker
  if (!sender.tabId && !sender.extensionId) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unknown sender type' };
}

/**
 * Create validation-only middleware (no sender verification)
 */
export function createSecurityValidationMiddleware(config: { debug?: boolean } = {}): MiddlewareFn {
  return createSecurityMiddleware({
    verifySender: false,
    strictValidation: true,
    debug: config.debug
  });
}

/**
 * Create rate-limiting middleware
 */
export function createSecurityRateLimitMiddleware(
  maxRequestsPerSecond: number,
  config: { debug?: boolean } = {}
): MiddlewareFn {
  return createSecurityMiddleware({
    verifySender: false,
    strictValidation: false,
    rateLimit: maxRequestsPerSecond,
    debug: config.debug
  });
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: MiddlewareFn[]): MiddlewareFn {
  return async (
    message: Message,
    sender: MessageSender,
    finalHandler: () => Promise<MessageResponse>
  ): Promise<MessageResponse> => {
    // Build chain from right to left
    let next = finalHandler;

    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i]!;
      const currentNext = next;
      next = () => middleware(message, sender, currentNext);
    }

    return next();
  };
}

/**
 * Default security middleware with recommended settings
 */
export const defaultSecurityMiddleware = createSecurityMiddleware({
  verifySender: true,
  strictValidation: false,
  debug: false,
  rateLimit: 100, // 100 messages per second per sender
  bypassActions: [
    // Actions that don't need validation (e.g., simple queries)
    'sandboxPing',
    'sandboxReady'
  ]
});
