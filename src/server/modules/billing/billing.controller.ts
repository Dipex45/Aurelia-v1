import { Router, Request, Response, NextFunction } from "express";
import * as billingService from "./billing.service.ts";
import { authenticate, requireWorkspaceMember } from "../../shared/middleware/authMiddleware.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { hasPermission, Permission, Role } from "../../../lib/permissions.ts";

const router = Router();

// Retrieve billing status
router.get("/workspaces/:workspaceId/billing", authenticate, requireWorkspaceMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.params;
    const status = await billingService.getSubscriptionStatus(workspaceId);
    const invoices = billingService.getSimulatedInvoices(workspaceId, status.plan);
    
    res.json({
      ...status,
      invoices
    });
  } catch (err) {
    next(err);
  }
});

// Create Stripe checkout or route to simulation playground
router.post("/workspaces/:workspaceId/billing/checkout", authenticate, requireWorkspaceMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.params;
    const { plan } = req.body;

    // Organization Permission Matrix Security Guard
    const role = req.auth?.role as Role;
    const canManageBilling = role && hasPermission(role, Permission.BILLING_MANAGE);
    
    if (!canManageBilling) {
      throw new ApiError(403, "Access Violation: Infinite boundary protection. Billing actions require Owner or Billing Admin credentials.");
    }

    if (plan !== "growth" && plan !== "enterprise") {
      throw new ApiError(400, "Validation Error: Selected tier is non-compliant with standard Aurelia pricing schema.");
    }

    const successUrl = `${req.headers.origin || "http://localhost:3000"}/dashboard/workspaces/${workspaceId}/billing?success=true`;
    const cancelUrl = `${req.headers.origin || "http://localhost:3000"}/dashboard/workspaces/${workspaceId}/billing?cancel=true`;

    const session = await billingService.createCheckoutSession(workspaceId, plan, successUrl, cancelUrl);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// Simulated Upgraders for direct UI-driven sandbox playground
router.post("/workspaces/:workspaceId/billing/simulate", authenticate, requireWorkspaceMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.params;
    const { plan, seats } = req.body;

    const role = req.auth?.role as Role;
    if (role !== "owner" && !hasPermission(role, Permission.BILLING_MANAGE)) {
      throw new ApiError(403, "Access Violation: Insufficient workspace capabilities.");
    }

    const updated = await billingService.processManualSandboxUpgrade(workspaceId, plan, parseInt(seats || "1", 10));
    res.json({ success: true, status: updated });
  } catch (err) {
    next(err);
  }
});

// Simulated failed payment trigger endpoint
router.post("/workspaces/:workspaceId/billing/fail-payment-simulation", authenticate, requireWorkspaceMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.params;
    
    const role = req.auth?.role as Role;
    if (role !== "owner" && !hasPermission(role, Permission.BILLING_MANAGE)) {
      throw new ApiError(403, "Permission Denied");
    }

    const statusObj = await billingService.triggerSandboxFailedPayment(workspaceId);
    res.json({
      success: true,
      message: "Simulation enacted: payment processing error. Access restricted to past_due parameters.",
      status: statusObj
    });
  } catch (err) {
    next(err);
  }
});

// Core webhook listener for Stripe production integration
router.post("/billing/webhook", async (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return res.status(400).send("Webhook configurations parameters missing.");
  }

  try {
    // Raw body parsing required for Stripe verification signature, standard Express body is buffer matched
    const rawBody = (req as any).rawBody || req.body;
    await billingService.handleStripeWebhook(rawBody, signature, webhookSecret);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export { router as billingRouter };
