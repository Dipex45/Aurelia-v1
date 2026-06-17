import { config } from "dotenv";
config({ override: true });
import express from "express";
import path from "path";
import { createServer as createHttpServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/server/routes.ts";
import { errorHandler } from "./src/server/shared/middleware/errorHandler.ts";
import { traceabilityMiddleware } from "./src/server/shared/middleware/traceabilityMiddleware.ts";
import { performanceInterceptor } from "./src/server/shared/middleware/performanceMiddleware.ts";
import { initSocket } from "./src/server/shared/socket.ts";
import { initEmailListeners } from "./src/server/modules/email/email.listeners.ts";
import { initDb } from "./src/server/shared/db.ts";
import { runMigrations, runSeeding } from "./src/server/shared/migrate.ts";
import "./src/server/modules/email/email.worker.ts";
import "./src/server/modules/system/system.worker.ts";

import { csrfGuard } from "./src/server/shared/middleware/csrfMiddleware.ts";
import { setupBullBoard } from "./src/server/shared/bullboard.ts";
import { collectMetrics } from "./src/server/shared/logger.ts";
import { orm } from "./src/server/shared/db.ts";
import { sql } from "drizzle-orm";

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const PORT = 3000;

  // Initialize Services
  initDb();
  if (process.env.NODE_ENV === "production" || process.env.AUTO_MIGRATE === "true") {
    try {
      await runMigrations();
      await runSeeding();
    } catch (err) {
      console.error("[DB-Migration] Startup migration failed:", err);
    }
  }
  
  initSocket(httpServer);
  initEmailListeners();

  // Multi-tier Security Headers (OWASP Top 10 Guidelines)
  app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY"); // Clickjacking mitigation
    res.setHeader("X-Content-Type-Options", "nosniff"); // MIME sniffing mitigation
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
    
    // Modern secure Content Security Policy (allows style embeddings for Tailwind, etc.)
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' wss: ws: https:;"
    );
    next();
  });

  app.set("trust proxy", 1);
  
  // Custom CORS Security Whitelist (combining dynamic origin filtering & local access)
  const trustedOrigins = [
    "http://localhost:3000",
    "https://ais-dev-zclgj35n3d7zaaztr4wu2j-322229176789.europe-west3.run.app",
    "https://ais-pre-zclgj35n3d7zaaztr4wu2j-322229176789.europe-west3.run.app"
  ];
  if (process.env.CORS_ORIGIN) {
    trustedOrigins.push(process.env.CORS_ORIGIN);
  }

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin, typical of server-to-server or non-browser utilities
      if (!origin) return callback(null, true);
      
      const isAllowed = trustedOrigins.some((allowed) => {
        if (allowed === "*") return true;
        return origin === allowed || origin.endsWith(allowed.replace(/^https?:\/\//, "."));
      });
      
      if (isAllowed || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Unauthorized request origin: ${origin}`);
        callback(new Error("Request blocked by CORS Policy: Unauthorized origin origin"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
    credentials: true,
    maxAge: 86400 // Cache preflight requests for 24 hours
  }));
  app.use(cookieParser());

  // 10.4 DevOps & Liveness Health Checks (Bypasses CSRF validation for system runtimes)
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", service: "aurelia-ops", timestamp: new Date().toISOString() });
  });

  app.get("/live", (req, res) => {
    res.status(200).json({ status: "live", service: "aurelia-ops", timestamp: new Date().toISOString() });
  });

  app.get("/ready", async (req, res) => {
    const checks: Record<string, any> = { database: "healthy", timestamp: new Date().toISOString() };
    let isHealthy = true;
    try {
      await orm.execute(sql`SELECT 1`);
    } catch (err: any) {
      checks.database = "unhealthy";
      checks.databaseError = err.message;
      isHealthy = false;
    }
    if (isHealthy) {
      res.status(200).json({ status: "ready", service: "aurelia-ops", checks });
    } else {
      res.status(503).json({ status: "not ready", service: "aurelia-ops", checks });
    }
  });

  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await collectMetrics();
      res.status(200).json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to collect system metrics: " + err.message });
    }
  });

  // 10.5 Bull Board Queue Monitoring Setup
  setupBullBoard(app);
  
  // State-modifying CSRF Guard (4.6)
  app.use(csrfGuard);

  // Traceability first
  app.use(traceabilityMiddleware);

  // High performance optimizations & cdn buffers
  app.use(performanceInterceptor);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support SPA routing in production
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware (must be after all routes)
  app.use(errorHandler);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
