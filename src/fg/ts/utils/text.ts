/**
 * Text Utilities for ODH Extension
 * Provides text manipulation, HTML escaping, and sentence extraction functions
 */

// HTML tags to escape for XSS prevention
const HTML_TAGS_TO_REPLACE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

/**
 * Replace a single HTML tag character with its escaped equivalent
 */
function replaceHtmlTag(tag: string): string {
  return HTML_TAGS_TO_REPLACE[tag] ?? tag;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param str - String to escape
 * @returns Escaped string safe for HTML insertion
 */
export function escapeHtmlTag(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>]/g, replaceHtmlTag);
}

/**
 * Escape special regex characters in a string
 * @param str - String to escape
 * @returns String with regex special characters escaped
 */
export function escapeRegExp(str: string): string {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace all occurrences of a search string with replacement
 * @param target - Target string to search in
 * @param search - String to search for
 * @param replacement - String to replace with
 * @returns String with all occurrences replaced
 */
export function replaceAll(target: string, search: string, replacement: string): string {
  if (!target || !search) return target || '';
  const escapedSearch = escapeRegExp(search);
  return target.replace(new RegExp(escapedSearch, 'g'), replacement);
}

/**
 * Find all indices where a search string occurs in target
 * @param target - Target string to search in
 * @param search - String to search for
 * @returns Array of indices where search string was found
 */
export function searchAll(target: string, search: string): number[] {
  if (!target || !search) return [];

  const escapedSearch = escapeRegExp(search);
  const regex = new RegExp(escapedSearch, 'gi');
  const indices: number[] = [];
  let result: RegExpExecArray | null;

  while ((result = regex.exec(target)) !== null) {
    indices.push(result.index);
    // Prevent infinite loop for zero-length matches
    if (result.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return indices;
}

/**
 * Check if current page is a PDF.js viewer
 * @returns true if the page is a PDF.js viewer
 */
export function isPDFJSPage(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelectorAll('div#viewer.pdfViewer').length > 0;
}

/**
 * Check if a word is empty or falsy
 * @param word - Word to check
 * @returns true if word is empty
 */
export function isEmpty(word: string | null | undefined): boolean {
  return !word;
}

/**
 * Check if a word is too short or contains numbers
 * @param word - Word to check
 * @returns true if word is less than 3 characters or contains digits
 */
export function isShortAndNum(word: string): boolean {
  if (!word) return true;
  const numReg = /\d/;
  return word.length < 3 || numReg.test(word);
}

/**
 * Check if a word contains Chinese characters
 * @param word - Word to check
 * @returns true if word contains Chinese characters
 */
export function isChinese(word: string): boolean {
  if (!word) return false;
  const cnReg = /[\u4e00-\u9fa5]+/gi;
  return cnReg.test(word);
}

/**
 * Check if a word is invalid for lookup
 * Chinese words are always valid
 * Non-Chinese words are invalid if empty or too short with numbers
 * @param word - Word to check
 * @returns true if word is invalid for dictionary lookup
 */
export function isInvalid(word: string): boolean {
  if (!word) return true;
  if (isChinese(word)) return false;
  return isEmpty(word) || isShortAndNum(word);
}

/**
 * Extract and highlight a sentence containing the target word
 * @param word - Target word to highlight
 * @param offset - Offset position of word in text
 * @param sentence - Full text/paragraph
 * @param sentenceNum - Number of sentences to include (0 = all)
 * @returns Sentence(s) with the word highlighted in bold tags
 */
export function cutSentence(
  word: string,
  offset: number,
  sentence: string,
  sentenceNum: number
): string {
  if (!word || !sentence) return sentence || '';

  if (sentenceNum > 0) {
    // Split text into sentences
    const matchResult = sentence.match(/((?![.!?;:。！？]['"'"]?\s).|\n)*[.!?;:。！？]['"'"]?(\s|.*$)/g);
    let sentences: string[];

    if (matchResult && matchResult.length > 1) {
      // Merge sentences that end with abbreviations (e.g., "Dr.", "Mr.")
      const reduced = matchResult.reduceRight((accumulation: string[], current: string) => {
        if (current.search(/\.\w{0,3}\.\s$/g) !== -1) {
          if (accumulation[0]) {
            accumulation[0] = current + accumulation[0];
          } else {
            accumulation.unshift(current);
          }
        } else {
          accumulation.unshift(current);
        }
        return accumulation;
      }, ['']);
      sentences = reduced.filter(x => x.length > 0);
    } else {
      sentences = [sentence];
    }

    // Find the sentence containing the word at the exact offset
    let currentOffset = offset;
    let index = sentences.findIndex(ele => {
      if (ele.indexOf(word) !== -1) {
        const positions = searchAll(ele, word);
        if (positions.indexOf(currentOffset) !== -1) {
          return true;
        }
      }
      currentOffset -= ele.length;
      return false;
    });

    // Fallback: find any sentence containing the word
    if (index === -1) {
      index = sentences.findIndex(ele => ele.indexOf(word) !== -1);
    }

    if (index === -1) {
      return highlightWord(sentence, word);
    }

    // Calculate range of sentences to include
    const left = Math.ceil((sentenceNum - 1) / 2);
    let start = index - left;
    let end = index + ((sentenceNum - 1) - left);

    if (start < 0) {
      start = 0;
      end = sentenceNum - 1;
    } else if (end > sentences.length - 1) {
      end = sentences.length - 1;
      start = Math.max(0, end - (sentenceNum - 1));
    }

    const selectedSentences = sentences.slice(start, end + 1).join('');
    return highlightWord(selectedSentences, word);
  } else {
    return highlightWord(sentence, word);
  }
}

/**
 * Highlight a word in text with bold tags
 * @param text - Text containing the word
 * @param word - Word to highlight
 * @returns Text with word wrapped in <b> tags
 */
export function highlightWord(text: string, word: string): string {
  if (!text || !word) return text || '';
  const highlightedWord = word.replace(/[^\s]+/g, '<b>$&</b>');
  return replaceAll(text, word, highlightedWord);
}

/**
 * Get selection offset within a node
 * @param node - DOM node to calculate offset within
 * @returns Object with start and end offsets
 */
export function getSelectionOffset(node: Node): { start: number; end: number } {
  if (typeof window === 'undefined' || !window.getSelection) {
    return { start: 0, end: 0 };
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount < 1) {
    return { start: 0, end: 0 };
  }

  const range = selection.getRangeAt(0);
  const clone = range.cloneRange();
  clone.selectNodeContents(node);
  clone.setEnd(range.startContainer, range.startOffset);
  const start = clone.toString().length;
  clone.setEnd(range.endContainer, range.endOffset);
  const end = clone.toString().length;

  return { start, end };
}

/**
 * Get sentence context from PDF.js viewer
 * @param node - Starting DOM node
 * @returns Object with sentence text and offset
 */
export function getPDFNode(node: Node): { sentence: string; offset: number } {
  if (typeof window === 'undefined' || !window.getSelection) {
    return { sentence: '', offset: 0 };
  }

  let backwardIndex = 0;
  let currentNode: Node | null = node;

  // Navigate up to span or div
  while (currentNode && currentNode.parentNode) {
    currentNode = currentNode.parentNode;
    const nodeName = (currentNode as Element).nodeName?.toUpperCase();
    if (nodeName === 'SPAN' || nodeName === 'DIV') {
      break;
    }
  }

  if (!currentNode) {
    return { sentence: '', offset: 0 };
  }

  const currentSpan = currentNode;
  const sentenceNodes: Node[] = [currentSpan];

  // Collect previous siblings until sentence boundary
  let previous: Node | null = currentNode;
  while ((previous = previous.previousSibling)) {
    sentenceNodes.unshift(previous);
    backwardIndex += 1;
    if (previous.textContent?.search(/[.!?;:。！？]['"'"]?(\s|.*$)/g) !== -1) {
      break;
    }
  }

  // Collect next siblings until sentence boundary
  currentNode = currentSpan;
  let next: Node | null = currentNode;
  while ((next = next.nextSibling)) {
    sentenceNodes.push(next);
    if (next.textContent?.search(/[.!?;:。！？]['"'"]?(\s|.*$)/g) !== -1) {
      break;
    }
  }

  // Build sentence from nodes
  let sentence = '';
  let offset = 0;
  const filteredNodes = sentenceNodes.filter(n =>
    n.textContent !== '' && n.textContent !== '-'
  );

  for (const n of filteredNodes) {
    if (backwardIndex === 0) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        offset = sentence.length + selection.getRangeAt(0).startOffset;
      }
    }
    backwardIndex -= 1;

    const nodeText = n.textContent || '';
    if (nodeText === '-') {
      sentence = sentence.slice(0, -1);
    } else {
      const endsWithHyphen = nodeText[nodeText.length - 1] === '-';
      sentence += endsWithHyphen
        ? nodeText.slice(0, -1)
        : nodeText + ' ';
    }
  }

  return { sentence, offset };
}

/**
 * Navigate up the DOM tree to find a block-level parent
 * @param node - Starting node
 * @param deep - Maximum levels to traverse up
 * @returns Block-level parent node or document
 */
export function getWebNode(node: Node | null, deep: number): Node {
  if (!node || typeof document === 'undefined') {
    return document;
  }

  const blockTags = ['LI', 'P', 'DIV', 'BODY'];
  const nodeName = (node as Element).nodeName?.toUpperCase();

  if (blockTags.includes(nodeName) || deep === 0) {
    return node;
  }

  const parentElement = (node as Element).parentElement;
  return getWebNode(parentElement, deep - 1);
}

/**
 * Get the sentence containing the current selection
 * @param sentenceNum - Number of sentences to include
 * @returns Sentence(s) with highlighted word, or undefined if no valid selection
 */
export function getSentence(sentenceNum: number): string | undefined {
  if (typeof window === 'undefined' || !window.getSelection) {
    return undefined;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount < 1) {
    return undefined;
  }

  const word = (selection.toString() || '').trim();
  if (!word) {
    return undefined;
  }

  const range = selection.getRangeAt(0);
  let node: Node = range.commonAncestorContainer;

  // Skip if selection is in input or textarea
  const tagName = (node as Element).tagName?.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
    return undefined;
  }

  let sentence = '';
  let offset = 0;
  const upNum = 4;

  if (isPDFJSPage()) {
    const pdfContext = getPDFNode(node);
    sentence = escapeHtmlTag(pdfContext.sentence);
    offset = pdfContext.offset;
  } else {
    const webNode = getWebNode(node, upNum);
    if (webNode !== document) {
      sentence = escapeHtmlTag(webNode.textContent || '');
      offset = getSelectionOffset(webNode).start;
    }
  }

  return cutSentence(word, offset, sentence, sentenceNum);
}

/**
 * Get currently selected text
 * @returns Trimmed selected text or empty string
 */
export function selectedText(): string {
  if (typeof window === 'undefined' || !window.getSelection) {
    return '';
  }

  const selection = window.getSelection();
  return (selection?.toString() || '').trim();
}

/**
 * Check if the active element is valid for text selection lookup
 * @returns true if active element is not an input or textarea
 */
export function isValidElement(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const invalidTags = ['INPUT', 'TEXTAREA'];
  const nodeName = document.activeElement?.nodeName?.toUpperCase();

  return !invalidTags.includes(nodeName || '');
}

// Export type for sentence context
export interface SentenceContext {
  sentence: string;
  offset: number;
}

// Export type for selection offset
export interface SelectionOffset {
  start: number;
  end: number;
}
