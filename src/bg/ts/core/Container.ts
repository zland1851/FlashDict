/**
 * Dependency Injection Container
 * Implements Inversion of Control (IoC) pattern for managing dependencies
 * Supports constructor injection, singleton/transient lifecycles, and lazy instantiation
 */

/**
 * Service lifecycle scope
 */
export type ServiceScope = 'singleton' | 'transient';

/**
 * Service factory function type
 */
export type ServiceFactory<T> = (container: Container) => T;

/**
 * Service registration options
 */
export interface ServiceRegistration<T> {
  /** Factory function to create the service */
  factory: ServiceFactory<T>;
  /** Lifecycle scope */
  scope: ServiceScope;
  /** Cached singleton instance */
  instance?: T;
}

/**
 * Container configuration options
 */
export interface ContainerOptions {
  /** Whether to allow overwriting existing registrations */
  allowOverwrite?: boolean;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * Error thrown when a service is not registered
 */
export class ServiceNotFoundError extends Error {
  constructor(public readonly serviceName: string) {
    super(`Service '${serviceName}' is not registered in the container`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Error thrown when circular dependency is detected
 */
export class CircularDependencyError extends Error {
  constructor(public readonly chain: string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Error thrown when trying to overwrite a registration without permission
 */
export class ServiceAlreadyRegisteredError extends Error {
  constructor(public readonly serviceName: string) {
    super(`Service '${serviceName}' is already registered. Set allowOverwrite: true to replace.`);
    this.name = 'ServiceAlreadyRegisteredError';
  }
}

/**
 * Dependency Injection Container
 * Central registry for managing service instances and their dependencies
 */
export class Container {
  private readonly services = new Map<string, ServiceRegistration<unknown>>();
  private readonly resolving = new Set<string>();
  private readonly options: Required<ContainerOptions>;

  constructor(options: ContainerOptions = {}) {
    this.options = {
      allowOverwrite: options.allowOverwrite ?? false,
      debug: options.debug ?? false
    };
  }

  /**
   * Register a service with the container
   * @param name - Unique service name
   * @param factory - Factory function to create the service
   * @param scope - Lifecycle scope (default: singleton)
   */
  register<T>(
    name: string,
    factory: ServiceFactory<T>,
    scope: ServiceScope = 'singleton'
  ): this {
    if (this.services.has(name) && !this.options.allowOverwrite) {
      throw new ServiceAlreadyRegisteredError(name);
    }

    this.services.set(name, {
      factory: factory as ServiceFactory<unknown>,
      scope,
      instance: undefined
    });

    this.log(`Registered service: ${name} (${scope})`);
    return this;
  }

  /**
   * Register a singleton service
   * @param name - Unique service name
   * @param factory - Factory function to create the service
   */
  registerSingleton<T>(name: string, factory: ServiceFactory<T>): this {
    return this.register(name, factory, 'singleton');
  }

  /**
   * Register a transient service (new instance each time)
   * @param name - Unique service name
   * @param factory - Factory function to create the service
   */
  registerTransient<T>(name: string, factory: ServiceFactory<T>): this {
    return this.register(name, factory, 'transient');
  }

  /**
   * Register an existing instance as a singleton
   * @param name - Unique service name
   * @param instance - Pre-created instance
   */
  registerInstance<T>(name: string, instance: T): this {
    if (this.services.has(name) && !this.options.allowOverwrite) {
      throw new ServiceAlreadyRegisteredError(name);
    }

    this.services.set(name, {
      factory: () => instance,
      scope: 'singleton',
      instance
    });

    this.log(`Registered instance: ${name}`);
    return this;
  }

  /**
   * Resolve a service by name
   * @param name - Service name to resolve
   * @returns The resolved service instance
   * @throws ServiceNotFoundError if service is not registered
   * @throws CircularDependencyError if circular dependency detected
   */
  resolve<T>(name: string): T {
    const registration = this.services.get(name);

    if (!registration) {
      throw new ServiceNotFoundError(name);
    }

    // Check for circular dependency
    if (this.resolving.has(name)) {
      throw new CircularDependencyError([...this.resolving, name]);
    }

    // Return cached singleton if available
    if (registration.scope === 'singleton' && registration.instance !== undefined) {
      this.log(`Returning cached singleton: ${name}`);
      return registration.instance as T;
    }

    // Create new instance
    this.resolving.add(name);
    try {
      this.log(`Creating instance: ${name}`);
      const instance = registration.factory(this) as T;

      // Cache singleton instances
      if (registration.scope === 'singleton') {
        registration.instance = instance;
      }

      return instance;
    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * Try to resolve a service, returning undefined if not found
   * @param name - Service name to resolve
   * @returns The resolved service instance or undefined
   */
  tryResolve<T>(name: string): T | undefined {
    try {
      return this.resolve<T>(name);
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Check if a service is registered
   * @param name - Service name to check
   * @returns true if registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service
   * @param name - Service name to unregister
   * @returns true if service was unregistered
   */
  unregister(name: string): boolean {
    const result = this.services.delete(name);
    if (result) {
      this.log(`Unregistered service: ${name}`);
    }
    return result;
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all registrations and cached instances
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
    this.log('Container cleared');
  }

  /**
   * Create a child container that inherits from this container
   * @param options - Options for the child container
   * @returns New child container
   */
  createChild(options?: ContainerOptions): Container {
    const child = new Container({
      ...this.options,
      ...options
    });

    // Copy registrations to child (shallow copy - they share factories)
    for (const [name, registration] of this.services) {
      child.services.set(name, { ...registration, instance: undefined });
    }

    return child;
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[Container] ${message}`);
    }
  }
}

/**
 * Create a pre-configured container with common services
 * @param options - Container options
 * @returns Configured container
 */
export function createContainer(options?: ContainerOptions): Container {
  return new Container(options);
}

/**
 * Global container instance (optional - for convenience)
 */
let globalContainer: Container | null = null;

/**
 * Get or create the global container instance
 * @returns Global container
 */
export function getGlobalContainer(): Container {
  if (!globalContainer) {
    globalContainer = new Container();
  }
  return globalContainer;
}

/**
 * Set the global container instance
 * @param container - Container to set as global
 */
export function setGlobalContainer(container: Container): void {
  globalContainer = container;
}

/**
 * Reset the global container
 */
export function resetGlobalContainer(): void {
  globalContainer?.clear();
  globalContainer = null;
}
