import { orm } from "../../shared/db.ts";
import { slaPolicies, slaEvents, slaBreaches, tickets, messages, users } from "../../shared/schema.ts";
import { eq, and, desc, sql, lt, isNull } from "drizzle-orm";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import { v4 as uuidv4 } from "uuid";

export {
  getOrCreateDefaultPolicy,
  listSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy
} from "./policies/index.ts";

export {
  createSlaTrackerEvents,
  updateSlaTrackerPriorities
} from "./calculator/index.ts";

/**
 * Hook logic: Called when a message is added. Assures if is first agent response.
 */
export async function handleAgentResponse(workspaceId: string, ticketId: string, authorId: string) {
  // Check if author is workspace agent/admin (i.e. not the customer or creator)
  // To keep it simple: any message by an agent that is not the ticket creator counts as a response.
  const ticket = await orm.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket || ticket.creator_id === authorId) return; // Creator posting is not an agent response

  const responseEvent = await orm.query.slaEvents.findFirst({
    where: and(
      eq(slaEvents.ticket_id, ticketId),
      eq(slaEvents.event_type, "first_response"),
      eq(slaEvents.status, "pending")
    ),
  });

  if (!responseEvent) return; // Already resolved or met

  const now = new Date();
  const met = now.getTime() <= responseEvent.deadline_at.getTime();
  const status = met ? "met" : "breached";

  await orm.update(slaEvents)
    .set({
      completed_at: now,
      status,
    })
    .where(eq(slaEvents.id, responseEvent.id));

  // If breached, log historically in breaches
  if (!met) {
    await orm.insert(slaBreaches).values({
      id: uuidv4(),
      workspace_id: workspaceId,
      ticket_id: ticketId,
      sla_event_id: responseEvent.id,
      breach_type: "first_response_breach",
      assigned_to_id: ticket.assignee_id,
      breached_at: responseEvent.deadline_at,
      resolved_at: now,
    });
  }
}

/**
 * Hook logic: Called when a ticket status becomes 'resolved' or 'closed'
 */
export async function handleTicketResolution(workspaceId: string, ticketId: string) {
  const resolveEvent = await orm.query.slaEvents.findFirst({
    where: and(
      eq(slaEvents.ticket_id, ticketId),
      eq(slaEvents.event_type, "resolution"),
      eq(slaEvents.status, "pending")
    ),
  });

  if (!resolveEvent) return;

  const now = new Date();
  const met = now.getTime() <= resolveEvent.deadline_at.getTime();
  const status = met ? "met" : "breached";

  await orm.update(slaEvents)
    .set({
      completed_at: now,
      status,
    })
    .where(eq(slaEvents.id, resolveEvent.id));

  const ticket = await orm.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });

  if (!met) {
    await orm.insert(slaBreaches).values({
      id: uuidv4(),
      workspace_id: workspaceId,
      ticket_id: ticketId,
      sla_event_id: resolveEvent.id,
      breach_type: "resolution_breach",
      assigned_to_id: ticket?.assignee_id || null,
      breached_at: resolveEvent.deadline_at,
      resolved_at: now,
    });
  }
}

/**
 * System level: Periodic background scanner that updates expired pending SLA events to 'breached'.
 */
export async function evaluateOutstandingBreaches(workspaceId: string) {
  const now = new Date();

  // Find SLA events that are pending but past deadline
  const expiredEvents = await orm.select()
    .from(slaEvents)
    .where(and(
      eq(slaEvents.workspace_id, workspaceId),
      eq(slaEvents.status, "pending"),
      lt(slaEvents.deadline_at, now)
    ));

  for (const ev of expiredEvents) {
    await orm.update(slaEvents)
      .set({ status: "breached" })
      .where(eq(slaEvents.id, ev.id));

    const ticket = await orm.query.tickets.findFirst({ where: eq(tickets.id, ev.ticket_id) });

    await orm.insert(slaBreaches).values({
      id: uuidv4(),
      workspace_id: workspaceId,
      ticket_id: ev.ticket_id,
      sla_event_id: ev.id,
      breach_type: ev.event_type === "first_response" ? "first_response_breach" : "resolution_breach",
      assigned_to_id: ticket?.assignee_id || null,
      breached_at: ev.deadline_at,
    });
  }
}

/**
 * High-performance SLA Dashboard Analytics
 */
export async function getSlaReportCard(workspaceId: string) {
  // Let's run a quick sweep of stale breaches first
  await evaluateOutstandingBreaches(workspaceId);

  const events = await orm.select()
    .from(slaEvents)
    .where(eq(slaEvents.workspace_id, workspaceId));

  const pending = events.filter(e => e.status === "pending");
  const met = events.filter(e => e.status === "met");
  const breached = events.filter(e => e.status === "breached");

  const totalClosed = met.length + breached.length;
  const complianceRate = totalClosed > 0 ? Math.round((met.length / totalClosed) * 100) : 100;

  // Compile active breaches details
  const activeBreachesLog = await orm.select()
    .from(slaBreaches)
    .where(and(eq(slaBreaches.workspace_id, workspaceId), isNull(slaBreaches.resolved_at)));

  const richBreaches = [];
  for (const b of activeBreachesLog) {
    const t = await orm.query.tickets.findFirst({
      where: eq(tickets.id, b.ticket_id),
      columns: { title: true, priority: true }
    });
    const u = b.assigned_to_id ? await orm.query.users.findFirst({
      where: eq(users.id, b.assigned_to_id),
      columns: { full_name: true }
    }) : null;

    richBreaches.push({
      ...b,
      ticket_title: t?.title || "Unknown Ticket",
      ticket_priority: t?.priority || "low",
      agent_name: u?.full_name || "Unassigned"
    });
  }

  // Get next 5 upcoming SLA priority deadlines
  const upcomingEvents = pending
    .sort((a,b) => a.deadline_at.getTime() - b.deadline_at.getTime())
    .slice(0, 5);

  const richUpcoming = [];
  for (const ev of upcomingEvents) {
    const t = await orm.query.tickets.findFirst({
      where: eq(tickets.id, ev.ticket_id),
      columns: { title: true, priority: true }
    });
    richUpcoming.push({
      ...ev,
      ticket_title: t?.title || "Unknown Ticket",
      ticket_priority: t?.priority || "low"
    });
  }

  return {
    total_events: events.length,
    pending_count: pending.length,
    met_count: met.length,
    breached_count: breached.length + activeBreachesLog.length,
    compliance_rate: complianceRate,
    active_breaches: richBreaches,
    upcoming_deadlines: richUpcoming,
  };
}
