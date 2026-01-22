/**
 * Offscreen Document Background Script
 * Handles communication between Service Worker and Sandbox
 */

import { Agent } from './agent.js';

interface MessageRequest {
  action: string;
  params: Record<string, unknown>;
  target?: string;
}

interface CallbackParams {
  callbackId: number;
  data: unknown;
}

/**
 * ODH Background class for offscreen document
 */
class ODHBackground {
  private audios: Record<string, HTMLAudioElement> = {};
  private agent: Agent | null = null;

  constructor() {
    console.log('[ODH Offscreen] Initializing ODHBackground...');

    // Wait for iframe to load before initializing agent
    const iframe = document.getElementById('sandbox') as HTMLIFrameElement | null;
    console.log('[ODH Offscreen] Sandbox iframe:', iframe);

    if (iframe) {
      iframe.addEventListener('load', () => {
        console.log('[ODH Offscreen] Sandbox iframe loaded');
        this.agent = new Agent(iframe.contentWindow);
        console.log('[ODH Offscreen] Agent initialized');
      });

      // If iframe is already loaded, initialize immediately
      if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
        console.log('[ODH Offscreen] Sandbox iframe already loaded');
        this.agent = new Agent(iframe.contentWindow);
        console.log('[ODH Offscreen] Agent initialized (immediate)');
      }
    } else {
      console.error('[ODH Offscreen] Sandbox iframe not found!');
    }

    // Add listeners
    chrome.runtime.onMessage.addListener(this.onServiceMessage.bind(this));
    window.addEventListener('message', (e) => this.onSandboxMessage(e));
    console.log('[ODH Offscreen] Message listeners registered');
  }

  /**
   * Play audio from URL
   */
  private playAudio(url: string): void {
    // Pause all existing audio
    for (const key in this.audios) {
      this.audios[key]?.pause();
    }

    const audio = this.audios[url] || new Audio(url);
    audio.currentTime = 0;
    audio.play();
    this.audios[url] = audio;
  }

  /**
   * Handle messages from Service Worker
   */
  private onServiceMessage(
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean {
    const { action, params, target } = request;

    // Handle sandboxPing - check if sandbox agent is ready
    if (action === 'sandboxPing') {
      console.log('[ODH Offscreen] sandboxPing received, agent ready:', this.agent !== null);
      sendResponse({ ready: this.agent !== null });
      return true;
    }

    if (target !== 'background') {
      return false;
    }

    if (action === 'playAudio') {
      const { url } = params as { url: string };
      this.playAudio(url);
      sendResponse(url);
      return true;
    }

    // Handle sandboxCallback - this is a callback from Service Worker to sandbox
    if (action === 'sandboxCallback' && params) {
      const { callbackId, data } = params as unknown as CallbackParams;
      this.callback(data, callbackId);
      sendResponse(true);
      return true;
    }

    // Send message to sandbox and return result
    this.sendToSandbox(action, params)
      .then((result) => {
        sendResponse(result);
      })
      .catch(() => {
        sendResponse(null);
      });

    return true; // Keep channel open for async response
  }

  /**
   * Send message to sandbox iframe
   */
  private async sendToSandbox(
    action: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Wait for agent to be ready
      if (!this.agent) {
        const iframe = document.getElementById('sandbox') as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
          this.agent = new Agent(iframe.contentWindow);
        } else {
          // If still not ready, wait a bit
          setTimeout(() => {
            const iframeRetry = document.getElementById('sandbox') as HTMLIFrameElement | null;
            if (iframeRetry && iframeRetry.contentWindow) {
              this.agent = new Agent(iframeRetry.contentWindow);
              try {
                this.agent.postMessage(action, params, (result) => resolve(result));
              } catch (err) {
                console.error('Error sending to sandbox:', err);
                reject(null);
              }
            } else {
              console.error('Sandbox iframe not ready');
              reject(null);
            }
          }, 500);
          return;
        }
      }

      try {
        this.agent.postMessage(action, params, (result) => {
          resolve(result);
        });
      } catch (err) {
        console.error('Error sending to sandbox:', err);
        reject(null);
      }
    });
  }

  /**
   * Send message to Service Worker
   */
  private async sendToServiceWorker(request: MessageRequest): Promise<unknown> {
    request.target = 'serviceworker';
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(request, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Handle messages from sandbox
   */
  private async onSandboxMessage(e: MessageEvent): Promise<void> {
    const { action, params } = e.data as MessageRequest;
    const callbackId = params.callbackId as number;

    try {
      const result = await this.sendToServiceWorker({
        action,
        params,
        target: 'serviceworker'
      });
      this.callback(result, callbackId);
    } catch (err) {
      console.error('Error in onSandboxMessage:', err);
      this.callback(null, callbackId);
    }
  }

  /**
   * Send callback to sandbox
   */
  private callback(data: unknown, callbackId: number): void {
    if (this.agent) {
      this.agent.postMessage('callback', { data, callbackId });
    }
  }
}

// Initialize
(window as Window & { odhbackground?: ODHBackground }).odhbackground = new ODHBackground();
console.log('[ODH Offscreen] Background script loaded');

export { ODHBackground };
