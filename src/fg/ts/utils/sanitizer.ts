/**
 * HTML Sanitizer for Frontend
 * Uses DOMPurify to sanitize dictionary HTML content
 */

import DOMPurify from 'dompurify';

/**
 * Allowed HTML tags for dictionary content display
 */
const ALLOWED_TAGS = [
  // Text formatting
  'span',
  'div',
  'p',
  'b',
  'i',
  'em',
  'strong',
  'u',
  's',
  'br',
  'hr',
  // Lists
  'ul',
  'ol',
  'li',
  // Links
  'a',
  // Ruby (for Asian languages)
  'ruby',
  'rt',
  'rp',
  // Superscript/subscript
  'sup',
  'sub',
  // Tables
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Media (for audio playback buttons)
  'img',
  'audio',
  'source',
];

/**
 * Allowed HTML attributes
 */
const ALLOWED_ATTR = [
  'class',
  'style',
  'href',
  'title',
  'lang',
  'dir',
  // Data attributes for event handlers
  'data-nindex',
  'data-dindex',
  'data-sound',
  // Media attributes
  'src',
  'alt',
  'controls',
  'type',
];

/**
 * Sanitize HTML for dictionary popup display
 * Allows safe tags for dictionary formatting while removing dangerous content
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeDictionaryHtml(html: string): string {
  if (!DOMPurify.isSupported) {
    console.warn('[sanitizeDictionaryHtml] DOMPurify not supported');
    return escapeHtml(html);
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    // Security: prevent javascript: URLs
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Security: prevent DOM clobbering
    SANITIZE_DOM: true,
  });
}

/**
 * Escape HTML to plain text (fallback)
 */
export function escapeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
