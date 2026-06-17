import { Router } from "express";
import * as workspacesController from "./workspaces.controller.ts";
import { authenticate, requireWorkspaceMember, requirePermission } from "../../shared/middleware/authMiddleware.ts";
import { Permission } from "../../../lib/permissions.ts";

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get("/", workspacesController.getMyWorkspaces);
workspacesRouter.post("/", workspacesController.createWorkspace);

// Workspace-specific sub-router
const workspaceBoundRouter = Router({ mergeParams: true });
workspaceBoundRouter.use(requireWorkspaceMember);

workspaceBoundRouter.get("/", workspacesController.getWorkspace);
workspaceBoundRouter.patch("/", requirePermission(Permission.WORKSPACE_EDIT), workspacesController.updateWorkspace);
workspaceBoundRouter.delete("/", requirePermission(Permission.WORKSPACE_DELETE), workspacesController.deleteWorkspace);

// Membership routes
workspaceBoundRouter.get("/members", workspacesController.getMembers);
workspaceBoundRouter.post("/members", requirePermission(Permission.MEMBERS_MANAGE), workspacesController.addMember);
workspaceBoundRouter.delete("/members/:userId", requirePermission(Permission.MEMBERS_MANAGE), workspacesController.removeMember);

workspacesRouter.use("/:workspaceId", workspaceBoundRouter);
