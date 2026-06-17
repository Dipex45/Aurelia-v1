import { container } from "./container.ts";
import { TicketRepository, CustomerRepository } from "./repositories.ts";
import { DbKbStoreFactory, InMemoryKbStoreFactory, DefaultSlaStrategy, CustomEnterpriseSlaStrategy } from "./design-patterns.ts";
import { InMemoryCacheManager, ConsoleNotificationService, SlaReportGenerator, TicketMicroserviceAdapter } from "./layers.ts";

/**
 * Bootstraps standard patterns, repositories, and handlers into the Dependency Injection container.
 */
export function bootstrapDIContainer() {
  console.log("[AureliaDI] Bootstrapping Service Container...");

  // Register Repositories
  container.registerFactory("TicketRepository", () => new TicketRepository());
  container.registerFactory("CustomerRepository", () => new CustomerRepository());

  // Register KB Storage Factories
  container.registerFactory("DbKbStoreFactory", () => new DbKbStoreFactory());
  container.registerFactory("InMemoryKbStoreFactory", () => new InMemoryKbStoreFactory());

  // Register SLA Strategies
  container.registerFactory("DefaultSlaStrategy", () => new DefaultSlaStrategy());
  container.registerFactory("CustomEnterpriseSlaStrategy", () => new CustomEnterpriseSlaStrategy());

  // Register Separation Layers (Caching, Notifications, Reports, Port/Adapters)
  container.registerFactory("CacheManager", () => new InMemoryCacheManager());
  container.registerFactory("NotificationService", () => new ConsoleNotificationService());
  container.registerFactory("ReportGenerator", () => new SlaReportGenerator());
  container.registerFactory("TicketPort", () => new TicketMicroserviceAdapter());

  console.log(`[AureliaDI] Bootstrapped keys successfully: ${container.getLoadedKeys().join(", ")}`);
}

// Automatically bootstrap on load
bootstrapDIContainer();

export * from "./container.ts";
export * from "./design-patterns.ts";
export * from "./repositories.ts";
export * from "./dto.ts";
export * from "./saga.ts";
export * from "./domain-events.ts";
export * from "./api-contract.ts";
export * from "./versioning.ts";
export * from "./layers.ts";
