import { orm } from "../../../shared/db.ts";
import { slaEvents } from "../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getOrCreateDefaultPolicy } from "../policies/index.ts";

export async function createSlaTrackerEvents(workspaceId: string, ticketId: string, priority: "low" | "medium" | "high" | "critical") {
  const policy = await getOrCreateDefaultPolicy(workspaceId);
  if (!policy || !policy.is_active) return;

  const now = new Date();

  let responseMins = policy.priority_low_response_mins;
  let resolveMins = policy.priority_low_resolve_mins;

  if (priority === "medium") {
    responseMins = policy.priority_medium_response_mins;
    resolveMins = policy.priority_medium_resolve_mins;
  } else if (priority === "high") {
    responseMins = policy.priority_high_response_mins;
    resolveMins = policy.priority_high_resolve_mins;
  } else if (priority === "critical") {
    responseMins = policy.priority_critical_response_mins;
    resolveMins = policy.priority_critical_resolve_mins;
  }

  const responseDeadline = new Date(now.getTime() + responseMins * 60 * 1000);
  const resolveDeadline = new Date(now.getTime() + resolveMins * 60 * 1000);

  await orm.insert(slaEvents).values({
    id: uuidv4(),
    workspace_id: workspaceId,
    ticket_id: ticketId,
    policy_id: policy.id,
    event_type: "first_response",
    deadline_at: responseDeadline,
    status: "pending",
  });

  await orm.insert(slaEvents).values({
    id: uuidv4(),
    workspace_id: workspaceId,
    ticket_id: ticketId,
    policy_id: policy.id,
    event_type: "resolution",
    deadline_at: resolveDeadline,
    status: "pending",
  });
}

export async function updateSlaTrackerPriorities(workspaceId: string, ticketId: string, newPriority: "low" | "medium" | "high" | "critical") {
  const policy = await getOrCreateDefaultPolicy(workspaceId);
  if (!policy || !policy.is_active) return;

  const pendingEvents = await orm.select()
    .from(slaEvents)
    .where(and(eq(slaEvents.ticket_id, ticketId), eq(slaEvents.status, "pending")));

  if (pendingEvents.length === 0) return;

  let responseMins = policy.priority_low_response_mins;
  let resolveMins = policy.priority_low_resolve_mins;

  if (newPriority === "medium") {
    responseMins = policy.priority_medium_response_mins;
    resolveMins = policy.priority_medium_resolve_mins;
  } else if (newPriority === "high") {
    responseMins = policy.priority_high_response_mins;
    resolveMins = policy.priority_high_resolve_mins;
  } else if (newPriority === "critical") {
    responseMins = policy.priority_critical_response_mins;
    resolveMins = policy.priority_critical_resolve_mins;
  }

  for (const ev of pendingEvents) {
    const baseTime = ev.created_at.getTime();
    const addedMins = ev.event_type === "first_response" ? responseMins : resolveMins;
    const updatedDeadline = new Date(baseTime + addedMins * 60 * 1000);

    await orm.update(slaEvents)
      .set({ deadline_at: updatedDeadline })
      .where(eq(slaEvents.id, ev.id));
  }
}
