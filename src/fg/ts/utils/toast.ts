/**
 * Toast notification system for user feedback
 * Shows non-blocking notifications in the top-right corner
 */

export type ToastType = 'info' | 'warning' | 'error' | 'success';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

const TOAST_CONTAINER_ID = 'odh-toast-container';
const DEFAULT_DURATION = 3000;

/**
 * Get or create the toast container element
 */
function getContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Get background color based on toast type
 */
function getBackgroundColor(type: ToastType): string {
  switch (type) {
    case 'error':
      return '#dc3545';
    case 'warning':
      return '#ffc107';
    case 'success':
      return '#28a745';
    case 'info':
    default:
      return '#17a2b8';
  }
}

/**
 * Get text color based on toast type
 */
function getTextColor(type: ToastType): string {
  return type === 'warning' ? '#212529' : '#ffffff';
}

/**
 * Show a toast notification
 * @param message The message to display
 * @param options Toast options (type, duration)
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const { type = 'info', duration = DEFAULT_DURATION } = options;

  const container = getContainer();
  const toast = document.createElement('div');

  toast.style.cssText = `
    background-color: ${getBackgroundColor(type)};
    color: ${getTextColor(type)};
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    line-height: 1.4;
    max-width: 320px;
    word-wrap: break-word;
    pointer-events: auto;
    opacity: 0;
    transform: translateX(100%);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toast.remove();
      // Clean up empty container
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, duration);
}

/**
 * Show an error toast
 */
export function showError(message: string, duration?: number): void {
  showToast(message, { type: 'error', duration });
}

/**
 * Show a warning toast
 */
export function showWarning(message: string, duration?: number): void {
  showToast(message, { type: 'warning', duration });
}

/**
 * Show an info toast
 */
export function showInfo(message: string, duration?: number): void {
  showToast(message, { type: 'info', duration });
}

/**
 * Show a success toast
 */
export function showSuccess(message: string, duration?: number): void {
  showToast(message, { type: 'success', duration });
}
