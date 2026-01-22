/**
 * Sandbox Communication Agent
 * Handles message passing between different contexts with callback support
 */

type CallbackFn = (data: unknown) => void;

interface MessageData {
  action: string;
  params: Record<string, unknown>;
}

interface CallbackParams {
  callbackId: number;
  data: unknown;
}

/**
 * Agent class for sandbox communication with callback support
 */
export class Agent {
  private callbacks: Record<number, CallbackFn> = {};
  private target: Window | null;

  constructor(target: Window | null = null) {
    this.target = target;

    // In Service Worker, use self instead of window
    const eventTarget = typeof self !== 'undefined' ? self : window;
    if (eventTarget.addEventListener) {
      eventTarget.addEventListener('message', (e: MessageEvent) => this.onMessage(e));
    }
  }

  /**
   * Handle incoming messages (callbacks)
   */
  private onMessage(e: MessageEvent): void {
    const { action, params } = e.data as MessageData;

    if (action !== 'callback' || !params || !(params as unknown as CallbackParams).callbackId) {
      return;
    }

    const callbackParams = params as unknown as CallbackParams;
    const callback = this.callbacks[callbackParams.callbackId];

    // We are the sender getting the callback
    if (callback && typeof callback === 'function') {
      callback(callbackParams.data);
      delete this.callbacks[callbackParams.callbackId];
    }
  }

  /**
   * Post a message to the target with optional callback
   */
  postMessage(action: string, params: Record<string, unknown>, callback?: CallbackFn): void {
    if (action !== 'callback' && callback) {
      const callbackId = Math.random();
      params.callbackId = callbackId;
      this.callbacks[callbackId] = callback;
    }

    if (this.target) {
      // If target is a Window (iframe), use postMessage
      if (this.target.postMessage) {
        this.target.postMessage({ action, params }, '*');
      }
    } else {
      // In Service Worker (Manifest V3), send message via chrome.runtime
      chrome.runtime.sendMessage(
        {
          action: 'sandboxRequest',
          data: { action, params },
          target: 'sandbox',
        },
        (_response) => {
          // Check for errors
          if (chrome.runtime.lastError) {
            // Sandbox might not be ready yet, or message failed
            if (action !== 'callback') {
              // Only log warnings for non-callback messages to reduce noise
              // console.warn('Sandbox not ready for message:', action);
            }
            // If callback exists and message failed, call it with null
            if (callback && params.callbackId) {
              callback(null);
            }
            return;
          }
          // Message sent successfully (response handling is done via callback mechanism)
        }
      );
    }
  }
}

export default Agent;

// Expose Agent globally for sandbox
(window as Window & { Agent?: typeof Agent }).Agent = Agent;
