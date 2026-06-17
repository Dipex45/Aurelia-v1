import { Router } from "express";
import * as securityController from "./security.controller.ts";
import { authenticate } from "../../shared/middleware/authMiddleware.ts";

export const securityRouter = Router();

securityRouter.get("/stats", authenticate, securityController.getSecurityStats);
securityRouter.post("/rotate-keys", authenticate, securityController.rotateKeys);
securityRouter.post("/trigger-scan", authenticate, securityController.triggerScan);
securityRouter.get("/sbom", authenticate, securityController.downloadSbom);
securityRouter.post("/magic-link", securityController.createMagicLink); // Allow anonymous creation to emulate passwordless login request
securityRouter.post("/delegate", authenticate, securityController.delegatePermission);
