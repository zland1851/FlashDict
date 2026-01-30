/**
 * Unit Tests for Toast Notification System
 */

import { showToast, showError, showWarning, showInfo, showSuccess } from '../../../src/fg/ts/utils/toast';

describe('Toast Notification System', () => {
  beforeEach(() => {
    // Clean up any existing toast containers
    const container = document.getElementById('odh-toast-container');
    if (container) {
      container.remove();
    }
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clean up
    const container = document.getElementById('odh-toast-container');
    if (container) {
      container.remove();
    }
  });

  describe('showToast', () => {
    it('should create a toast container if none exists', () => {
      showToast('Test message');
      const container = document.getElementById('odh-toast-container');
      expect(container).not.toBeNull();
    });

    it('should display the message', () => {
      showToast('Test message');
      const container = document.getElementById('odh-toast-container');
      expect(container?.textContent).toContain('Test message');
    });

    it('should remove toast after duration', () => {
      showToast('Test message', { duration: 1000 });
      const container = document.getElementById('odh-toast-container');

      expect(container?.children.length).toBe(1);

      // Advance past toast duration
      jest.advanceTimersByTime(1000);

      // Advance past animation duration
      jest.advanceTimersByTime(300);

      expect(container?.children.length).toBe(0);
    });

    it('should support multiple toasts', () => {
      showToast('Message 1');
      showToast('Message 2');
      showToast('Message 3');

      const container = document.getElementById('odh-toast-container');
      expect(container?.children.length).toBe(3);
    });

    it('should remove container when empty', () => {
      showToast('Test message', { duration: 1000 });

      jest.advanceTimersByTime(1300);

      const container = document.getElementById('odh-toast-container');
      expect(container).toBeNull();
    });
  });

  describe('toast type helpers', () => {
    it('showError should create an error toast', () => {
      showError('Error message');
      const container = document.getElementById('odh-toast-container');
      const toast = container?.firstElementChild as HTMLElement;
      expect(toast?.style.backgroundColor).toBe('rgb(220, 53, 69)'); // #dc3545
    });

    it('showWarning should create a warning toast', () => {
      showWarning('Warning message');
      const container = document.getElementById('odh-toast-container');
      const toast = container?.firstElementChild as HTMLElement;
      expect(toast?.style.backgroundColor).toBe('rgb(255, 193, 7)'); // #ffc107
    });

    it('showInfo should create an info toast', () => {
      showInfo('Info message');
      const container = document.getElementById('odh-toast-container');
      const toast = container?.firstElementChild as HTMLElement;
      expect(toast?.style.backgroundColor).toBe('rgb(23, 162, 184)'); // #17a2b8
    });

    it('showSuccess should create a success toast', () => {
      showSuccess('Success message');
      const container = document.getElementById('odh-toast-container');
      const toast = container?.firstElementChild as HTMLElement;
      expect(toast?.style.backgroundColor).toBe('rgb(40, 167, 69)'); // #28a745
    });
  });

  describe('toast styling', () => {
    it('should position container in top-right corner', () => {
      showToast('Test');
      const container = document.getElementById('odh-toast-container');
      expect(container?.style.position).toBe('fixed');
      expect(container?.style.top).toBe('16px');
      expect(container?.style.right).toBe('16px');
    });

    it('should have highest z-index', () => {
      showToast('Test');
      const container = document.getElementById('odh-toast-container');
      expect(container?.style.zIndex).toBe('2147483647');
    });

    it('warning toast should have dark text color', () => {
      showWarning('Warning');
      const container = document.getElementById('odh-toast-container');
      const toast = container?.firstElementChild as HTMLElement;
      expect(toast?.style.color).toBe('rgb(33, 37, 41)'); // #212529
    });

    it('error toast should have white text color', () => {
      showError('Error');
      const container = document.getElementById('odh-toast-container');
      const toast = container?.firstElementChild as HTMLElement;
      expect(toast?.style.color).toBe('rgb(255, 255, 255)'); // #ffffff
    });
  });
});
