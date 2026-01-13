/**
 * Jest Test Setup
 * Global configuration and mocks for all tests
 */

import { installChromeMock, resetChromeMocks } from './mocks/chrome.mock';
import { installFetchMock, resetFetchMocks } from './mocks/fetch.mock';

// Install global mocks
installChromeMock();
installFetchMock();

// Reset mocks before each test
beforeEach(() => {
  resetChromeMocks();
  resetFetchMocks();
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      chrome: typeof chrome;
      fetch: typeof fetch;
    }
  }
}

// Suppress console errors during tests unless debugging
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Optionally suppress console output during tests
  if (process.env.SUPPRESS_CONSOLE !== 'false') {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Add custom matchers if needed
expect.extend({
  toBeValidUrl(received: string) {
    try {
      new URL(received);
      return {
        pass: true,
        message: () => `Expected ${received} not to be a valid URL`
      };
    } catch {
      return {
        pass: false,
        message: () => `Expected ${received} to be a valid URL`
      };
    }
  },

  toContainHtml(received: string, expected: string) {
    const pass = received.includes(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Expected HTML not to contain "${expected}"`
          : `Expected HTML to contain "${expected}"`
    };
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUrl(): R;
      toContainHtml(expected: string): R;
    }
  }
}

// Mock for window.matchMedia (needed for jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock for window.scrollTo (not implemented in jsdom)
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn()
});

// Mock for requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id);
};

// Helper to wait for promises to resolve
export const flushPromises = (): Promise<void> =>
  new Promise(resolve => setImmediate(resolve));

// Helper to wait for a condition
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor condition not met within ${timeout}ms`);
};

// Helper to create mock DOM element
export const createMockElement = (
  tag: string,
  attributes: Record<string, string> = {},
  innerHTML: string = ''
): HTMLElement => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  element.innerHTML = innerHTML;
  return element;
};

export {};
