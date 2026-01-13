/**
 * Audio Handler
 * Handles audio playback messages for Service Worker environment
 * Implements IMessageHandler for MessageRouter system
 */

import {
  IMessageHandler,
  MessageSender
} from '../interfaces/IMessageHandler';

/**
 * Audio handler messages
 */
export interface AudioHandlerParams {
  url: string;
  callbackId?: string;
}

/**
 * Audio Handler
 * Handles audio playback messages by forwarding to offscreen document
 * In Service Worker, Audio API is not available directly
 */
export class AudioHandler implements IMessageHandler<AudioHandlerParams, string | null> {
  constructor() {}

  /**
   * Handle audio playback messages
   * @param params - Message parameters
   * @param _sender - Message sender information
   * @returns Promise resolving to response
   */
  async handle(
    params: AudioHandlerParams,
    _sender: MessageSender
  ): Promise<string | null> {
    if (!params?.url) {
      throw new Error('Invalid params: url is required');
    }

    // Forward to offscreen document for audio playback
    try {
      const result = await this.sendToOffscreen({
        action: 'playAudio',
        params: { url: params.url }
      });

      // Return result to callback if callbackId is present
      if (params.callbackId) {
        await this.sendToOffscreen({
          action: 'sandboxCallback',
          params: { callbackId: params.callbackId, data: result },
          target: 'background'
        });
      }

      return result as string | null;
    } catch (error) {
      console.error('Error playing audio:', error);

      // Send null to callback if callbackId is present
      if (params.callbackId) {
        await this.sendToOffscreen({
          action: 'sandboxCallback',
          params: { callbackId: params.callbackId, data: null },
          target: 'background'
        });
      }

      return null;
    }
  }

  /**
   * Check if this handler can handle action
   * @param action - The action string
   * @returns true if this handler can handle
   */
  canHandle(action: string): boolean {
    return action === 'playAudio';
  }

  /**
   * Send message to offscreen document
   * @param message - Message to send
   * @returns Promise resolving to response
   */
  private async sendToOffscreen(message: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

/**
 * Create audio handler for message router
 * @returns AudioHandler instance
 */
export function createAudioHandler(): AudioHandler {
  return new AudioHandler();
}
