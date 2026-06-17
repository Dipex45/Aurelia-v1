import { createWorker, createQueue, connection } from "../../shared/queue.ts";
import { orm, isDbInitialized } from "../../shared/db.ts";
import { sessions, tickets, messages, auditEvents, users, workspaces } from "../../shared/schema.ts";
import { lt, sql, eq, and, ne, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { emailQueue } from "../email/email.worker.ts";

export const systemQueue = createQueue("system");

// Sub-routine: Clear expired sessions from session records
export async function runSessionMaintenance() {
  if (!isDbInitialized()) {
    console.log("[System Maintenance] Database not initialized. Skipping session key/token auditing.");
    return;
  }
  console.log("[System Maintenance] Auditing and clearing expired sessions...");
  try {
    const deletedCount = await orm.delete(sessions).where(lt(sessions.expires_at, sql`CURRENT_TIMESTAMP`));
    console.log(`[System Maintenance] Session cleanup action finished.`);
  } catch (err: any) {
    console.error("[System Maintenance] Session cleanup error:", err.message);
  }
}

// Sub-routine: Dynamic SLA & Ticket Priority Escalation
export async function runTicketEscalationMaintenance() {
  if (!isDbInitialized()) {
    console.log("[System Maintenance] Database not initialized. Skipping automated SLA ticket prioritization check.");
    return;
  }
  console.log("[System Maintenance] Evaluation check of ticket SLA thresholds...");
  try {
    // Select all tickets still open or in progress that are not already critical
    const unresolvedTickets = await orm
      .select()
      .from(tickets)
      .where(
        and(
          or(eq(tickets.status, "open"), eq(tickets.status, "in_progress")),
          ne(tickets.priority, "critical")
        )
      );

    const escalationAgeLimitMs = 10 * 60 * 1000; // 10 minutes SLA threshold check (can be met dynamically)
    const now = Date.now();

    for (const ticket of unresolvedTickets) {
      const createdTime = new Date(ticket.created_at).getTime();
      const idleTimeMs = now - createdTime;

      // In the dev or test env, let's also escalate low tickets older than 1 minute to make it highly reactive and verifiable!
      const limit = process.env.NODE_ENV === "development" ? 60 * 1000 : escalationAgeLimitMs;

      // Classify "Approaching SLA deadline" as 80% of limit elapsed but not yet escalated
      const warningLimit = limit * 0.8;
      if (idleTimeMs >= warningLimit && idleTimeMs < limit) {
        // Double-check if we have already dispatched a warning for this object
        const alreadyWarned = await orm
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.workspace_id, ticket.workspace_id),
              eq(auditEvents.action, "TICKET_SLA_APPROACHING_DEADLINE"),
              sql`${auditEvents.metadata} LIKE ${`%"ticketId":"${ticket.id}"%`}`
            )
          )
          .limit(1);

        if (alreadyWarned.length === 0) {
          console.log(`[System Worker] SLA warning threshold breached on ticket "${ticket.title}" (${ticket.id})`);

          // Register audit log event
          await orm.insert(auditEvents).values({
            id: uuidv4(),
            workspace_id: ticket.workspace_id,
            actor_id: ticket.creator_id,
            action: "TICKET_SLA_APPROACHING_DEADLINE",
            metadata: JSON.stringify({
              ticketId: ticket.id,
              timeElapsedMs: idleTimeMs
            }),
            created_at: new Date()
          });

          // Fetch receiver and workspace details
          let recipientEmail = "support@aureliaops.com";
          let assigneeName = "Unassigned / Support Team";

          if (ticket.assignee_id) {
            const assigneeUser = await orm
              .select()
              .from(users)
              .where(eq(users.id, ticket.assignee_id))
              .limit(1);
            if (assigneeUser[0]) {
              recipientEmail = assigneeUser[0].email;
              assigneeName = assigneeUser[0].full_name;
            }
          } else {
            const creatorUser = await orm
              .select()
              .from(users)
              .where(eq(users.id, ticket.creator_id))
              .limit(1);
            if (creatorUser[0]) {
              recipientEmail = creatorUser[0].email;
              assigneeName = `${creatorUser[0].full_name} (Creator)`;
            }
          }

          const ws = await orm.select().from(workspaces).where(eq(workspaces.id, ticket.workspace_id)).limit(1);
          const workspaceName = ws[0]?.name || "Aurelia Ops";

          if (emailQueue) {
            await emailQueue.add("TICKET_SLA_WARNING", {
              type: "TICKET_SLA_WARNING",
              payload: {
                to: recipientEmail,
                ticketId: ticket.id,
                ticketTitle: ticket.title,
                workspaceName,
                assigneeName
              }
            });
            console.log(`[System Worker] SLA warning email enqueued for ${recipientEmail}.`);
          }
        }
      }

      if (idleTimeMs >= limit) {
        // Compute escalated priority
        let nextPriority: "low" | "medium" | "high" | "critical" = "low";
        switch (ticket.priority) {
          case "low":
            nextPriority = "medium";
            break;
          case "medium":
            nextPriority = "high";
            break;
          case "high":
            nextPriority = "critical";
            break;
          default:
            continue; // Already critical or unrecognized
        }

        console.log(`[System Worker] Escalating ticket "${ticket.title}" (ID: ${ticket.id}) from ${ticket.priority} to ${nextPriority}`);

        // 1. Update ticket priority
        await orm
          .update(tickets)
          .set({ priority: nextPriority, updated_at: new Date() })
          .where(eq(tickets.id, ticket.id));

        // 2. Insert automated system message in the ticket's message stream
        const authorId = ticket.creator_id; 
        
        await orm.insert(messages).values({
          id: uuidv4(),
          ticket_id: ticket.id,
          workspace_id: ticket.workspace_id,
          author_id: authorId,
          content: `⚠️ **SYSTEM AUTOPILOT ESCALATION**: Response threshold exceeded. Incident priority has been programmatically elevated from **${ticket.priority.toUpperCase()}** to **${nextPriority.toUpperCase()}** to trigger rapid resolution dispatch.`,
          is_internal: true,
          created_at: new Date()
        });

        // 3. Register an operational audit event log
        await orm.insert(auditEvents).values({
          id: uuidv4(),
          workspace_id: ticket.workspace_id,
          actor_id: authorId,
          action: "TICKET_SLA_ESCALATED",
          metadata: JSON.stringify({
            ticketId: ticket.id,
            oldPriority: ticket.priority,
            newPriority: nextPriority,
            reason: "SLA response delay check"
          }),
          created_at: new Date()
        });

        // 4. Send escalation email alert to assignee or fallback creator
        let recipientEmail = "support@aureliaops.com";
        let assigneeName = "Unassigned / Support Team";

        if (ticket.assignee_id) {
          const assigneeUser = await orm
            .select()
            .from(users)
            .where(eq(users.id, ticket.assignee_id))
            .limit(1);
          if (assigneeUser[0]) {
            recipientEmail = assigneeUser[0].email;
            assigneeName = assigneeUser[0].full_name;
          }
        } else {
          const creatorUser = await orm
            .select()
            .from(users)
            .where(eq(users.id, ticket.creator_id))
            .limit(1);
          if (creatorUser[0]) {
            recipientEmail = creatorUser[0].email;
            assigneeName = `${creatorUser[0].full_name} (Creator)`;
          }
        }

        const ws = await orm.select().from(workspaces).where(eq(workspaces.id, ticket.workspace_id)).limit(1);
        const workspaceName = ws[0]?.name || "Aurelia Ops";

        if (emailQueue) {
          await emailQueue.add("TICKET_ESCALATED", {
            type: "TICKET_ESCALATED",
            payload: {
              to: recipientEmail,
              ticketId: ticket.id,
              ticketTitle: ticket.title,
              workspaceName,
              assigneeName,
              priority: nextPriority
            }
          });
          console.log(`[System Worker] Critical escalation email enqueued for ${recipientEmail}.`);
        }
      }
    }
  } catch (err: any) {
    console.error("[System Maintenance] Ticket SLA escalation audit failed:", err.message);
  }
}

// Sub-routine: Clear orphan attachments
export async function runOrphanAttachmentsCleanup() {
  console.log("[System Maintenance] Purging unreferenced workspace objects...");
  // Attachment cleaning routines could go here
}

export const systemWorker = createWorker("system", async (job) => {
  const { action } = job.data;
  console.log(`[Worker: System] Received action: ${action}`);
  
  if (action === "CLEANUP_SESSIONS") {
    await runSessionMaintenance();
  } else if (action === "ESCALATE_TICKETS" || action === "SLA_BREACH_CHECK") {
    await runTicketEscalationMaintenance();
  } else if (action === "PURGE_WORKSPACE_ORPHANS") {
    await runOrphanAttachmentsCleanup();
  }
});

// Scheduling fallback daemon loop when Node is started without an active Redis broker
if (!connection) {
  console.log("[System Worker: Local Daemon Mode] Booting in-process active scheduler since Redis is unlinked...");
  
  // Fire once at server boot, then on interval
  setTimeout(async () => {
    await runSessionMaintenance();
    await runTicketEscalationMaintenance();
  }, 5000);

  setInterval(async () => {
    try {
      await runSessionMaintenance();
      await runTicketEscalationMaintenance();
    } catch (err: any) {
      console.error("[System Worker Loop Error]:", err.message);
    }
  }, 45000); // Check every 45 seconds
}
