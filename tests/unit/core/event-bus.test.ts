/**
 * Unit Tests for Event Bus
 */

import {
  EventBus,
  MaxHandlersExceededError,
  createEventBus,
  getGlobalEventBus,
  setGlobalEventBus,
  resetGlobalEventBus,
  TypedEventBus
} from '../../../src/bg/ts/core/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    resetGlobalEventBus();
  });

  describe('on', () => {
    it('should subscribe to an event', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);

      eventBus.emit('test', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should return an unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.on('test', handler);

      unsubscribe();
      eventBus.emit('test', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.emit('test', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should support priority ordering', () => {
      const callOrder: number[] = [];

      eventBus.on('test', () => { callOrder.push(1); }, { priority: 0 });
      eventBus.on('test', () => { callOrder.push(2); }, { priority: 10 });
      eventBus.on('test', () => { callOrder.push(3); }, { priority: 5 });

      eventBus.emit('test');

      expect(callOrder).toEqual([2, 3, 1]); // Higher priority first
    });

    it('should throw MaxHandlersExceededError when limit reached', () => {
      const limitedBus = new EventBus({ maxHandlers: 2 });

      limitedBus.on('test', () => {});
      limitedBus.on('test', () => {});

      expect(() => limitedBus.on('test', () => {})).toThrow(MaxHandlersExceededError);
    });
  });

  describe('once', () => {
    it('should only call handler once', () => {
      const handler = jest.fn();
      eventBus.once('test', handler);

      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should remove handler after first call', () => {
      eventBus.once('test', () => {});

      expect(eventBus.hasSubscribers('test')).toBe(true);
      eventBus.emit('test');
      expect(eventBus.hasSubscribers('test')).toBe(false);
    });
  });

  describe('emit', () => {
    it('should emit event to all subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.emit('test', 'payload');

      expect(handler1).toHaveBeenCalledWith('payload');
      expect(handler2).toHaveBeenCalledWith('payload');
    });

    it('should handle events with no subscribers', () => {
      expect(() => eventBus.emit('nonexistent', 'data')).not.toThrow();
    });

    it('should catch handler errors when catchErrors is true', () => {
      const errorBus = new EventBus({ catchErrors: true });
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const secondHandler = jest.fn();

      errorBus.on('test', errorHandler);
      errorBus.on('test', secondHandler);

      expect(() => errorBus.emit('test', 'data')).not.toThrow();
      expect(secondHandler).toHaveBeenCalled();
    });

    it('should throw handler errors when catchErrors is false', () => {
      const strictBus = new EventBus({ catchErrors: false });
      const errorHandler = () => {
        throw new Error('Handler error');
      };

      strictBus.on('test', errorHandler);

      expect(() => strictBus.emit('test', 'data')).toThrow('Handler error');
    });

    it('should pass undefined when no data provided', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);

      eventBus.emit('test');

      expect(handler).toHaveBeenCalledWith(undefined);
    });
  });

  describe('emitAsync', () => {
    it('should wait for all async handlers to complete', async () => {
      const results: number[] = [];

      eventBus.on('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push(1);
      });
      eventBus.on('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(2);
      });

      await eventBus.emitAsync('test');

      expect(results).toContain(1);
      expect(results).toContain(2);
    });

    it('should handle mix of sync and async handlers', async () => {
      const results: number[] = [];

      eventBus.on('test', () => {
        results.push(1);
      });
      eventBus.on('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(2);
      });

      await eventBus.emitAsync('test');

      expect(results).toEqual([1, 2]);
    });

    it('should remove once handlers after async emit', async () => {
      eventBus.once('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(eventBus.hasSubscribers('test')).toBe(true);
      await eventBus.emitAsync('test');
      expect(eventBus.hasSubscribers('test')).toBe(false);
    });
  });

  describe('hasSubscribers', () => {
    it('should return true when event has subscribers', () => {
      eventBus.on('test', () => {});
      expect(eventBus.hasSubscribers('test')).toBe(true);
    });

    it('should return false when event has no subscribers', () => {
      expect(eventBus.hasSubscribers('nonexistent')).toBe(false);
    });

    it('should return false after all subscribers unsubscribed', () => {
      const unsub = eventBus.on('test', () => {});
      expect(eventBus.hasSubscribers('test')).toBe(true);

      unsub();
      expect(eventBus.hasSubscribers('test')).toBe(false);
    });
  });

  describe('subscriberCount', () => {
    it('should return correct count', () => {
      eventBus.on('test', () => {});
      eventBus.on('test', () => {});
      eventBus.on('test', () => {});

      expect(eventBus.subscriberCount('test')).toBe(3);
    });

    it('should return 0 for non-existent event', () => {
      expect(eventBus.subscriberCount('nonexistent')).toBe(0);
    });
  });

  describe('getEventNames', () => {
    it('should return all event names with subscribers', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      eventBus.on('event3', () => {});

      const names = eventBus.getEventNames();

      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
    });

    it('should return empty array for empty bus', () => {
      expect(eventBus.getEventNames()).toEqual([]);
    });
  });

  describe('clearEvent', () => {
    it('should remove all subscribers for specific event', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});

      eventBus.clearEvent('event1');

      expect(eventBus.hasSubscribers('event1')).toBe(false);
      expect(eventBus.hasSubscribers('event2')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all subscribers for all events', () => {
      eventBus.on('event1', () => {});
      eventBus.on('event2', () => {});
      eventBus.on('event3', () => {});

      eventBus.clear();

      expect(eventBus.getEventNames()).toEqual([]);
    });
  });

  describe('createEventBus helper', () => {
    it('should create a new EventBus', () => {
      const bus = createEventBus();
      expect(bus).toBeInstanceOf(EventBus);
    });

    it('should accept options', () => {
      const bus = createEventBus({ maxHandlers: 1 });
      bus.on('test', () => {});
      expect(() => bus.on('test', () => {})).toThrow(MaxHandlersExceededError);
    });
  });

  describe('global event bus', () => {
    it('should return the same global instance', () => {
      const first = getGlobalEventBus();
      const second = getGlobalEventBus();
      expect(first).toBe(second);
    });

    it('should allow setting a custom global bus', () => {
      const customBus = new EventBus();
      const handler = jest.fn();

      setGlobalEventBus(customBus);
      getGlobalEventBus().on('test', handler);
      customBus.emit('test', 'data');

      expect(handler).toHaveBeenCalledWith('data');
    });

    it('should reset global bus', () => {
      const original = getGlobalEventBus();
      original.on('test', () => {});

      resetGlobalEventBus();

      const newGlobal = getGlobalEventBus();
      expect(newGlobal).not.toBe(original);
      expect(newGlobal.hasSubscribers('test')).toBe(false);
    });
  });
});

describe('TypedEventBus', () => {
  interface TestEvents extends Record<string, unknown> {
    'user:login': { userId: string; timestamp: number };
    'user:logout': { userId: string };
    'data:loaded': { items: string[] };
  }

  let typedBus: TypedEventBus<TestEvents>;

  beforeEach(() => {
    typedBus = new TypedEventBus<TestEvents>();
  });

  it('should provide type-safe event handling', () => {
    const loginHandler = jest.fn();
    typedBus.on('user:login', loginHandler);

    typedBus.emit('user:login', { userId: 'user1', timestamp: Date.now() });

    expect(loginHandler).toHaveBeenCalled();
    const callArg = loginHandler.mock.calls[0][0];
    expect(callArg.userId).toBe('user1');
    expect(typeof callArg.timestamp).toBe('number');
  });

  it('should support once subscriptions', () => {
    const handler = jest.fn();
    typedBus.once('data:loaded', handler);

    typedBus.emit('data:loaded', { items: ['a', 'b'] });
    typedBus.emit('data:loaded', { items: ['c', 'd'] });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support async emit', async () => {
    const handler = jest.fn();
    typedBus.on('user:logout', handler);

    await typedBus.emitAsync('user:logout', { userId: 'user1' });

    expect(handler).toHaveBeenCalledWith({ userId: 'user1' });
  });

  it('should support hasSubscribers', () => {
    expect(typedBus.hasSubscribers('user:login')).toBe(false);

    typedBus.on('user:login', () => {});

    expect(typedBus.hasSubscribers('user:login')).toBe(true);
  });

  it('should support clear', () => {
    typedBus.on('user:login', () => {});
    typedBus.on('user:logout', () => {});

    typedBus.clear();

    expect(typedBus.hasSubscribers('user:login')).toBe(false);
    expect(typedBus.hasSubscribers('user:logout')).toBe(false);
  });
});
