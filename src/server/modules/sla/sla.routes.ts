import { Router } from "express";
import * as slaController from "./sla.controller.ts";
import { authenticate, requireWorkspaceMember } from "../../shared/middleware/authMiddleware.ts";

export const slaRouter = Router({ mergeParams: true });

slaRouter.use(authenticate, requireWorkspaceMember);

slaRouter.get("/status", slaController.getSlaReportCard);
slaRouter.get("/policies", slaController.listSlaPolicies);
slaRouter.post("/policies", slaController.createSlaPolicy);
slaRouter.patch("/policies/:policyId", slaController.updateSlaPolicy);
slaRouter.delete("/policies/:policyId", slaController.deleteSlaPolicy);
