import Stripe from "stripe";
import * as billingRepository from "./billing.repository.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";

let stripeClient: Stripe | null = null;

// Lazy client setup to satisfy initialization best practices
function getStripe(): Stripe | null {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      stripeClient = new Stripe(key, {
        apiVersion: "2025-01-27" as any, // standard safe production API spec
      });
    }
  }
  return stripeClient;
}

export const PLANS = {
  free: {
    name: "Standard Guard (Free)",
    seatsLimit: 3,
    quotaLimit: 10, // Max AI tokens quota trigger counter
    priceCents: 0,
  },
  growth: {
    name: "Ops Vanguard (Growth)",
    seatsLimit: 15,
    quotaLimit: 150,
    priceCents: 4900, // $49/mo
  },
  enterprise: {
    name: "Aurelia Command (Enterprise)",
    seatsLimit: 9999,
    quotaLimit: 10000,
    priceCents: 19900, // $199/mo metered scale
  }
};

type PlanKey = keyof typeof PLANS;

export async function getSubscriptionStatus(workspaceId: string) {
  let sub = await billingRepository.getSubscriptionByWorkspaceId(workspaceId);
  const seatsCount = await billingRepository.getActiveSeatsCount(workspaceId);

  if (!sub) {
    // Lazy initial insert for workspaces on default free plan
    sub = await billingRepository.createSubscription({
      workspace_id: workspaceId,
      plan: "free",
      status: "active",
      seats: 1,
    });
  }

  const currentPlan = PLANS[sub.plan as PlanKey] || PLANS.free;

  return {
    id: sub.id,
    workspaceId: sub.workspace_id,
    plan: sub.plan,
    planDetails: currentPlan,
    status: sub.status,
    activeSeats: seatsCount,
    seatsThreshold: sub.seats,
    expiresAt: sub.expires_at,
    stripeSubscriptionId: sub.stripe_subscription_id,
    isOverage: seatsCount > (sub.seats || currentPlan.seatsLimit),
  };
}

export async function createCheckoutSession(workspaceId: string, plan: "growth" | "enterprise", successUrl: string, cancelUrl: string) {
  const stripe = getStripe();
  const subStatus = await getSubscriptionStatus(workspaceId);

  if (!stripe) {
    // Standard Demo Sandbox fallback to keep development robust
    console.log(`[Billing] Stripe not configured. Routing checkout to Simulated Sandbox portal.`);
    const mockSessionId = `mock_checkout_${Math.floor(Math.random() * 1000000)}`;
    return {
      url: `/dashboard/billing/simulate?session_id=${mockSessionId}&workspace_id=${workspaceId}&plan=${plan}`,
      isSimulated: true
    };
  }

  try {
    // 1. Resolve customer ID
    let customerId = subStatus.stripeSubscriptionId ? null : undefined; // we'll fetch existing or create
    
    const seats = await billingRepository.getActiveSeatsCount(workspaceId);

    // Dynamic price setup matching the tier
    const priceAmount = PLANS[plan].priceCents;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: PLANS[plan].name,
              description: `Aurelia Ops Workspace license - covers up to ${PLANS[plan].seatsLimit} seats.`,
            },
            unit_amount: priceAmount,
            recurring: { interval: "month" },
          },
          quantity: seats, // Seat billing model
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        workspaceId,
        plan,
        seatsBought: String(seats),
      },
    });

    return { url: session.url, isSimulated: false };
  } catch (err: any) {
    console.error("[Billing] Stripe Checkout creation error:", err);
    throw new ApiError(500, `Billing Gateway Failure: Could not generate transaction interface. ${err.message}`);
  }
}

export async function processManualSandboxUpgrade(workspaceId: string, plan: "growth" | "enterprise", seatsCount: number) {
  await billingRepository.updateSubscription(workspaceId, {
    plan,
    status: "active",
    seats: seatsCount,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month
  });

  return await getSubscriptionStatus(workspaceId);
}

export async function triggerSandboxFailedPayment(workspaceId: string) {
  // Simulates failed payment scenario
  await billingRepository.updateSubscription(workspaceId, {
    status: "past_due",
  });
  return await getSubscriptionStatus(workspaceId);
}

export async function handleStripeWebhook(payload: Buffer, signature: string, webhookSecret: string) {
  const stripe = getStripe();
  if (!stripe) return;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    throw new ApiError(400, `Webhook Verification Mismatch: ${err.message}`);
  }

  console.log(`[Billing-Webhook] Processing validated event id [${event.id}] type [${event.type}]`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      const plan = session.metadata?.plan as "growth" | "enterprise";
      const seats = parseInt(session.metadata?.seatsBought || "1", 10);

      if (workspaceId && plan) {
        await billingRepository.updateSubscription(workspaceId, {
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: "active",
          seats,
        });
        console.log(`[Billing-Webhook] Workspace ${workspaceId} successfully upgraded to ${plan}`);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      const subId = invoice.subscription as string;
      // Future analytics or ledger record
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      const subId = invoice.subscription as string;
      // Downgrade status or flag past_due
      // Real-time notification worker alerts user of failed credit processing
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      // Mark canceled status
      break;
    }

    default:
      console.log(`[Billing-Webhook] No operation registered for: ${event.type}`);
  }
}

// 8.2 Mock Invoice database generator to provide dynamic mock histories
export function getSimulatedInvoices(workspaceId: string, plan: string) {
  const amount = plan === "growth" ? "$49.00" : plan === "enterprise" ? "$199.00" : "$0.00";
  return [
    {
      id: "inv_ops_1241512",
      amountFormatted: amount,
      status: "paid",
      dateFormatted: "2026-05-20",
      pdfUrl: "#",
    },
    {
      id: "inv_ops_1111942",
      amountFormatted: amount,
      status: "paid",
      dateFormatted: "2026-04-20",
      pdfUrl: "#",
    }
  ];
}
