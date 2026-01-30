/**
 * Unit Tests for Timeout Utility
 */

import { withTimeout, withTimeoutFallback, TimeoutError } from '../../../src/bg/ts/utils/timeout';

describe('timeout utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject with TimeoutError when timeout expires', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('late'), 2000);
      });

      const timeoutPromise = withTimeout(promise, 1000);
      jest.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
    });

    it('should include custom error message', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('late'), 2000);
      });

      const timeoutPromise = withTimeout(promise, 1000, 'Custom timeout message');
      jest.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow('Custom timeout message');
    });

    it('should include default error message with ms', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('late'), 2000);
      });

      const timeoutPromise = withTimeout(promise, 1000);
      jest.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow('Operation timed out after 1000ms');
    });

    it('should propagate rejection from original promise', async () => {
      const promise = Promise.reject(new Error('Original error'));

      await expect(withTimeout(promise, 1000)).rejects.toThrow('Original error');
    });

    it('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const promise = Promise.resolve('success');

      await withTimeout(promise, 1000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout when promise rejects', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const promise = Promise.reject(new Error('error'));

      try {
        await withTimeout(promise, 1000);
      } catch {
        // Expected rejection
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('withTimeoutFallback', () => {
    it('should resolve when promise completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeoutFallback(promise, 1000, 'fallback');
      expect(result).toBe('success');
    });

    it('should return fallback value when timeout expires', async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve('late'), 2000);
      });

      const resultPromise = withTimeoutFallback(promise, 1000, 'fallback');
      jest.advanceTimersByTime(1000);

      const result = await resultPromise;
      expect(result).toBe('fallback');
    });

    it('should return fallback when promise rejects', async () => {
      const promise = Promise.reject(new Error('error'));
      const result = await withTimeoutFallback(promise, 1000, 'fallback');
      expect(result).toBe('fallback');
    });

    it('should work with null fallback', async () => {
      const promise = new Promise<string | null>((resolve) => {
        setTimeout(() => resolve('late'), 2000);
      });

      const resultPromise = withTimeoutFallback(promise, 1000, null);
      jest.advanceTimersByTime(1000);

      const result = await resultPromise;
      expect(result).toBeNull();
    });

    it('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const promise = Promise.resolve('success');

      await withTimeoutFallback(promise, 1000, 'fallback');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('TimeoutError', () => {
    it('should have correct name', () => {
      const error = new TimeoutError();
      expect(error.name).toBe('TimeoutError');
    });

    it('should have default message', () => {
      const error = new TimeoutError();
      expect(error.message).toBe('Operation timed out');
    });

    it('should accept custom message', () => {
      const error = new TimeoutError('Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('should be instanceof Error', () => {
      const error = new TimeoutError();
      expect(error).toBeInstanceOf(Error);
    });
  });
});
