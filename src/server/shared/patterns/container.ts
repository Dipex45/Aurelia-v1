import { orm } from "../db.ts";

/**
 * Service Locator & Service Container (V5 Pattern)
 * Features dependency injection, circular dependency detection, and lazy initialization.
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private factories: Map<string, (c: ServiceContainer) => any> = new Map();
  private initializing: Set<string> = new Set();
  private cache: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a singleton instance of a service
   */
  public register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Register a factory function for lazy evaluation.
   */
  public registerFactory<T>(name: string, factory: (container: ServiceContainer) => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Resolve and return direct or lazily-constructed services
   */
  public resolve<T>(name: string): T {
    // Audit resolving cache
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    // Circular Dependency Protection
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected while resolving service "${name}": ${Array.from(this.initializing).join(" -> ")} -> ${name}`);
    }

    this.initializing.add(name);

    try {
      if (this.services.has(name)) {
        const svc = this.services.get(name);
        this.cache.set(name, svc);
        return svc;
      }

      const factory = this.factories.get(name);
      if (factory) {
        const svc = factory(this);
        this.services.set(name, svc);
        this.cache.set(name, svc);
        return svc;
      }

      throw new Error(`Service "${name}" was not found or registered in the ServiceContainer.`);
    } finally {
      this.initializing.delete(name);
    }
  }

  /**
   * Clean container cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Audit script for verifying loaded dependencies
   */
  public getLoadedKeys(): string[] {
    return Array.from(this.services.keys());
  }
}

export const container = ServiceContainer.getInstance();
