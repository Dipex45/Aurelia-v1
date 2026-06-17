import { Request, Response, NextFunction } from "express";
import * as workspacesService from "./workspaces.service.ts";
import { workspaceSchema, addMemberSchema } from "../../shared/validation.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";

export async function getMyWorkspaces(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const workspaces = await workspacesService.getWorkspacesForUser(userId);
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
}

export async function createWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const validated = workspaceSchema.parse(req.body);
    const workspace = await workspacesService.createWorkspace(userId, validated.name, validated.slug);
    res.status(201).json(workspace);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function getWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const userId = req.auth!.userId;
    const workspace = await workspacesService.getWorkspaceIfMember(workspaceId, userId);
    res.json(workspace);
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const userId = req.auth!.userId;
    const validated = workspaceSchema.partial().parse(req.body);
    const result = await workspacesService.updateWorkspace(workspaceId, userId, validated);
    res.json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const userId = req.auth!.userId;
    await workspacesService.deleteWorkspace(workspaceId, userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const members = await workspacesService.getMembers(workspaceId);
    res.json({ items: members });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId } = req.params;
    const adminId = req.auth!.userId;
    const validated = addMemberSchema.parse(req.body);
    const result = await workspacesService.addMember(workspaceId, adminId, validated.email, validated.role);
    res.json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return next(new ApiError(400, `Validation Error: ${err.errors[0].message}`));
    }
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, userId: targetUserId } = req.params;
    const adminId = req.auth!.userId;
    const result = await workspacesService.removeMember(workspaceId, adminId, targetUserId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
