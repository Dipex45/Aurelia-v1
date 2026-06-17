import { Request, Response, NextFunction } from "express";
import { logger } from "../logger.ts";
import * as Sentry from "@sentry/node";

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const requestId = req.requestId || "unknown";

  // Capture production logs in Sentry for internal errors (>= 500)
  if (statusCode >= 500) {
    Sentry.captureException(err, {
      extra: {
        requestId,
        url: req.originalUrl,
        method: req.method,
        userId: req.auth?.userId || req.userId
      }
    });
  }

  logger.error(`${req.method} ${req.path} - Error ${statusCode}: ${message}`, {
    metadata: {
      type: "error",
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      error: message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      userId: req.auth?.userId || req.userId,
      workspaceId: req.auth?.workspaceId
    }
  });

  res.status(statusCode).json({
    error: message,
    statusCode,
    requestId,
  });
}
