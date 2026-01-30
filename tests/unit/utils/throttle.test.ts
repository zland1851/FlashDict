/**
 * Unit Tests for Throttle Utility
 */

import { throttle } from '../../../src/fg/ts/utils/throttle';

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call function immediately on first invocation', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not call function again within throttle period', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call function after throttle period expires', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    jest.advanceTimersByTime(100);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should schedule trailing call when called during throttle period', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled(); // Immediate call
    jest.advanceTimersByTime(50);
    throttled(); // Scheduled trailing call

    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(50); // Complete the throttle period

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments to the function', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should schedule trailing call with arguments from when timeout was set', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled('first'); // Immediate call
    throttled('second'); // Trailing call scheduled with 'second'
    throttled('third'); // Ignored, trailing already scheduled

    expect(fn).toHaveBeenLastCalledWith('first');

    jest.advanceTimersByTime(100);

    // Trailing call uses args from when timeout was set
    expect(fn).toHaveBeenLastCalledWith('second');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should preserve this context', () => {
    const fn = jest.fn(function (this: { value: number }) {
      return this.value;
    });
    const throttled = throttle(fn, 100);
    const obj = { value: 42, throttled };

    obj.throttled();

    expect(fn.mock.instances[0]).toEqual(obj);
  });

  it('should handle rapid successive calls efficiently', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 50);

    // Simulate rapid mousemove events (20 calls over 100ms)
    for (let i = 0; i < 20; i++) {
      throttled(i);
      jest.advanceTimersByTime(5);
    }

    // Should have throttled to ~3 calls (initial + 2 from throttle periods)
    expect(fn.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('should reset throttle after period of inactivity', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait for throttle period to expire plus some extra time
    jest.advanceTimersByTime(200);

    // Should call immediately again
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
