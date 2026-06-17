import { Request, Response, NextFunction } from "express";
import * as ticketsService from "./tickets.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { ticketSchema, updateTicketSchema } from "../../shared/validation.ts";

export async function listTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const { status, priority, assigneeId, page = "1", limit = "20", q, sortBy, sortOrder } = req.query;
    
    let resolvedAssigneeId = assigneeId as string;
    if (resolvedAssigneeId === "me") {
      resolvedAssigneeId = req.auth!.userId;
    }

    const tickets = await ticketsService.listTickets(workspaceId, {
      status: status as string,
      priority: priority as string,
      assigneeId: resolvedAssigneeId,
      search: q as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      sortBy: sortBy as string,
      sortOrder: sortOrder as ("asc" | "desc")
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}

export async function createTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const creatorId = req.auth!.userId;
    const validated = ticketSchema.parse(req.body);

    const ticket = await ticketsService.createTicket({
      workspaceId,
      creatorId,
      ...validated,
      requestId: req.requestId
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function getTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, ticketId } = req.params;
    const ticket = await ticketsService.getTicket(workspaceId, ticketId);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, ticketId } = req.params;
    const actorId = req.auth!.userId;
    const role = req.auth!.role!;
    const validated = updateTicketSchema.parse(req.body);

    const ticket = await ticketsService.updateTicket(workspaceId, ticketId, actorId, role, validated, req.requestId);
    res.json(ticket);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, ticketId } = req.params;
    await ticketsService.deleteTicket(workspaceId, ticketId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function triageTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, ticketId } = req.params;
    const ticket = await ticketsService.autoTriageTicket(workspaceId, ticketId);
    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }
    res.json(ticket);
  } catch (err) {
    next(err);
  }
}
