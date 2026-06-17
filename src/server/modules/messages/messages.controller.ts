import { Request, Response, NextFunction } from "express";
import * as messagesService from "./messages.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { messageSchema } from "../../shared/validation.ts";

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, ticketId } = req.params;
    const messages = await messagesService.getTicketMessages(workspaceId, ticketId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function postMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, ticketId } = req.params;
    const authorId = req.auth!.userId;
    const validated = messageSchema.parse(req.body);
    
    const message = await messagesService.addMessage({
      workspaceId,
      ticketId,
      authorId,
      content: validated.content,
      isInternal: !!validated.isInternal,
      attachmentIds: validated.attachmentIds,
      requestId: (req as any).requestId
    });
    
    res.status(201).json(message);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}
