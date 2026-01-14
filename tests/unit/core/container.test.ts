/**
 * Unit Tests for Dependency Injection Container
 */

import {
  Container,
  ServiceNotFoundError,
  CircularDependencyError,
  ServiceAlreadyRegisteredError,
  createContainer,
  getGlobalContainer,
  setGlobalContainer,
  resetGlobalContainer
} from '../../../src/bg/ts/core/Container';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    resetGlobalContainer();
  });

  describe('register', () => {
    it('should register a service factory', () => {
      container.register('testService', () => ({ value: 42 }));
      expect(container.has('testService')).toBe(true);
    });

    it('should return the container for chaining', () => {
      const result = container.register('service1', () => ({}));
      expect(result).toBe(container);
    });

    it('should throw ServiceAlreadyRegisteredError on duplicate registration', () => {
      container.register('testService', () => ({}));
      expect(() => container.register('testService', () => ({}))).toThrow(
        ServiceAlreadyRegisteredError
      );
    });

    it('should allow overwrite when configured', () => {
      const containerWithOverwrite = new Container({ allowOverwrite: true });
      containerWithOverwrite.register('testService', () => ({ version: 1 }));
      containerWithOverwrite.register('testService', () => ({ version: 2 }));

      const result = containerWithOverwrite.resolve<{ version: number }>('testService');
      expect(result.version).toBe(2);
    });
  });

  describe('registerSingleton', () => {
    it('should register a singleton service', () => {
      let callCount = 0;
      container.registerSingleton('counter', () => {
        callCount++;
        return { count: callCount };
      });

      const first = container.resolve<{ count: number }>('counter');
      const second = container.resolve<{ count: number }>('counter');

      expect(first).toBe(second);
      expect(callCount).toBe(1);
    });
  });

  describe('registerTransient', () => {
    it('should create new instance each time for transient services', () => {
      let callCount = 0;
      container.registerTransient('counter', () => {
        callCount++;
        return { count: callCount };
      });

      const first = container.resolve<{ count: number }>('counter');
      const second = container.resolve<{ count: number }>('counter');

      expect(first).not.toBe(second);
      expect(first.count).toBe(1);
      expect(second.count).toBe(2);
      expect(callCount).toBe(2);
    });
  });

  describe('registerInstance', () => {
    it('should register an existing instance', () => {
      const instance = { id: 'test-instance' };
      container.registerInstance('myInstance', instance);

      const resolved = container.resolve<{ id: string }>('myInstance');
      expect(resolved).toBe(instance);
    });

    it('should throw on duplicate instance registration', () => {
      container.registerInstance('myInstance', { id: 1 });
      expect(() => container.registerInstance('myInstance', { id: 2 })).toThrow(
        ServiceAlreadyRegisteredError
      );
    });
  });

  describe('resolve', () => {
    it('should resolve a registered service', () => {
      container.register('testService', () => ({ value: 'hello' }));
      const result = container.resolve<{ value: string }>('testService');
      expect(result.value).toBe('hello');
    });

    it('should throw ServiceNotFoundError for unregistered service', () => {
      expect(() => container.resolve('nonexistent')).toThrow(ServiceNotFoundError);
    });

    it('should pass container to factory for dependency resolution', () => {
      container.register('dependency', () => ({ name: 'dep' }));
      container.register('service', (c) => ({
        dep: c.resolve<{ name: string }>('dependency')
      }));

      const result = container.resolve<{ dep: { name: string } }>('service');
      expect(result.dep.name).toBe('dep');
    });

    it('should detect circular dependencies', () => {
      container.register('serviceA', (c) => ({
        b: c.resolve('serviceB')
      }));
      container.register('serviceB', (c) => ({
        a: c.resolve('serviceA')
      }));

      expect(() => container.resolve('serviceA')).toThrow(CircularDependencyError);
    });

    it('should cache singleton instances', () => {
      let created = 0;
      container.registerSingleton('singleton', () => {
        created++;
        return { id: created };
      });

      container.resolve('singleton');
      container.resolve('singleton');
      container.resolve('singleton');

      expect(created).toBe(1);
    });
  });

  describe('tryResolve', () => {
    it('should return undefined for unregistered service', () => {
      const result = container.tryResolve('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return the service if registered', () => {
      container.register('testService', () => ({ value: 42 }));
      const result = container.tryResolve<{ value: number }>('testService');
      expect(result?.value).toBe(42);
    });

    it('should still throw CircularDependencyError', () => {
      container.register('serviceA', (c) => ({ b: c.resolve('serviceB') }));
      container.register('serviceB', (c) => ({ a: c.resolve('serviceA') }));

      expect(() => container.tryResolve('serviceA')).toThrow(CircularDependencyError);
    });
  });

  describe('has', () => {
    it('should return true for registered services', () => {
      container.register('testService', () => ({}));
      expect(container.has('testService')).toBe(true);
    });

    it('should return false for unregistered services', () => {
      expect(container.has('nonexistent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove a registered service', () => {
      container.register('testService', () => ({}));
      const result = container.unregister('testService');

      expect(result).toBe(true);
      expect(container.has('testService')).toBe(false);
    });

    it('should return false for non-existent service', () => {
      const result = container.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getRegisteredServices', () => {
    it('should return all registered service names', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));
      container.register('service3', () => ({}));

      const services = container.getRegisteredServices();

      expect(services).toContain('service1');
      expect(services).toContain('service2');
      expect(services).toContain('service3');
      expect(services).toHaveLength(3);
    });

    it('should return empty array for empty container', () => {
      expect(container.getRegisteredServices()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all registrations', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));

      container.clear();

      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(false);
      expect(container.getRegisteredServices()).toHaveLength(0);
    });
  });

  describe('createChild', () => {
    it('should create child container with inherited registrations', () => {
      container.register('parentService', () => ({ source: 'parent' }));

      const child = container.createChild();

      expect(child.has('parentService')).toBe(true);
    });

    it('should not share singleton instances with parent', () => {
      let callCount = 0;
      container.registerSingleton('counter', () => ({ count: ++callCount }));

      const parentResult = container.resolve<{ count: number }>('counter');
      const child = container.createChild();
      const childResult = child.resolve<{ count: number }>('counter');

      expect(parentResult.count).toBe(1);
      expect(childResult.count).toBe(2);
    });

    it('should allow child to override parent registrations', () => {
      container.register('service', () => ({ version: 'parent' }));

      const child = container.createChild({ allowOverwrite: true });
      child.register('service', () => ({ version: 'child' }));

      const result = child.resolve<{ version: string }>('service');
      expect(result.version).toBe('child');
    });
  });

  describe('createContainer helper', () => {
    it('should create a new container', () => {
      const newContainer = createContainer();
      expect(newContainer).toBeInstanceOf(Container);
    });

    it('should accept options', () => {
      const newContainer = createContainer({ allowOverwrite: true });
      newContainer.register('test', () => ({}));
      newContainer.register('test', () => ({ updated: true }));

      const result = newContainer.resolve<{ updated?: boolean }>('test');
      expect(result.updated).toBe(true);
    });
  });

  describe('global container', () => {
    it('should return the same global container instance', () => {
      const first = getGlobalContainer();
      const second = getGlobalContainer();
      expect(first).toBe(second);
    });

    it('should allow setting a custom global container', () => {
      const customContainer = new Container();
      customContainer.register('custom', () => ({ isCustom: true }));

      setGlobalContainer(customContainer);

      const result = getGlobalContainer().resolve<{ isCustom: boolean }>('custom');
      expect(result.isCustom).toBe(true);
    });

    it('should reset global container', () => {
      const global = getGlobalContainer();
      global.register('test', () => ({}));

      resetGlobalContainer();

      const newGlobal = getGlobalContainer();
      expect(newGlobal).not.toBe(global);
      expect(newGlobal.has('test')).toBe(false);
    });
  });

  describe('complex dependency graphs', () => {
    it('should resolve deep dependency chains', () => {
      container.register('level3', () => ({ level: 3 }));
      container.register('level2', (c) => ({
        level: 2,
        child: c.resolve<{ level: number }>('level3')
      }));
      container.register('level1', (c) => ({
        level: 1,
        child: c.resolve<{ level: number; child: { level: number } }>('level2')
      }));

      const result = container.resolve<{
        level: number;
        child: { level: number; child: { level: number } };
      }>('level1');

      expect(result.level).toBe(1);
      expect(result.child.level).toBe(2);
      expect(result.child.child.level).toBe(3);
    });

    it('should handle diamond dependency pattern', () => {
      // A depends on B and C, B and C both depend on D
      let dCreations = 0;
      container.registerSingleton('D', () => ({ id: 'D', created: ++dCreations }));
      container.register('B', (c) => ({
        id: 'B',
        d: c.resolve<{ id: string }>('D')
      }));
      container.register('C', (c) => ({
        id: 'C',
        d: c.resolve<{ id: string }>('D')
      }));
      container.register('A', (c) => ({
        id: 'A',
        b: c.resolve<{ id: string; d: { id: string } }>('B'),
        c: c.resolve<{ id: string; d: { id: string } }>('C')
      }));

      const result = container.resolve<{
        id: string;
        b: { id: string; d: { id: string; created: number } };
        c: { id: string; d: { id: string; created: number } };
      }>('A');

      expect(result.id).toBe('A');
      expect(result.b.d).toBe(result.c.d); // Same singleton instance
      expect(dCreations).toBe(1); // D created only once
    });
  });
});
