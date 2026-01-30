/**
 * Timeout utility for Promise operations
 */

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @param errorMessage Optional custom error message
 * @returns The resolved value or rejects with TimeoutError
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage ?? `Operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Wrap a promise with a timeout, returning a fallback value on timeout instead of throwing
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @param fallback Value to return on timeout
 * @returns The resolved value or the fallback value
 */
export function withTimeoutFallback<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(fallback);
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        resolve(fallback);
      });
  });
}
