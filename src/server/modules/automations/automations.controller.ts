import { Request, Response, NextFunction } from "express";
import * as automationsService from "./automations.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { z } from "zod";

const automationRuleSchema = z.object({
  field: z.enum(["title", "description", "priority", "status", "sentiment", "category", "company"]),
  operator: z.enum(["eq", "contains", "not_eq"]),
  value: z.string().min(1),
});

const automationActionSchema = z.object({
  type: z.enum(["set_priority", "set_status", "assign_user", "add_tag"]),
  value: z.string().min(1),
});

const createAutomationSchema = z.object({
  name: z.string().min(2),
  triggerType: z.enum(["ticket_created", "ticket_updated"]),
  conditions: z.array(automationRuleSchema),
  actions: z.array(automationActionSchema),
});

export async function listAutomations(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const list = await automationsService.listAutomations(workspaceId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function createAutomation(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const validated = createAutomationSchema.parse(req.body);

    const rule = await automationsService.createAutomation(
      workspaceId,
      validated.name,
      validated.triggerType,
      validated.conditions,
      validated.actions
    );
    res.status(201).json(rule);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function updateAutomation(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, automationId } = req.params;
    const validated = createAutomationSchema.partial().parse(req.body);

    const rule = await automationsService.updateAutomation(workspaceId, automationId, {
      name: validated.name,
      is_active: req.body.is_active,
      conditions: validated.conditions,
      actions: validated.actions,
    });
    res.json(rule);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteAutomation(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, automationId } = req.params;
    const result = await automationsService.deleteAutomation(workspaceId, automationId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
