import { Router } from "express";
import * as messagesController from "./messages.controller.ts";
import { authenticate, requireWorkspaceMember, requirePermission } from "../../shared/middleware/authMiddleware.ts";
import { Permission } from "../../../lib/permissions.ts";

// Create messages router. Use mergeParams so parent path params (workspaceId, ticketId) are visible.
export const messagesRouter = Router({ mergeParams: true });

messagesRouter.use(authenticate, requireWorkspaceMember);

messagesRouter.get("/", messagesController.getMessages);
messagesRouter.post("/", requirePermission(Permission.MESSAGES_CREATE), messagesController.postMessage);
