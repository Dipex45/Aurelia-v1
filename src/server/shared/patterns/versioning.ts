import { Router } from "express";

/**
 * Controller-Namespace API Versioning Handler
 */
export class VersionedApiManager {
  private baseRouter: Router;

  constructor() {
    this.baseRouter = Router();
  }

  /**
   * Registers a versioned route payload namespace
   */
  public registerVersion(version: "v1" | "v2", path: string, router: Router): void {
    const versionedPrefix = `/${version}${path}`;
    console.log(`[APIVersioning] Registered route container: ${versionedPrefix}`);
    this.baseRouter.use(versionedPrefix, router);
  }

  public getRouter(): Router {
    return this.baseRouter;
  }
}

export const apiVersionManager = new VersionedApiManager();
