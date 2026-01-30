/**
 * Frontend API for communicating with the background service worker
 */

import { showError } from './utils/toast.js';

interface BackendRequest {
  action: string;
  params: Record<string, unknown>;
}

/**
 * Send a message to the backend service worker
 */
export async function sendtoBackend<T>(request: BackendRequest): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(request, (result: T) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Check if Anki service is connected
 */
export async function isConnected(): Promise<boolean | null> {
  try {
    return await sendtoBackend<boolean>({ action: 'isConnected', params: {} });
  } catch {
    return null;
  }
}

/**
 * Get translation for an expression
 */
export async function getTranslation(expression: string): Promise<unknown> {
  try {
    return await sendtoBackend({ action: 'getTranslation', params: { expression } });
  } catch {
    showError('Failed to get translation');
    return null;
  }
}

/**
 * Add a note to Anki
 */
export async function addNote(notedef: Record<string, unknown>): Promise<unknown> {
  try {
    const result = await sendtoBackend({ action: 'addNote', params: { notedef } });
    if (result === null) {
      showError('Failed to add note to Anki');
    }
    return result;
  } catch {
    showError('Failed to add note to Anki');
    return null;
  }
}

/**
 * Play audio from URL
 */
export async function playAudio(url: string): Promise<string | null> {
  try {
    const result = await sendtoBackend<string>({ action: 'playAudio', params: { url } });
    if (result === null) {
      showError('Failed to play audio');
    }
    return result;
  } catch {
    showError('Failed to play audio');
    return null;
  }
}
