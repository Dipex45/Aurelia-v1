import { Router } from "express";
import * as performanceController from "./performance.controller.ts";
import { authenticate } from "../../shared/middleware/authMiddleware.ts";

export const performanceRouter = Router();

performanceRouter.get("/stats", authenticate, performanceController.getStats);
performanceRouter.post("/purge", authenticate, performanceController.purgeCache);
performanceRouter.post("/warmup", authenticate, performanceController.warmupCache);
performanceRouter.post("/explain", authenticate, performanceController.simulateExplain);
performanceRouter.post("/optimize-db", authenticate, performanceController.runDbOptimize);
performanceRouter.post("/batch-test", authenticate, performanceController.runBatchSimulator);
performanceRouter.get("/logs-stream", performanceController.streamOptimizerLogs); // Stream logs with server-sent events (SSE) compatible
