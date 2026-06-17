import { Request, Response, NextFunction } from "express";
import { ApiError } from "./errorHandler.ts";

/**
 * Enterprise CSRF Protection Guard
 * Verifies request origins against the system deployment URLs for state-modifying requests.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  // Safe HTTP operations skip verification
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Double Submit Cookie / Origin Match strategy
  const origin = req.headers.origin as string;
  const referer = req.headers.referer as string;
  const parsedTarget = process.env.APP_URL || process.env.CORS_ORIGIN;

  if (!parsedTarget) {
    // In local development, we allow fallback
    return next();
  }

  try {
    const targetUrl = new URL(parsedTarget);
    
    // 1. Origin verification
    if (origin) {
      const originUrl = new URL(origin);
      if (originUrl.host !== targetUrl.host) {
        throw new ApiError(403, "CSRF Security Exception: Request origin does not match authorized application domain.");
      }
    } 
    // 2. Referer verification (failover)
    else if (referer) {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== targetUrl.host) {
        throw new ApiError(403, "CSRF Security Exception: Referral origin mismatch.");
      }
    } 
    // 3. Strict verification: write operations from cookies must possess identity parameters
    else if (req.cookies?.refreshToken) {
      throw new ApiError(403, "CSRF Security Exception: State-modifying cookie requests require strict Origin or Referer verification header.");
    }
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(new ApiError(403, "CSRF Validation Exception. State modified aborted."));
  }

  next();
}
