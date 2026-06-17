import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "./errorHandler.ts";
import * as authService from "../../modules/auth/auth.service.ts";
import * as workspacesService from "../../modules/workspaces/workspaces.service.ts";
import { hasPermission, Permission, Role } from "../../../lib/permissions.ts";
import "../types.ts";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("FATAL CONFIGURATION ERROR: The JWT_SECRET environment variable is missing in production!");
}
const JWT_SECRET = process.env.JWT_SECRET || "aurelia-ops-top-secret";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    token = req.cookies?.accessToken;
  }

  if (!token) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // Authorization invariant: Check if session is revoked
    if (payload.jti) {
      const isRevoked = await authService.isSessionRevoked(payload.jti);
      if (isRevoked) {
        return next(new ApiError(401, "Unauthorized: Session has been revoked"));
      }
    }

    req.auth = payload;
    req.userId = payload.userId;
    req.userJti = payload.jti;
    // Capture request ID from header if it exists
    req.requestId = req.headers["x-request-id"] as string;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, "Unauthorized: Invalid token"));
    }
    next(err);
  }
}

export async function requireWorkspaceMember(req: Request, res: Response, next: NextFunction) {
  const { workspaceId } = req.params;
  const userId = req.auth?.userId;

  if (!userId) {
    return next(new ApiError(401, "Unauthorized"));
  }

  if (!workspaceId) {
    return next(new ApiError(400, "Workspace ID required"));
  }

  try {
    const workspace = await workspacesService.getWorkspaceIfMember(workspaceId, userId);
    req.auth!.workspaceId = workspaceId;
    req.auth!.role = workspace.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.role || !roles.includes(req.auth.role)) {
      return next(new ApiError(403, "Forbidden: Insufficient permissions"));
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role as Role;
    if (!role || !hasPermission(role, permission)) {
      return next(new ApiError(403, `Forbidden: Missing required capability [${permission}]`));
    }
    next();
  };
}
