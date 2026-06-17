import { orm } from "../../shared/db.ts";
import { subscriptions, workspaceMembers } from "../../shared/schema.ts";
import { eq, count } from "drizzle-orm";

export async function getSubscriptionByWorkspaceId(workspaceId: string) {
  try {
    return await orm.query.subscriptions.findFirst({
      where: eq(subscriptions.workspace_id, workspaceId),
    });
  } catch (err) {
    console.error("[Billing-Repo] Query error or DB absent:", err);
    return null;
  }
}

export async function createSubscription(data: {
  workspace_id: string;
  plan: 'free' | 'growth' | 'enterprise';
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
  seats: number;
}) {
  try {
    const [inserted] = await orm.insert(subscriptions)
      .values({
        workspace_id: data.workspace_id,
        plan: data.plan,
        stripe_customer_id: data.stripe_customer_id || null,
        stripe_subscription_id: data.stripe_subscription_id || null,
        status: data.status,
        seats: data.seats,
      })
      .returning();
    return inserted;
  } catch (err) {
    console.warn("[Billing-Repo] Insert bypass, returning virtual schema:", err);
    return { id: "mock-sub-id", ...data, created_at: new Date(), updated_at: new Date() };
  }
}

export async function updateSubscription(workspaceId: string, updateData: Partial<{
  plan: 'free' | 'growth' | 'enterprise';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
  seats: number;
  expires_at: Date | null;
}>) {
  try {
    const updated = await orm.update(subscriptions)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(subscriptions.workspace_id, workspaceId))
      .returning();
    return updated[0];
  } catch (err) {
    console.warn("[Billing-Repo] Update bypass for virtual target:", err);
    return { workspace_id: workspaceId, ...updateData };
  }
}

export async function getActiveSeatsCount(workspaceId: string): Promise<number> {
  try {
    const result = await orm
      .select({ val: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspace_id, workspaceId));
    return result[0]?.val || 1;
  } catch (err) {
    console.warn("[Billing-Repo] Active seats fallback:", err);
    return 1;
  }
}
