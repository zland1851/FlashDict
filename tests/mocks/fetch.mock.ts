/**
 * Fetch API Mock for Testing
 * Provides comprehensive mock for fetch() API used in the extension
 */

export interface MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  body: string | object | null;
  url?: string;
}

export interface FetchMockConfig {
  defaultResponse?: Partial<MockResponse>;
  delay?: number;
}

// Store for URL-specific mock responses
const mockResponses = new Map<string | RegExp, MockResponse>();

// Default configuration
let config: FetchMockConfig = {
  delay: 0
};

// Create a mock response object
function createMockResponse(data: Partial<MockResponse>): Response {
  const defaultResponse: MockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: null
  };

  const merged = { ...defaultResponse, ...data };

  const responseInit: ResponseInit = {
    status: merged.status,
    statusText: merged.statusText,
    headers: merged.headers
  };

  let bodyText: string;
  if (merged.body === null) {
    bodyText = '';
  } else if (typeof merged.body === 'object') {
    bodyText = JSON.stringify(merged.body);
  } else {
    bodyText = merged.body;
  }

  const response = new Response(bodyText, responseInit);

  // Override ok property to match our mock
  Object.defineProperty(response, 'ok', {
    value: merged.ok,
    writable: false
  });

  if (merged.url) {
    Object.defineProperty(response, 'url', {
      value: merged.url,
      writable: false
    });
  }

  return response;
}

// Find matching mock response for URL
function findMockResponse(url: string): MockResponse | undefined {
  // Check exact match first
  if (mockResponses.has(url)) {
    return mockResponses.get(url);
  }

  // Check regex patterns
  for (const [pattern, response] of mockResponses.entries()) {
    if (pattern instanceof RegExp && pattern.test(url)) {
      return response;
    }
  }

  return undefined;
}

// The mock fetch function
export const mockFetch = jest.fn(async (
  input: RequestInfo | URL,
  _init?: RequestInit
): Promise<Response> => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  // Add delay if configured
  if (config.delay && config.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delay));
  }

  // Find matching mock response
  const mockResponse = findMockResponse(url);

  if (mockResponse) {
    return createMockResponse(mockResponse);
  }

  // Return default response if configured
  if (config.defaultResponse) {
    return createMockResponse(config.defaultResponse);
  }

  // Default: return 404 for unmocked URLs
  return createMockResponse({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    body: { error: 'No mock configured for this URL' }
  });
});

// Configure mock for specific URL
export function mockFetchResponse(
  urlOrPattern: string | RegExp,
  response: Partial<MockResponse>
): void {
  const fullResponse: MockResponse = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    headers: response.headers ?? new Headers({ 'Content-Type': 'application/json' }),
    body: response.body ?? null,
    url: typeof urlOrPattern === 'string' ? urlOrPattern : undefined
  };

  mockResponses.set(urlOrPattern, fullResponse);
}

// Configure mock to return JSON
export function mockFetchJson(
  urlOrPattern: string | RegExp,
  data: object,
  status: number = 200
): void {
  mockFetchResponse(urlOrPattern, {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: data
  });
}

// Configure mock to return HTML
export function mockFetchHtml(
  urlOrPattern: string | RegExp,
  html: string,
  status: number = 200
): void {
  mockFetchResponse(urlOrPattern, {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'text/html' }),
    body: html
  });
}

// Configure mock to return text
export function mockFetchText(
  urlOrPattern: string | RegExp,
  text: string,
  status: number = 200
): void {
  mockFetchResponse(urlOrPattern, {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'text/plain' }),
    body: text
  });
}

// Configure mock to simulate error
export function mockFetchError(
  urlOrPattern: string | RegExp,
  status: number = 500,
  message: string = 'Internal Server Error'
): void {
  mockFetchResponse(urlOrPattern, {
    ok: false,
    status,
    statusText: message,
    body: { error: message }
  });
}

// Configure mock to simulate network failure
export function mockFetchNetworkError(urlOrPattern: string | RegExp): void {
  const originalImplementation = mockFetch.getMockImplementation();

  mockFetch.mockImplementationOnce(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (
      (typeof urlOrPattern === 'string' && url === urlOrPattern) ||
      (urlOrPattern instanceof RegExp && urlOrPattern.test(url))
    ) {
      throw new TypeError('Network request failed');
    }

    // Fall back to original implementation for other URLs
    if (originalImplementation) {
      return originalImplementation(input);
    }

    return createMockResponse({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });
  });
}

// Configure mock to simulate timeout
export function mockFetchTimeout(urlOrPattern: string | RegExp, timeoutMs: number = 5000): void {
  const originalImplementation = mockFetch.getMockImplementation();

  mockFetch.mockImplementationOnce(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (
      (typeof urlOrPattern === 'string' && url === urlOrPattern) ||
      (urlOrPattern instanceof RegExp && urlOrPattern.test(url))
    ) {
      // Simulate timeout by waiting longer than typical timeout
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      });
    }

    // Fall back to original implementation for other URLs
    if (originalImplementation) {
      return originalImplementation(input, _init);
    }

    return createMockResponse({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });
  });
}

// Set global configuration
export function setFetchMockConfig(newConfig: Partial<FetchMockConfig>): void {
  config = { ...config, ...newConfig };
}

// Reset all mocks
export function resetFetchMocks(): void {
  mockResponses.clear();
  mockFetch.mockClear();
  config = { delay: 0 };
}

// Install fetch mock globally
export function installFetchMock(): void {
  (global as any).fetch = mockFetch;
}

// Uninstall fetch mock
export function uninstallFetchMock(): void {
  delete (global as any).fetch;
}

// Get call history for a specific URL
export function getFetchCallsForUrl(url: string | RegExp): any[] {
  return mockFetch.mock.calls.filter(call => {
    const callUrl = typeof call[0] === 'string'
      ? call[0]
      : call[0] instanceof URL
        ? call[0].toString()
        : call[0].url;

    if (typeof url === 'string') {
      return callUrl === url;
    }
    return url.test(callUrl);
  });
}

export default mockFetch;
