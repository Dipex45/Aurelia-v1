import { Router } from "express";
import * as auditController from "./audit.controller.ts";
import { authenticate, requireWorkspaceMember, requirePermission } from "../../shared/middleware/authMiddleware.ts";
import { Permission } from "../../../lib/permissions.ts";

// Note: In routes.ts, we use apiRouter.use("/workspaces/:workspaceId/audit", auditRouter);
// So the workspaceId is already in the params.
export const auditRouter = Router({ mergeParams: true });

auditRouter.use(authenticate, requireWorkspaceMember, requirePermission(Permission.AUDIT_VIEW));

auditRouter.get("/", auditController.getAuditLogs);
