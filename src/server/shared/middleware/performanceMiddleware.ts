import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Storing slow queries in-memory for analytics dashboard
export interface SlowQueryRecord {
  id: string;
  url: string;
  method: string;
  durationMs: number;
  timestamp: string;
}

export const slowQueriesLog: SlowQueryRecord[] = [];

/**
 * High-performance middleware to intercept and optimize app network routes
 */
export function performanceInterceptor(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  
  // 4.2 Network Keep-Alive header optimization
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", "timeout=10, max=1000");

  // 4.2 Client-side cache headers config for static assets and safe API routes
  if (req.method === "GET") {
    if (req.url.startsWith("/api/kb") || req.url.startsWith("/api/sla") || req.url.startsWith("/api/performance/stats")) {
      // Allow local client and proxy cache with stale-while-revalidate strategy
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
  }

  // Intercept the response sender to compute ETags of bodies and measure performance times
  const originalSend = res.send;
  res.send = function (body: any): Response {
    // 4.2 Compute ETags to prevent re-delivering unmodified payloads
    if (req.method === "GET" && res.statusCode === 200 && typeof body === "string") {
      const hash = crypto.createHash("sha1").update(body).digest("base64");
      const etag = `W/"${hash.substring(0, 20)}"`;
      res.setHeader("ETag", etag);

      // Check If-None-Match header
      if (req.headers["if-none-match"] === etag) {
        res.status(304);
        return originalSend.call(this, "");
      }
    }

    // Measure high-precision execution duration for database query profiling
    const diff = process.hrtime(start);
    const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);

    // 4.1 Log slow queries / API operations exceeding 80ms
    if (durationMs > 80 && !req.url.includes("/socket.io")) {
      const record: SlowQueryRecord = {
        id: crypto.randomUUID(),
        url: req.baseUrl + req.url,
        method: req.method,
        durationMs,
        timestamp: new Date().toISOString()
      };
      
      // Maintain maximum log array length
      slowQueriesLog.push(record);
      if (slowQueriesLog.length > 50) {
        slowQueriesLog.shift();
      }

      console.warn(`[SLOW_OPERATION_ALERT] ${req.method} ${req.url} took ${durationMs}ms`);
    }

    return originalSend.call(this, body);
  };

  next();
}
