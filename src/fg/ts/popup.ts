/**
 * Popup class for displaying dictionary definitions
 */

import { rangeFromPoint } from './range.js';

interface Point {
  x: number;
  y: number;
}

/**
 * Popup class for showing definition popup iframe
 */
export class Popup {
  private popup: HTMLIFrameElement | null = null;
  private offset: number = 5;

  /**
   * Show popup at a specific position
   */
  showAt(pos: Point, content: string): void {
    this.inject();

    if (this.popup) {
      this.popup.style.left = pos.x + 'px';
      this.popup.style.top = pos.y + 'px';
      this.popup.style.visibility = 'visible';
    }

    this.setContent(content);
  }

  /**
   * Show popup next to a point (with smart positioning)
   */
  showNextTo(point: Point, content: string): void {
    this.inject();

    if (!this.popup) return;

    const elementRect = this.getRangeRect(point);
    if (!elementRect) {
      this.showAt(point, content);
      return;
    }

    const popupRect = this.popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate horizontal position
    let posX = elementRect.left;
    if (posX + popupRect.width > viewportWidth) {
      posX = viewportWidth - popupRect.width;
    }
    posX = Math.max(0, posX);

    // Calculate vertical position
    const spaceBelow = viewportHeight - elementRect.bottom - this.offset;
    const spaceAbove = elementRect.top - this.offset;

    let posY: number;
    if (spaceBelow >= popupRect.height) {
      // Prefer below if there's enough space
      posY = elementRect.bottom + this.offset;
    } else if (spaceAbove >= popupRect.height) {
      // Otherwise try above
      posY = elementRect.top - popupRect.height - this.offset;
    } else {
      // Neither has enough space - center vertically and let it scroll
      posY = Math.max(0, (viewportHeight - popupRect.height) / 2);
    }

    // Final bounds check to ensure popup stays in viewport
    posY = Math.max(0, Math.min(posY, viewportHeight - popupRect.height));

    this.showAt({ x: posX, y: posY }, content);
  }

  /**
   * Hide the popup
   */
  hide(): void {
    if (this.popup !== null) {
      this.popup.style.visibility = 'hidden';
    }
  }

  /**
   * Set the popup content
   */
  setContent(content: string): void {
    if (this.popup === null) {
      return;
    }

    this.popup.contentWindow?.scrollTo(0, 0);
    this.popup.srcdoc = content;
  }

  /**
   * Get the bounding rect of the range at a point
   */
  private getRangeRect(point: Point): DOMRect | null {
    const range = rangeFromPoint(point);
    return range?.getBoundingClientRect() || null;
  }

  /**
   * Send a message to the popup iframe
   */
  sendMessage(action: string, params: Record<string, unknown>): void {
    if (this.popup !== null && this.popup.contentWindow) {
      this.popup.contentWindow.postMessage({ action, params }, '*');
    }
  }

  /**
   * Inject the popup iframe into the page
   */
  private inject(): void {
    if (this.popup !== null) {
      return;
    }

    this.popup = document.createElement('iframe');
    this.popup.id = 'odh-popup';
    this.popup.addEventListener('mousedown', (e) => e.stopPropagation());
    this.popup.addEventListener('scroll', (e) => e.stopPropagation());

    // Check for simpread extension
    const simpread = document.querySelector('.simpread-read-root');
    const root = simpread || document.body;
    root.appendChild(this.popup);
  }
}

export default Popup;
