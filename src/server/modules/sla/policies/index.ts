import { orm } from "../../../shared/db.ts";
import { slaPolicies } from "../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function getOrCreateDefaultPolicy(workspaceId: string) {
  const existing = await orm.query.slaPolicies.findFirst({
    where: eq(slaPolicies.workspace_id, workspaceId),
  });

  if (existing) return existing;

  const id = uuidv4();
  await orm.insert(slaPolicies).values({
    id,
    workspace_id: workspaceId,
    name: "Standard Enterprise SLA Policy",
    description: "Multi-tiered response and resolution deadlines for standard client service operations.",
    priority_low_response_mins: 1440, // 24 hours
    priority_low_resolve_mins: 2880,  // 48 hours
    priority_medium_response_mins: 480, // 8 hours
    priority_medium_resolve_mins: 1440, // 24 hours
    priority_high_response_mins: 120,    // 2 hours
    priority_high_resolve_mins: 480,    // 8 hours
    priority_critical_response_mins: 30, // 30 mins
    priority_critical_resolve_mins: 120, // 2 hours
    is_active: true,
  });

  const created = await orm.query.slaPolicies.findFirst({
    where: eq(slaPolicies.id, id),
  });
  return created!;
}

export async function listSlaPolicies(workspaceId: string) {
  await getOrCreateDefaultPolicy(workspaceId);
  return await orm.select().from(slaPolicies).where(eq(slaPolicies.workspace_id, workspaceId));
}

export async function createSlaPolicy(workspaceId: string, data: any) {
  const id = uuidv4();
  await orm.insert(slaPolicies).values({
    id,
    workspace_id: workspaceId,
    name: data.name,
    description: data.description,
    priority_low_response_mins: data.priority_low_response_mins ?? 1440,
    priority_low_resolve_mins: data.priority_low_resolve_mins ?? 2880,
    priority_medium_response_mins: data.priority_medium_response_mins ?? 480,
    priority_medium_resolve_mins: data.priority_medium_resolve_mins ?? 1440,
    priority_high_response_mins: data.priority_high_response_mins ?? 120,
    priority_high_resolve_mins: data.priority_high_resolve_mins ?? 480,
    priority_critical_response_mins: data.priority_critical_response_mins ?? 30,
    priority_critical_resolve_mins: data.priority_critical_resolve_mins ?? 120,
    is_active: data.is_active ?? true,
  });

  return await orm.query.slaPolicies.findFirst({ where: eq(slaPolicies.id, id) });
}

export async function updateSlaPolicy(workspaceId: string, policyId: string, data: any) {
  const setUpdates: any = { updated_at: new Date() };
  if (data.name !== undefined) setUpdates.name = data.name;
  if (data.description !== undefined) setUpdates.description = data.description;
  if (data.priority_low_response_mins !== undefined) setUpdates.priority_low_response_mins = data.priority_low_response_mins;
  if (data.priority_low_resolve_mins !== undefined) setUpdates.priority_low_resolve_mins = data.priority_low_resolve_mins;
  if (data.priority_medium_response_mins !== undefined) setUpdates.priority_medium_response_mins = data.priority_medium_response_mins;
  if (data.priority_medium_resolve_mins !== undefined) setUpdates.priority_medium_resolve_mins = data.priority_medium_resolve_mins;
  if (data.priority_high_response_mins !== undefined) setUpdates.priority_high_response_mins = data.priority_high_response_mins;
  if (data.priority_high_resolve_mins !== undefined) setUpdates.priority_high_resolve_mins = data.priority_high_resolve_mins;
  if (data.priority_critical_response_mins !== undefined) setUpdates.priority_critical_response_mins = data.priority_critical_response_mins;
  if (data.priority_critical_resolve_mins !== undefined) setUpdates.priority_critical_resolve_mins = data.priority_critical_resolve_mins;
  if (data.is_active !== undefined) setUpdates.is_active = data.is_active;

  await orm.update(slaPolicies).set(setUpdates).where(and(eq(slaPolicies.id, policyId), eq(slaPolicies.workspace_id, workspaceId)));
  return await orm.query.slaPolicies.findFirst({ where: eq(slaPolicies.id, policyId) });
}

export async function deleteSlaPolicy(workspaceId: string, policyId: string) {
  await orm.delete(slaPolicies).where(and(eq(slaPolicies.id, policyId), eq(slaPolicies.workspace_id, workspaceId)));
  return { success: true };
}
