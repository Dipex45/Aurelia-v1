import { Request, Response, NextFunction } from "express";
import * as auditService from "./audit.service.ts";

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const { actorId, action, page = "1", limit = "20" } = req.query;
    
    const p = parseInt(page as string);
    const l = parseInt(limit as string);
    
    const logs = await auditService.getEvents(workspaceId, {
      actorId: actorId as string,
      action: action as string,
      limit: l,
      page: p
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
}
