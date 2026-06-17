import { orm } from "../../../shared/db.ts";
import { automations, tickets, customers } from "../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import * as ticketsRepository from "../../tickets/tickets.repository.ts";
import * as auditService from "../../audit/audit.service.ts";
import { AutomationRule, AutomationAction } from "../automations.service.ts";

/**
 * Workflow Engine: Evaluates and handles IF-THEN triggers
 */
export async function executeAutomations(workspaceId: string, triggerType: "ticket_created" | "ticket_updated", ticketId: string) {
  const activeRules = await orm.select()
    .from(automations)
    .where(and(eq(automations.workspace_id, workspaceId), eq(automations.is_active, true), eq(automations.trigger_type, triggerType)));

  if (activeRules.length === 0) return;

  const ticket = await ticketsRepository.findTicketById(workspaceId, ticketId) as any;
  if (!ticket) return;

  // Hydrate customer context if applicable
  let customerInfo: any = null;
  if (ticket.customer_id) {
    customerInfo = await orm.query.customers.findFirst({
      where: eq(customers.id, ticket.customer_id),
    });
  }

  const updates: any = {};
  const tagsList: string[] = ticket.ai_tags ? ticket.ai_tags.split(",").map((t: string) => t.trim()) : [];
  let updatedTags = false;

  for (const rule of activeRules) {
    let conditions: AutomationRule[] = [];
    let actions: AutomationAction[] = [];

    try {
      conditions = typeof rule.conditions === "string" ? JSON.parse(rule.conditions) : rule.conditions;
      actions = typeof rule.actions === "string" ? JSON.parse(rule.actions) : rule.actions;
    } catch {
      continue;
    }

    if (!Array.isArray(conditions) || !Array.isArray(actions)) continue;

    // Evaluate all conditions (AND evaluation)
    let isMatch = true;
    for (const cond of conditions) {
      if (!isMatch) break;

      let fieldValue = "";
      if (cond.field === "title") fieldValue = ticket.title || "";
      else if (cond.field === "description") fieldValue = ticket.description || "";
      else if (cond.field === "priority") fieldValue = ticket.priority || "";
      else if (cond.field === "status") fieldValue = ticket.status || "";
      else if (cond.field === "sentiment") fieldValue = ticket.ai_sentiment || "";
      else if (cond.field === "category") fieldValue = ticket.ai_category || "";
      else if (cond.field === "company") fieldValue = customerInfo?.customer_company || "";

      fieldValue = fieldValue.toLowerCase();
      const matchValue = cond.value.toLowerCase();

      if (cond.operator === "eq") {
        isMatch = (fieldValue === matchValue);
      } else if (cond.operator === "contains") {
        isMatch = fieldValue.includes(matchValue);
      } else if (cond.operator === "not_eq") {
        isMatch = (fieldValue !== matchValue);
      } else {
        isMatch = false;
      }
    }

    // If conditions matched, perform actions!
    if (isMatch && conditions.length > 0) {
      console.log(`[Workflow-Engine] Executed Rule "${rule.name}" successfully on Ticket ${ticketId}`);

      for (const action of actions) {
        if (action.type === "set_priority") {
          updates.priority = action.value;
        } else if (action.type === "set_status") {
          updates.status = action.value;
        } else if (action.type === "assign_user") {
          updates.assignee_id = action.value;
        } else if (action.type === "add_tag") {
          if (!tagsList.includes(action.value)) {
            tagsList.push(action.value);
            updatedTags = true;
          }
        }
      }

      await auditService.logEvent({
        workspaceId,
        actorId: "system",
        action: "WORKFLOW_AUTOMATION_TRIGGERED",
        metadata: {
          automationId: rule.id,
          automationName: rule.name,
          ticketId,
          actionsTriggered: actions,
        },
      });
    }
  }

  if (updatedTags) {
    updates.ai_tags = tagsList.join(", ");
  }

  if (Object.keys(updates).length > 0) {
    await orm.update(tickets).set(updates).where(eq(tickets.id, ticketId));
  }
}
