import { orm } from "../../shared/db.ts";
import { automations, tickets, customers } from "../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { v4 as uuidv4 } from "uuid";
import * as ticketsRepository from "../tickets/tickets.repository.ts";
import * as auditService from "../audit/audit.service.ts";

export interface AutomationRule {
  field: "title" | "description" | "priority" | "status" | "sentiment" | "category" | "company";
  operator: "eq" | "contains" | "not_eq";
  value: string;
}

export interface AutomationAction {
  type: "set_priority" | "set_status" | "assign_user" | "add_tag";
  value: string;
}

export async function createAutomation(workspaceId: string, name: string, triggerType: "ticket_created" | "ticket_updated", conditions: AutomationRule[], actions: AutomationAction[]) {
  const id = uuidv4();
  const now = new Date();

  await orm.insert(automations).values({
    id,
    workspace_id: workspaceId,
    name,
    is_active: true,
    trigger_type: triggerType,
    conditions: JSON.stringify(conditions),
    actions: JSON.stringify(actions),
    created_at: now,
    updated_at: now,
  });

  return getAutomation(workspaceId, id);
}

export async function listAutomations(workspaceId: string) {
  return await orm.select().from(automations).where(eq(automations.workspace_id, workspaceId));
}

export async function getAutomation(workspaceId: string, id: string) {
  const rule = await orm.query.automations.findFirst({
    where: and(eq(automations.id, id), eq(automations.workspace_id, workspaceId)),
  });
  if (!rule) {
    throw new ApiError(404, "Workflow automation not found");
  }
  return rule;
}

export async function updateAutomation(workspaceId: string, id: string, updates: { name?: string; is_active?: boolean; conditions?: AutomationRule[]; actions?: AutomationAction[] }) {
  const rule = await getAutomation(workspaceId, id);

  const setUpdates: any = { updated_at: new Date() };
  if (updates.name !== undefined) setUpdates.name = updates.name;
  if (updates.is_active !== undefined) setUpdates.is_active = updates.is_active;
  if (updates.conditions !== undefined) setUpdates.conditions = JSON.stringify(updates.conditions);
  if (updates.actions !== undefined) setUpdates.actions = JSON.stringify(updates.actions);

  await orm.update(automations).set(setUpdates).where(eq(automations.id, id));
  return getAutomation(workspaceId, id);
}

export async function deleteAutomation(workspaceId: string, id: string) {
  await getAutomation(workspaceId, id);
  await orm.delete(automations).where(eq(automations.id, id));
  return { success: true };
}

export { executeAutomations } from "./engine/index.ts";
