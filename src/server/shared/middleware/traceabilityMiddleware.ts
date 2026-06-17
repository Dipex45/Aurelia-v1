import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import "../types.ts";

export function traceabilityMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  
  // Log request for traceability
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = req.auth?.userId || req.userId || "anonymous";
    const workspaceId = req.auth?.workspaceId || "none";
    
    console.log(JSON.stringify({
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      latency: `${duration}ms`,
      userId,
      workspaceId,
      timestamp: new Date().toISOString()
    }));
  });
  
  next();
}
