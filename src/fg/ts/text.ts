/**
 * Text utilities for content scripts
 */

const HtmlTagsToReplace: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

function replaceHtmlTag(tag: string): string {
  return HtmlTagsToReplace[tag] || tag;
}

/**
 * Escape HTML special characters
 */
export function escapeHtmlTag(str: string): string {
  return str.replace(/[&<>]/g, replaceHtmlTag);
}

/**
 * Escape special regex characters
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace all occurrences of a string
 */
export function replaceAll(target: string, search: string, replacement: string): string {
  const escapedSearch = escapeRegExp(search);
  return target.replace(new RegExp(escapedSearch, 'g'), replacement);
}

/**
 * Find all indices of a substring
 */
export function searchAll(target: string, search: string): number[] {
  const escapedSearch = escapeRegExp(search);
  const regex = new RegExp(escapedSearch, 'gi');
  const indices: number[] = [];
  let result: RegExpExecArray | null;
  while ((result = regex.exec(target)) !== null) {
    indices.push(result.index);
  }
  return indices;
}

/**
 * Check if the page is a PDF.js viewer page
 */
export function isPDFJSPage(): boolean {
  return document.querySelectorAll('div#viewer.pdfViewer').length > 0;
}

/**
 * Check if word is empty
 */
export function isEmpty(word: string | null | undefined): boolean {
  return !word;
}

/**
 * Check if word is too short or contains numbers
 */
export function isShortAndNum(word: string): boolean {
  const numReg = /\d/;
  return word.length < 3 || numReg.test(word);
}

/**
 * Check if word contains Chinese characters
 */
export function isChinese(word: string): boolean {
  const cnReg = /[\u4e00-\u9fa5]+/gi;
  return cnReg.test(word);
}

/**
 * Check if word is invalid for lookup
 */
export function isInvalid(word: string): boolean {
  if (isChinese(word)) return false;
  return isEmpty(word) || isShortAndNum(word);
}

/**
 * Get selection offset within a node
 */
export function getSelectionOffset(node: Node): { start: number; end: number } {
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
 * Get PDF node context for sentence extraction
 */
export function getPDFNode(node: Node): { sentence: string; offset: number } {
  let backwardindex = 0;
  let currentNode: Node | null = node;

  // Navigate up to span or div
  while (currentNode && currentNode.nodeName.toUpperCase() !== 'SPAN' && currentNode.nodeName.toUpperCase() !== 'DIV') {
    currentNode = currentNode.parentNode;
  }

  if (!currentNode) {
    return { sentence: '', offset: 0 };
  }

  const currentspan = currentNode;
  const sentenceNodes: Node[] = [currentspan];

  // Collect previous siblings
  let previous = currentNode.previousSibling;
  while (previous) {
    sentenceNodes.unshift(previous);
    backwardindex += 1;
    if (previous.textContent && previous.textContent.search(/[.!?;:。！？]['"'"]?(\s|.*$)/g) !== -1) {
      break;
    }
    previous = previous.previousSibling;
  }

  // Collect next siblings
  currentNode = currentspan;
  let next = currentNode.nextSibling;
  while (next) {
    sentenceNodes.push(next);
    if (next.textContent && next.textContent.search(/[.!?;:。！？]['"'"]?(\s|.*$)/g) !== -1) {
      break;
    }
    next = next.nextSibling;
  }

  let sentence = '';
  let offset = 0;
  const filteredNodes = sentenceNodes.filter(n => n.textContent !== '' && n.textContent !== '-');

  for (const n of filteredNodes) {
    if (backwardindex === 0) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        offset = sentence.length + selection.getRangeAt(0).startOffset;
      }
    }
    backwardindex -= 1;
    const nodetext = n.textContent || '';
    if (nodetext === '-') {
      sentence = sentence.slice(0, sentence.length - 1);
    } else {
      sentence += nodetext[nodetext.length - 1] === '-'
        ? nodetext.slice(0, nodetext.length - 1)
        : nodetext + ' ';
    }
  }

  return { sentence, offset };
}

/**
 * Get web node for sentence context
 */
export function getWebNode(node: Node | null, deep: number): Node {
  if (!node) return document;

  const blockTags = ['LI', 'P', 'DIV', 'BODY'];
  const nodeName = node.nodeName.toUpperCase();

  if (blockTags.includes(nodeName) || deep === 0) {
    return node;
  } else {
    return getWebNode(node.parentElement, deep - 1);
  }
}

/**
 * Cut sentence around a word
 */
export function cutSentence(word: string, offset: number, sentence: string, sentenceNum: number): string {
  if (sentenceNum > 0) {
    const matchResult = sentence.match(/((?![.!?;:。！？]['"'"]?\s).|\n)*[.!?;:。！？]['"'"]?(\s|.*$)/g);
    let sentences: string[];

    if (matchResult && matchResult.length > 1) {
      const reduced = matchResult.reduceRight((accumulation: string[], current: string) => {
        if (current.search(/\.\w{0,3}\.\s$/g) !== -1) {
          accumulation[0] = current + accumulation[0];
        } else {
          accumulation.unshift(current);
        }
        return accumulation;
      }, ['']);
      sentences = reduced.filter(x => x.length);
    } else {
      sentences = [sentence];
    }

    let currentOffset = offset;
    let index = sentences.findIndex(ele => {
      if (ele.indexOf(word) !== -1 && searchAll(ele, word).indexOf(currentOffset) !== -1) {
        return true;
      }
      currentOffset -= ele.length;
      return false;
    });

    if (index === -1) {
      index = sentences.findIndex(ele => ele.indexOf(word) !== -1);
    }

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

    return replaceAll(sentences.slice(start, end + 1).join(''), word, word.replace(/[^\s]+/g, '<b>$&</b>'));
  } else {
    return sentence.replace(word, word.replace(/[^\s]+/g, '<b>$&</b>'));
  }
}

/**
 * Get sentence containing selected text
 */
export function getSentence(sentenceNum: number): string {
  const upNum = 4;
  const selection = window.getSelection();

  if (!selection || selection.rangeCount < 1) {
    return '';
  }

  const word = (selection.toString() || '').trim();
  let node: Node = selection.getRangeAt(0).commonAncestorContainer;

  if (node instanceof Element && ['INPUT', 'TEXTAREA'].includes(node.tagName)) {
    return '';
  }

  let sentence = '';
  let offset = 0;

  if (isPDFJSPage()) {
    const pdfcontext = getPDFNode(node);
    sentence = escapeHtmlTag(pdfcontext.sentence);
    offset = pdfcontext.offset;
  } else {
    node = getWebNode(node, upNum);
    if (node !== document) {
      sentence = escapeHtmlTag(node.textContent || '');
      offset = getSelectionOffset(node).start;
    }
  }

  return cutSentence(word, offset, sentence, sentenceNum);
}

/**
 * Get currently selected text
 */
export function selectedText(): string {
  const selection = window.getSelection();
  return (selection?.toString() || '').trim();
}

/**
 * Check if the active element is valid for text lookup
 */
export function isValidElement(): boolean {
  const invalidTags = ['INPUT', 'TEXTAREA'];
  const nodeName = document.activeElement?.nodeName.toUpperCase() || '';
  return !invalidTags.includes(nodeName);
}
