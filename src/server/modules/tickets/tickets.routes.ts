import { Router } from "express";
import * as ticketsController from "./tickets.controller.ts";
import { messagesRouter } from "../messages/messages.routes.ts";
import { authenticate, requireWorkspaceMember, requirePermission } from "../../shared/middleware/authMiddleware.ts";
import { Permission } from "../../../lib/permissions.ts";

// Merge params to get workspaceId from parent router
export const ticketsRouter = Router({ mergeParams: true });

ticketsRouter.use(authenticate, requireWorkspaceMember);

ticketsRouter.get("/", ticketsController.listTickets);
ticketsRouter.post("/", requirePermission(Permission.TICKETS_CREATE), ticketsController.createTicket);
ticketsRouter.get("/:ticketId", ticketsController.getTicket);
ticketsRouter.post("/:ticketId/triage", requirePermission(Permission.TICKETS_EDIT), ticketsController.triageTicket);
ticketsRouter.patch("/:ticketId", requirePermission(Permission.TICKETS_EDIT), ticketsController.updateTicket);
ticketsRouter.delete("/:ticketId", requirePermission(Permission.TICKETS_DELETE), ticketsController.deleteTicket);

// Messages route delegation
ticketsRouter.use("/:ticketId/messages", messagesRouter);
