/**
 * Unit Tests for Message Router
 */

import {
  MessageRouter,
  UnknownActionError,
  DuplicateHandlerError,
  InvalidHandlerError,
  createMessageRouter,
  createHandler,
  createLoggingMiddleware,
  createValidationMiddleware,
  createRateLimitMiddleware
} from '../../../src/bg/ts/core/MessageRouter';
import { IMessageHandler, Message, MessageSender } from '../../../src/bg/ts/interfaces/IMessageHandler';

describe('MessageRouter', () => {
  let router: MessageRouter;
  let mockSender: MessageSender;

  beforeEach(() => {
    router = new MessageRouter();
    mockSender = {
      tabId: 1,
      frameId: 0,
      url: 'https://example.com'
    };
  });

  describe('register', () => {
    it('should register a valid handler', () => {
      const handler: IMessageHandler = {
        handle: jest.fn(),
        canHandle: (action) => action === 'test'
      };

      router.register('test', handler);

      expect(router.hasHandler('test')).toBe(true);
    });

    it('should throw DuplicateHandlerError on duplicate registration', () => {
      const handler: IMessageHandler = {
        handle: jest.fn(),
        canHandle: () => true
      };

      router.register('test', handler);

      expect(() => router.register('test', handler)).toThrow(DuplicateHandlerError);
    });

    it('should throw InvalidHandlerError for invalid handler', () => {
      const invalidHandler = { foo: 'bar' } as unknown as IMessageHandler;

      expect(() => router.register('test', invalidHandler)).toThrow(InvalidHandlerError);
    });

    it('should throw InvalidHandlerError for handler missing canHandle', () => {
      const invalidHandler = {
        handle: jest.fn()
      } as unknown as IMessageHandler;

      expect(() => router.register('test', invalidHandler)).toThrow(InvalidHandlerError);
    });
  });

  describe('registerAll', () => {
    it('should register multiple handlers at once', () => {
      const handlers: Record<string, IMessageHandler> = {
        action1: { handle: jest.fn(), canHandle: () => true },
        action2: { handle: jest.fn(), canHandle: () => true },
        action3: { handle: jest.fn(), canHandle: () => true }
      };

      router.registerAll(handlers);

      expect(router.hasHandler('action1')).toBe(true);
      expect(router.hasHandler('action2')).toBe(true);
      expect(router.hasHandler('action3')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove a registered handler', () => {
      const handler: IMessageHandler = {
        handle: jest.fn(),
        canHandle: () => true
      };

      router.register('test', handler);
      expect(router.hasHandler('test')).toBe(true);

      const result = router.unregister('test');

      expect(result).toBe(true);
      expect(router.hasHandler('test')).toBe(false);
    });

    it('should return false for non-existent handler', () => {
      const result = router.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('hasHandler', () => {
    it('should return true for registered handlers', () => {
      router.register('test', { handle: jest.fn(), canHandle: () => true });
      expect(router.hasHandler('test')).toBe(true);
    });

    it('should return false for unregistered handlers', () => {
      expect(router.hasHandler('nonexistent')).toBe(false);
    });
  });

  describe('getRegisteredActions', () => {
    it('should return all registered action names', () => {
      router.register('action1', { handle: jest.fn(), canHandle: () => true });
      router.register('action2', { handle: jest.fn(), canHandle: () => true });
      router.register('action3', { handle: jest.fn(), canHandle: () => true });

      const actions = router.getRegisteredActions();

      expect(actions).toContain('action1');
      expect(actions).toContain('action2');
      expect(actions).toContain('action3');
      expect(actions).toHaveLength(3);
    });

    it('should return empty array for empty router', () => {
      expect(router.getRegisteredActions()).toEqual([]);
    });
  });

  describe('route', () => {
    it('should route message to correct handler', async () => {
      const handler: IMessageHandler = {
        handle: jest.fn().mockResolvedValue({ result: 'success' }),
        canHandle: () => true
      };

      router.register('testAction', handler);

      const message: Message = { action: 'testAction', params: { foo: 'bar' } };
      const response = await router.route(message, mockSender);

      expect(handler.handle).toHaveBeenCalledWith({ foo: 'bar' }, mockSender);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 'success' });
    });

    it('should throw UnknownActionError for unknown action when throwOnUnknown is true', async () => {
      const message: Message = { action: 'unknownAction' };

      await expect(router.route(message, mockSender)).rejects.toThrow(UnknownActionError);
    });

    it('should return default response for unknown action when throwOnUnknown is false', async () => {
      const routerNoThrow = new MessageRouter({ throwOnUnknown: false });
      const message: Message = { action: 'unknownAction' };

      const response = await routerNoThrow.route(message, mockSender);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown action');
    });

    it('should return custom default response when configured', async () => {
      const customResponse = { success: false, error: 'Custom error message' };
      const routerCustom = new MessageRouter({
        throwOnUnknown: false,
        defaultResponse: customResponse
      });
      const message: Message = { action: 'unknownAction' };

      const response = await routerCustom.route(message, mockSender);

      expect(response).toEqual(customResponse);
    });

    it('should handle handler errors gracefully', async () => {
      const handler: IMessageHandler = {
        handle: jest.fn().mockRejectedValue(new Error('Handler failed')),
        canHandle: () => true
      };

      router.register('errorAction', handler);

      const message: Message = { action: 'errorAction' };
      const response = await router.route(message, mockSender);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Handler failed');
    });

    it('should handle non-Error throws', async () => {
      const handler: IMessageHandler = {
        handle: jest.fn().mockRejectedValue('string error'),
        canHandle: () => true
      };

      router.register('stringError', handler);

      const message: Message = { action: 'stringError' };
      const response = await router.route(message, mockSender);

      expect(response.success).toBe(false);
      expect(response.error).toBe('string error');
    });
  });

  describe('middleware', () => {
    it('should execute middleware in order', async () => {
      const order: number[] = [];

      router.use(async (_message, _sender, next) => {
        order.push(1);
        const result = await next();
        order.push(4);
        return result;
      });

      router.use(async (_message, _sender, next) => {
        order.push(2);
        const result = await next();
        order.push(3);
        return result;
      });

      router.register('test', {
        handle: jest.fn().mockResolvedValue('result'),
        canHandle: () => true
      });

      await router.route({ action: 'test' }, mockSender);

      expect(order).toEqual([1, 2, 3, 4]);
    });

    it('should allow middleware to modify response', async () => {
      router.use(async (_message, _sender, next) => {
        const response = await next();
        const data = response.data as Record<string, unknown> ?? {};
        return {
          ...response,
          data: { ...data, modified: true }
        };
      });

      router.register('test', {
        handle: jest.fn().mockResolvedValue({ original: true }),
        canHandle: () => true
      });

      const response = await router.route({ action: 'test' }, mockSender);

      expect(response.data).toEqual({ original: true, modified: true });
    });

    it('should allow middleware to short-circuit', async () => {
      const handler = jest.fn();

      router.use(async (_message, _sender, _next) => {
        return { success: false, error: 'Blocked by middleware' };
      });

      router.register('test', {
        handle: handler,
        canHandle: () => true
      });

      const response = await router.route({ action: 'test' }, mockSender);

      expect(handler).not.toHaveBeenCalled();
      expect(response.success).toBe(false);
      expect(response.error).toBe('Blocked by middleware');
    });
  });

  describe('clear', () => {
    it('should remove all handlers and middleware', () => {
      router.register('action1', { handle: jest.fn(), canHandle: () => true });
      router.register('action2', { handle: jest.fn(), canHandle: () => true });
      router.use(async (_m, _s, next) => next());

      router.clear();

      expect(router.getRegisteredActions()).toEqual([]);
    });
  });
});

describe('createMessageRouter', () => {
  it('should create a new MessageRouter', () => {
    const router = createMessageRouter();
    expect(router).toBeInstanceOf(MessageRouter);
  });

  it('should accept options', () => {
    const router = createMessageRouter({ debug: true });
    expect(router).toBeInstanceOf(MessageRouter);
  });
});

describe('createHandler', () => {
  it('should create a valid handler from a function', async () => {
    const handleFn = jest.fn().mockResolvedValue({ data: 'test' });
    const handler = createHandler('testAction', handleFn);

    expect(handler.canHandle('testAction')).toBe(true);
    expect(handler.canHandle('otherAction')).toBe(false);

    const result = await handler.handle({ param: 1 }, { tabId: 1 });

    expect(handleFn).toHaveBeenCalledWith({ param: 1 }, { tabId: 1 });
    expect(result).toEqual({ data: 'test' });
  });
});

describe('createLoggingMiddleware', () => {
  it('should log messages', async () => {
    const logs: string[] = [];
    const logger = (msg: string) => logs.push(msg);

    const router = new MessageRouter();
    router.use(createLoggingMiddleware(logger));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    await router.route({ action: 'test' }, { url: 'https://test.com' });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toContain('[test]');
    expect(logs[0]).toContain('Request');
    expect(logs[1]).toContain('Response');
    expect(logs[1]).toContain('success');
  });
});

describe('createValidationMiddleware', () => {
  it('should allow valid messages', async () => {
    const router = new MessageRouter();
    router.use(createValidationMiddleware(() => true));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const response = await router.route({ action: 'test' }, {});

    expect(response.success).toBe(true);
  });

  it('should block invalid messages with default error', async () => {
    const router = new MessageRouter();
    router.use(createValidationMiddleware(() => false));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const response = await router.route({ action: 'test' }, {});

    expect(response.success).toBe(false);
    expect(response.error).toBe('Message validation failed');
  });

  it('should block invalid messages with custom error', async () => {
    const router = new MessageRouter();
    router.use(createValidationMiddleware(() => 'Custom validation error'));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const response = await router.route({ action: 'test' }, {});

    expect(response.success).toBe(false);
    expect(response.error).toBe('Custom validation error');
  });
});

describe('createRateLimitMiddleware', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests under limit', async () => {
    const router = new MessageRouter();
    router.use(createRateLimitMiddleware(3, 1000));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const sender = { tabId: 1 };

    for (let i = 0; i < 3; i++) {
      const response = await router.route({ action: 'test' }, sender);
      expect(response.success).toBe(true);
    }
  });

  it('should block requests over limit', async () => {
    const router = new MessageRouter();
    router.use(createRateLimitMiddleware(2, 1000));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const sender = { tabId: 1 };

    await router.route({ action: 'test' }, sender);
    await router.route({ action: 'test' }, sender);

    const response = await router.route({ action: 'test' }, sender);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Rate limit exceeded');
  });

  it('should reset after window expires', async () => {
    const router = new MessageRouter();
    router.use(createRateLimitMiddleware(1, 1000));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const sender = { tabId: 1 };

    await router.route({ action: 'test' }, sender);

    // Move time forward past the window
    jest.advanceTimersByTime(1001);

    const response = await router.route({ action: 'test' }, sender);
    expect(response.success).toBe(true);
  });

  it('should track different senders separately', async () => {
    const router = new MessageRouter();
    router.use(createRateLimitMiddleware(1, 1000));
    router.register('test', {
      handle: jest.fn().mockResolvedValue('ok'),
      canHandle: () => true
    });

    const sender1 = { tabId: 1 };
    const sender2 = { tabId: 2 };

    await router.route({ action: 'test' }, sender1);
    const response = await router.route({ action: 'test' }, sender2);

    expect(response.success).toBe(true);
  });
});
