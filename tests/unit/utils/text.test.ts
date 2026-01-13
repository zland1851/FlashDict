/**
 * Unit Tests for Text Utilities
 */

import {
  escapeHtmlTag,
  escapeRegExp,
  replaceAll,
  searchAll,
  isEmpty,
  isShortAndNum,
  isChinese,
  isInvalid,
  cutSentence,
  highlightWord,
  isPDFJSPage,
  selectedText,
  isValidElement
} from '../../../src/fg/ts/utils/text';

describe('Text Utilities', () => {
  describe('escapeHtmlTag', () => {
    it('should escape < and > characters', () => {
      expect(escapeHtmlTag('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape & character', () => {
      expect(escapeHtmlTag('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape all HTML special characters together', () => {
      expect(escapeHtmlTag('<div class="test">&nbsp;</div>'))
        .toBe('&lt;div class="test"&gt;&amp;nbsp;&lt;/div&gt;');
    });

    it('should return empty string for null/undefined', () => {
      expect(escapeHtmlTag(null as unknown as string)).toBe('');
      expect(escapeHtmlTag(undefined as unknown as string)).toBe('');
    });

    it('should return original string if no special characters', () => {
      expect(escapeHtmlTag('hello world')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(escapeHtmlTag('')).toBe('');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape all regex special characters', () => {
      const special = '.*+?^${}()|[]\\';
      const escaped = escapeRegExp(special);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      expect(escapeRegExp(null as unknown as string)).toBe('');
      expect(escapeRegExp(undefined as unknown as string)).toBe('');
    });

    it('should not modify regular characters', () => {
      expect(escapeRegExp('hello world')).toBe('hello world');
    });

    it('should escape mixed content', () => {
      expect(escapeRegExp('hello (world)?')).toBe('hello \\(world\\)\\?');
    });
  });

  describe('replaceAll', () => {
    it('should replace all occurrences of a string', () => {
      expect(replaceAll('hello hello hello', 'hello', 'hi')).toBe('hi hi hi');
    });

    it('should handle strings with regex special characters', () => {
      expect(replaceAll('1+1=2 and 2+2=4', '+', ' plus ')).toBe('1 plus 1=2 and 2 plus 2=4');
    });

    it('should return original string if search not found', () => {
      expect(replaceAll('hello world', 'foo', 'bar')).toBe('hello world');
    });

    it('should handle empty search string', () => {
      expect(replaceAll('hello', '', 'x')).toBe('hello');
    });

    it('should handle empty target string', () => {
      expect(replaceAll('', 'hello', 'hi')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(replaceAll(null as unknown as string, 'a', 'b')).toBe('');
      expect(replaceAll('hello', null as unknown as string, 'b')).toBe('hello');
    });
  });

  describe('searchAll', () => {
    it('should find all indices of a substring', () => {
      expect(searchAll('abcabc', 'a')).toEqual([0, 3]);
    });

    it('should handle case-insensitive search', () => {
      expect(searchAll('AbcABC', 'abc')).toEqual([0, 3]);
    });

    it('should return empty array when not found', () => {
      expect(searchAll('hello world', 'xyz')).toEqual([]);
    });

    it('should handle regex special characters in search', () => {
      expect(searchAll('a.b.c', '.')).toEqual([1, 3]);
    });

    it('should handle empty strings', () => {
      expect(searchAll('', 'a')).toEqual([]);
      expect(searchAll('hello', '')).toEqual([]);
    });

    it('should find overlapping matches', () => {
      expect(searchAll('aaa', 'a')).toEqual([0, 1, 2]);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      // Note: whitespace is considered non-empty
      expect(isEmpty('   ')).toBe(false);
    });
  });

  describe('isShortAndNum', () => {
    it('should return true for strings shorter than 3 characters', () => {
      expect(isShortAndNum('ab')).toBe(true);
      expect(isShortAndNum('a')).toBe(true);
    });

    it('should return true for strings containing numbers', () => {
      expect(isShortAndNum('hello123')).toBe(true);
      expect(isShortAndNum('1abc')).toBe(true);
    });

    it('should return false for valid words without numbers', () => {
      expect(isShortAndNum('hello')).toBe(false);
      expect(isShortAndNum('abc')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(isShortAndNum('')).toBe(true);
    });

    it('should return true for null/undefined', () => {
      expect(isShortAndNum(null as unknown as string)).toBe(true);
      expect(isShortAndNum(undefined as unknown as string)).toBe(true);
    });
  });

  describe('isChinese', () => {
    it('should return true for Chinese characters', () => {
      expect(isChinese('你好')).toBe(true);
      expect(isChinese('世界')).toBe(true);
    });

    it('should return true for mixed Chinese and English', () => {
      expect(isChinese('hello你好')).toBe(true);
    });

    it('should return false for English only', () => {
      expect(isChinese('hello')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isChinese('')).toBe(false);
    });

    it('should return false for numbers only', () => {
      expect(isChinese('12345')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isChinese(null as unknown as string)).toBe(false);
      expect(isChinese(undefined as unknown as string)).toBe(false);
    });
  });

  describe('isInvalid', () => {
    it('should return false for Chinese characters (always valid)', () => {
      expect(isInvalid('你好')).toBe(false);
      expect(isInvalid('你')).toBe(false); // Even single Chinese char is valid
    });

    it('should return true for empty string', () => {
      expect(isInvalid('')).toBe(true);
    });

    it('should return true for short non-Chinese words', () => {
      expect(isInvalid('ab')).toBe(true);
    });

    it('should return true for words with numbers', () => {
      expect(isInvalid('test123')).toBe(true);
    });

    it('should return false for valid English words', () => {
      expect(isInvalid('hello')).toBe(false);
      expect(isInvalid('abc')).toBe(false);
    });

    it('should return true for null/undefined', () => {
      expect(isInvalid(null as unknown as string)).toBe(true);
      expect(isInvalid(undefined as unknown as string)).toBe(true);
    });
  });

  describe('highlightWord', () => {
    it('should wrap word in bold tags', () => {
      expect(highlightWord('hello world', 'hello')).toBe('<b>hello</b> world');
    });

    it('should highlight multiple occurrences', () => {
      expect(highlightWord('hello hello', 'hello')).toBe('<b>hello</b> <b>hello</b>');
    });

    it('should handle empty inputs', () => {
      expect(highlightWord('', 'word')).toBe('');
      expect(highlightWord('text', '')).toBe('text');
    });

    it('should handle multi-word phrases', () => {
      expect(highlightWord('the quick brown fox', 'quick brown'))
        .toBe('the <b>quick</b> <b>brown</b> fox');
    });
  });

  describe('cutSentence', () => {
    it('should extract sentence containing the word', () => {
      const text = 'First sentence. Second sentence with target word. Third sentence.';
      const result = cutSentence('target', 30, text, 1);
      expect(result).toContain('<b>target</b>');
    });

    it('should handle sentenceNum = 0 (whole text)', () => {
      const text = 'Hello world';
      const result = cutSentence('world', 6, text, 0);
      expect(result).toBe('Hello <b>world</b>');
    });

    it('should return original if word not found', () => {
      const result = cutSentence('notfound', 0, 'Hello world', 1);
      expect(result).toBe('Hello world');
    });

    it('should handle empty inputs', () => {
      expect(cutSentence('', 0, 'text', 1)).toBe('text');
      expect(cutSentence('word', 0, '', 1)).toBe('');
    });

    it('should handle multiple sentences', () => {
      const text = 'One. Two. Three with target. Four. Five.';
      const result = cutSentence('target', 15, text, 3);
      expect(result).toContain('<b>target</b>');
    });
  });

  describe('isPDFJSPage', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return false for regular pages', () => {
      expect(isPDFJSPage()).toBe(false);
    });

    it('should return true for PDF.js viewer pages', () => {
      const viewer = document.createElement('div');
      viewer.id = 'viewer';
      viewer.className = 'pdfViewer';
      document.body.appendChild(viewer);
      expect(isPDFJSPage()).toBe(true);
    });
  });

  describe('selectedText', () => {
    it('should return empty string when no selection', () => {
      expect(selectedText()).toBe('');
    });

    it('should return trimmed selected text', () => {
      // Create a text node and select it
      document.body.innerHTML = '<p id="test">Hello World</p>';
      const p = document.getElementById('test');
      if (p && p.firstChild) {
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        expect(selectedText()).toBe('Hello World');
      }
    });
  });

  describe('isValidElement', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should return true for regular elements', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      div.focus();
      expect(isValidElement()).toBe(true);
    });

    it('should return false for input elements', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      expect(isValidElement()).toBe(false);
    });

    it('should return false for textarea elements', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      expect(isValidElement()).toBe(false);
    });
  });
});
