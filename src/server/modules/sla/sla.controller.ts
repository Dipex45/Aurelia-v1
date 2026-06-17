import { Request, Response, NextFunction } from "express";
import * as slaService from "./sla.service.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { z } from "zod";

const slaPolicyRuleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priority_low_response_mins: z.number().int().positive().optional(),
  priority_low_resolve_mins: z.number().int().positive().optional(),
  priority_medium_response_mins: z.number().int().positive().optional(),
  priority_medium_resolve_mins: z.number().int().positive().optional(),
  priority_high_response_mins: z.number().int().positive().optional(),
  priority_high_resolve_mins: z.number().int().positive().optional(),
  priority_critical_response_mins: z.number().int().positive().optional(),
  priority_critical_resolve_mins: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export async function getSlaReportCard(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const report = await slaService.getSlaReportCard(workspaceId);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function listSlaPolicies(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const list = await slaService.listSlaPolicies(workspaceId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function createSlaPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const validated = slaPolicyRuleSchema.parse(req.body);
    const policy = await slaService.createSlaPolicy(workspaceId, validated);
    res.status(201).json(policy);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function updateSlaPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, policyId } = req.params;
    const validated = slaPolicyRuleSchema.partial().parse(req.body);
    const policy = await slaService.updateSlaPolicy(workspaceId, policyId, validated);
    res.json(policy);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteSlaPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, policyId } = req.params;
    const result = await slaService.deleteSlaPolicy(workspaceId, policyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
