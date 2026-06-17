import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.ts";
import { workspacesRouter } from "./modules/workspaces/workspaces.routes.ts";
import { ticketsRouter } from "./modules/tickets/tickets.routes.ts";
import { customersRouter } from "./modules/customers/customers.routes.ts";
import { slaRouter } from "./modules/sla/sla.routes.ts";
import { kbRouter } from "./modules/kb/kb.routes.ts";
import { automationsRouter } from "./modules/automations/automations.routes.ts";
import { auditRouter } from "./modules/audit/audit.routes.ts";
import { usersRouter } from "./modules/users/users.routes.ts";
import { messagesRouter } from "./modules/messages/messages.routes.ts";
import attachmentsRouter from "./modules/attachments/attachments.controller.ts";
import { billingRouter } from "./modules/billing/billing.controller.ts";
import { aiRouter } from "./modules/ai/ai.controller.ts";
import { securityRouter } from "./modules/security/security.routes.ts";
import { performanceRouter } from "./modules/performance/performance.routes.ts";
import emailWebhook from "./modules/email/email.webhook.ts";
import { v4 as uuidv4 } from "uuid";

export const apiRouter = Router();

// Request ID middleware
apiRouter.use((req, res, next) => {
  const requestId = uuidv4();
  (req as any).requestId = requestId; // Attach to req for controllers
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// Add structured logging per request
apiRouter.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/webhooks", emailWebhook);
apiRouter.use("/", attachmentsRouter); // Mount at root since it has specific paths
apiRouter.use("/", billingRouter);     // Mount billing routes
apiRouter.use("/", aiRouter);          // Mount AI routes
apiRouter.use("/security", securityRouter); // Mount security routes
apiRouter.use("/performance", performanceRouter); // Mount performance routes
apiRouter.use("/workspaces", workspacesRouter);
apiRouter.use("/workspaces/:workspaceId/tickets/:ticketId/messages", messagesRouter);
apiRouter.use("/workspaces/:workspaceId/tickets", ticketsRouter);
apiRouter.use("/workspaces/:workspaceId/customers", customersRouter);
apiRouter.use("/workspaces/:workspaceId/sla", slaRouter);
apiRouter.use("/workspaces/:workspaceId/kb", kbRouter);
apiRouter.use("/workspaces/:workspaceId/automations", automationsRouter);
apiRouter.use("/workspaces/:workspaceId/audit", auditRouter);
apiRouter.use("/users", usersRouter);
