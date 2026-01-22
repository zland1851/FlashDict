/**
 * Text Range utilities for word selection
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Create a range from a point on the page
 */
export function rangeFromPoint(point: Point): Range | null {
  // Use caretRangeFromPoint if available (Chrome)
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(point.x, point.y);
  }

  // Fallback to caretPositionFromPoint (Firefox)
  if ('caretPositionFromPoint' in document) {
    const position = (document as Document & { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(point.x, point.y);
    if (position && position.offsetNode && position.offsetNode.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.setEnd(position.offsetNode, position.offset);
      return range;
    }
  }

  return null;
}

/**
 * Text source range class for word selection and manipulation
 */
export class TextSourceRange {
  private rng: Range;

  constructor(range: Range) {
    this.rng = range;
  }

  /**
   * Get the text content of the range
   */
  text(): string {
    return this.rng.toString();
  }

  /**
   * Expand the range to select a full word
   */
  setWordRange(): void {
    const backwardcount = 1;
    const forwardcount = 1;
    const startContainer = this.rng.startContainer;

    if (startContainer.nodeType === Node.TEXT_NODE && (startContainer as Text).data) {
      this.setStartOffset(backwardcount);
      this.setEndOffset(forwardcount);
    }
  }

  /**
   * Check if a character is alphabetic
   */
  private isAlpha(char: string): boolean {
    return /[\u002D|\u0041-\u005A|\u0061-\u007A|\u00A0-\u024F]/.test(char);
  }

  /**
   * Get the start position for the word
   */
  private getStartPos(backwardcount: number): number {
    const clone = this.rng.cloneRange();
    let pos = this.rng.startOffset;
    let count = 0;

    while (pos >= 1) {
      clone.setStart(this.rng.startContainer, --pos);
      const rangeText = clone.toString();
      count += this.isAlpha(rangeText.charAt(0)) ? 0 : 1;
      if (count === backwardcount) {
        break;
      }
    }
    return pos;
  }

  /**
   * Get the end position for the word
   */
  private getEndPos(forwardcount: number): number {
    const clone = this.rng.cloneRange();
    let pos = this.rng.endOffset;
    let count = 0;
    const endContainer = this.rng.endContainer;

    if (endContainer.nodeType !== Node.TEXT_NODE) {
      return pos;
    }

    const textData = (endContainer as Text).data;

    while (pos < textData.length) {
      clone.setEnd(this.rng.endContainer, ++pos);
      const rangeText = clone.toString();
      count += this.isAlpha(rangeText.charAt(rangeText.length - 1)) ? 0 : 1;
      if (count === forwardcount) {
        break;
      }
    }
    return pos;
  }

  /**
   * Set the start offset for the range
   */
  private setStartOffset(backwardcount: number): void {
    let startPos = this.getStartPos(backwardcount);
    if (startPos !== 0) {
      startPos++;
    }
    this.rng.setStart(this.rng.startContainer, startPos);
  }

  /**
   * Set the end offset for the range
   */
  private setEndOffset(forwardcount: number): void {
    let endPos = this.getEndPos(forwardcount);
    const endContainer = this.rng.endContainer;

    if (endContainer.nodeType === Node.TEXT_NODE) {
      const textData = (endContainer as Text).data;
      if (endPos !== textData.length) {
        endPos--;
      }
    }
    this.rng.setEnd(this.rng.endContainer, endPos);
  }

  /**
   * Select the text in the range
   */
  selectText(): void {
    this.setWordRange();
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(this.rng);
    }
  }

  /**
   * Deselect all text
   */
  deselect(): void {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }
}
