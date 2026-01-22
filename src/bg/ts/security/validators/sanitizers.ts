/**
 * Sanitization Helpers
 * Functions for sanitizing data for security
 */

import DOMPurify from 'dompurify';

/**
 * Allowed HTML tags for dictionary content
 */
const ALLOWED_TAGS = [
  'span',
  'div',
  'p',
  'b',
  'i',
  'em',
  'strong',
  'br',
  'ul',
  'ol',
  'li',
  'a',
  'sup',
  'sub',
  'ruby',
  'rt',
  'rp',
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

/**
 * Allowed HTML attributes for dictionary content
 */
const ALLOWED_ATTR = ['class', 'style', 'href', 'title', 'lang', 'dir'];

/**
 * Sanitize string for safe logging (remove sensitive data)
 */
export function sanitizeForLog(
  value: unknown,
  sensitiveKeys: string[] = ['password', 'id']
): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, sensitiveKeys));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeForLog(val, sensitiveKeys);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Escape HTML to plain text (converts all tags to entities)
 * Use this when you need to display raw text without any HTML rendering
 */
export function escapeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize HTML using DOMPurify to allow safe tags while removing dangerous content
 * Use this for dictionary content that needs to preserve formatting
 *
 * @param html - The HTML string to sanitize
 * @param options - Optional DOMPurify configuration overrides
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  html: string,
  options?: {
    allowedTags?: string[];
    allowedAttr?: string[];
    allowDataAttr?: boolean;
  }
): string {
  // Check if DOMPurify is available (requires DOM context)
  if (typeof window === 'undefined' || !DOMPurify.isSupported) {
    // Fallback to escape in non-DOM environments (Service Worker)
    console.warn('[sanitizeHtml] DOMPurify not available, falling back to escape');
    return escapeHtml(html);
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: options?.allowedTags ?? ALLOWED_TAGS,
    ALLOWED_ATTR: options?.allowedAttr ?? ALLOWED_ATTR,
    ALLOW_DATA_ATTR: options?.allowDataAttr ?? false,
    // Security: prevent javascript: URLs
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Security: prevent DOM clobbering
    SANITIZE_DOM: true,
  });
}

/**
 * Sanitize HTML for dictionary popup display
 * More permissive than default, allows common dictionary formatting
 */
export function sanitizeDictionaryHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...ALLOWED_TAGS, 'img', 'audio', 'source'],
    allowedAttr: [...ALLOWED_ATTR, 'src', 'alt', 'controls', 'type'],
    allowDataAttr: true,
  });
}

/**
 * Validate and sanitize script name
 */
export function sanitizeScriptName(name: string): string | null {
  // Remove any path traversal attempts
  const sanitized = name
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim();

  // Validate format
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized) && !sanitized.includes('://')) {
    return null;
  }

  return sanitized;
}
