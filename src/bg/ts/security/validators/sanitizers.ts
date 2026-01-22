/**
 * Sanitization Helpers
 * Functions for sanitizing data for security
 */

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
 * Sanitize HTML to prevent XSS (basic implementation)
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
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
