import { v4 as uuidv4 } from "uuid";
import * as ticketsRepository from "./tickets.repository.ts";
import { ApiError } from "../../shared/middleware/errorHandler.ts";
import * as auditService from "../audit/audit.service.ts";
import { eventBus, AppEventType } from "../../shared/events.ts";
import { hasPermission, Permission, Role } from "../../../lib/permissions.ts";
import { getAI } from "../ai/ai.service.ts";
import { Type } from "@google/genai";
import { orm } from "../../shared/db.ts";
import { workspaceMembers, users } from "../../shared/schema.ts";
import { eq, and } from "drizzle-orm";
import { createSlaTrackerEvents, updateSlaTrackerPriorities, handleTicketResolution } from "../sla/sla.service.ts";
import { executeAutomations } from "../automations/automations.service.ts";

export async function autoTriageTicket(workspaceId: string, ticketId: string) {
  const ticket = await ticketsRepository.findTicketById(workspaceId, ticketId);
  if (!ticket) return null;

  let category = "general";
  let sentiment = "neutral";
  let tags = ["auto-generated"];
  let priority = ticket.priority || "low";
  let routingRule = "Default Workspace Router";
  let assigneeId = ticket.assignee_id || null;

  try {
    const ai = getAI();
    let response: any = null;
    let attempts = 3;
    let delayMs = 305;

    for (let i = 1; i <= attempts; i++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze the following support request and determine its triage parameters:
Title: ${ticket.title}
Description: ${ticket.description}`,
          config: {
            systemInstruction: "You are an automated helpdesk AI triage processor. Your job is to analyze incoming tickets to categorize them, assess sentiment, generate useful tags, and assign a priority level. Categorize into ONE of: 'billing', 'technical', 'security', 'feature_request', 'general'. Analyze User sentiment as ONE of: 'positive', 'neutral', 'negative', 'frustrated'. Provide 2 to 5 short lowercase descriptive tags.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                sentiment: { type: Type.STRING },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                priority: { type: Type.STRING }
              },
              required: ["category", "sentiment", "tags", "priority"]
            }
          }
        });
        break; // Success, exit loop
      } catch (err: any) {
        console.warn(`[AI-Triage] Attempt ${i}/${attempts} failed to contact Gemini API. Error: ${err.message || err}`);
        if (i === attempts) throw err; // rethrow on last attempt to trigger local fallback heuristics
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2.5; // Exponential escalation
      }
    }

    if (response?.text) {
      const parsed = JSON.parse(response.text.trim());
      if (parsed.category) category = parsed.category.toLowerCase();
      if (parsed.sentiment) sentiment = parsed.sentiment.toLowerCase();
      if (Array.isArray(parsed.tags)) tags = parsed.tags;
      if (parsed.priority) priority = parsed.priority.toLowerCase();
    }
  } catch (err) {
    console.warn("[AI-Triage] AI extraction failed, fallback triggered:", err);
    // Simple language model heuristic heuristics / fallback auto-tagger
    const textSample = `${ticket.title} ${ticket.description}`.toLowerCase();
    if (textSample.includes("billing") || textSample.includes("invoice") || textSample.includes("payment") || textSample.includes("refund")) {
      category = "billing";
    } else if (textSample.includes("security") || textSample.includes("leak") || textSample.includes("hack") || textSample.includes("breach") || textSample.includes("password")) {
      category = "security";
    } else if (textSample.includes("bug") || textSample.includes("error") || textSample.includes("fail") || textSample.includes("crash")) {
      category = "technical";
    }
  }

  // Define routing policies
  let categoryRouteRule = `AI Triage: Classified as ${category.toUpperCase()}`;
  if (category === "security") {
    priority = "critical";
    categoryRouteRule = "AI Triage [CRITICAL]: Escalated to security operations desk";
  }

  // Priority Escalation based on Frustrated sentiment
  if (sentiment === "frustrated") {
    routingRule = "Sentiment Escalator (Priority Elevated due to Client Distress)";
    if (priority === "low") priority = "medium";
    else if (priority === "medium") priority = "high";
    else if (priority === "high") priority = "critical";
  }

  routingRule = routingRule !== "Default Workspace Router" ? `${routingRule} | ${categoryRouteRule}` : categoryRouteRule;

  // Auto-route: assign based on workspace candidates
  try {
    const listMembers = await orm
      .select({
        id: users.id,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.user_id, users.id))
      .where(eq(workspaceMembers.workspace_id, workspaceId));

    if (listMembers && listMembers.length > 0) {
      // Find direct agent roles first, then admins/owners
      let candidate = listMembers.find((m: any) => m.role === "agent");
      if (!candidate) candidate = listMembers.find((m: any) => m.role === "admin" || m.role === "owner");
      if (!candidate) candidate = listMembers[0];

      if (candidate) {
        assigneeId = candidate.id;
        routingRule += ` (Assigned to Workspace Agent)`;
      }
    }
  } catch (memberErr) {
    console.warn("[AI-Triage] Member assignment query failed:", memberErr);
  }

  // Persist triaged params
  await ticketsRepository.updateTicket(workspaceId, ticketId, {
    ai_category: category,
    ai_sentiment: sentiment,
    ai_tags: tags.join(", "),
    ai_routing_rule: routingRule,
    priority: priority as any,
    assignee_id: assigneeId
  });

  return await ticketsRepository.findTicketById(workspaceId, ticketId);
}

export async function listTickets(workspaceId: string, filters: { 
  page: number; 
  limit: number; 
  status?: string; 
  priority?: string; 
  assigneeId?: string; 
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (filters.page - 1) * limit;

  const { items, total } = await ticketsRepository.findTickets(workspaceId, {
    status: filters.status,
    priority: filters.priority,
    assigneeId: filters.assigneeId,
    search: filters.search,
    limit,
    offset,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  return { 
    items, 
    page: filters.page, 
    limit, 
    total,
    has_next: offset + items.length < total
  };
}

export async function createTicket(data: any) {
  const ticketId = uuidv4();
  
  await ticketsRepository.createTicket({
    id: ticketId,
    workspaceId: data.workspaceId,
    creatorId: data.creatorId,
    title: data.title,
    description: data.description,
    priority: data.priority || "low"
  });

  // Automatically execute AI-Triage, Sentiment Analysis, classification and Auto-Routing
  try {
    await autoTriageTicket(data.workspaceId, ticketId);
  } catch (aiErr) {
    console.warn("[AI-Triage-Execution] Skipped or failed triage update:", aiErr);
  }

  await auditService.logEvent({
    workspaceId: data.workspaceId,
    actorId: data.creatorId,
    action: "TICKET_CREATE",
    metadata: { ticketId, title: data.title },
    requestId: data.requestId
  });

  let ticket = await getTicket(data.workspaceId, ticketId);

  // Initialize SLA tracker events
  try {
    await createSlaTrackerEvents(data.workspaceId, ticketId, (ticket as any).priority || "low");
  } catch (slaErr) {
    console.warn("[SLA-Tracker] Creation failed ignored:", slaErr);
  }

  // Execute workflow automations (IF-THEN engine)
  try {
    await executeAutomations(data.workspaceId, "ticket_created", ticketId);
    // Reload ticket so that automated category/priority changes display immediately to the user
    ticket = await getTicket(data.workspaceId, ticketId);
  } catch (autoErr) {
    console.warn("[Workflow-Automations] Execution failed ignored:", autoErr);
  }

  eventBus.emitEvent(AppEventType.TICKET_CREATED, {
    ticketId,
    workspaceId: data.workspaceId,
    ticket
  });

  return ticket;
}

export async function getTicket(workspaceId: string, ticketId: string) {
  const ticket = await ticketsRepository.findTicketById(workspaceId, ticketId);

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  return ticket;
}

export async function updateTicket(workspaceId: string, ticketId: string, actorId: string, role: string, updates: any, requestId?: string) {
  const existing = await getTicket(workspaceId, ticketId) as any;
  
  const userRole = role as Role;
  const isOwnerAdmin = hasPermission(userRole, Permission.WORKSPACE_EDIT); // Broad check for high authority
  const canEdit = hasPermission(userRole, Permission.TICKETS_EDIT);
  const isAssignedToActor = existing.assignee_id === actorId;
  const isCreator = existing.creator_id === actorId;

  // 1. Basic capability check
  if (!canEdit && !isCreator && role !== "member") {
    throw new ApiError(403, "Insufficient permissions capability to update this ticket");
  }

  // 2. Field-level permissions
  if (updates.priority !== undefined && !isOwnerAdmin) {
    throw new ApiError(403, "Insufficient capability [priority:edit]");
  }

  if (updates.assignee_id !== undefined && !hasPermission(userRole, Permission.TICKETS_ASSIGN)) {
    throw new ApiError(403, "Insufficient capability [tickets:assign]");
  }

  if (updates.assignee_id !== undefined && !isOwnerAdmin) {
    // Agents can only assign to themselves if they don't have full assign permission (handled above, but keeping logic for nuanced control)
    if (userRole === "agent" && updates.assignee_id !== actorId && !isOwnerAdmin) {
      throw new ApiError(403, "Agents can only assign tickets to themselves");
    }
  }

  // Capability restrictions for non-admin/non-owner
  if ((updates.title !== undefined || updates.description !== undefined || updates.status !== undefined)) {
    if (userRole === "agent" && !isAssignedToActor && !isCreator && !isOwnerAdmin) {
      throw new ApiError(403, "Agent capability restricted to assigned objects.");
    }
    if (userRole === "member" && !isCreator) {
       throw new ApiError(403, "Guest capability restricted to self-created objects.");
    }
  }

  // Consistency invariant: Ticket lifecycle transitions follow controlled rules
  if (updates.status && updates.status !== existing.status) {
    const validTransitions: Record<string, string[]> = {
      open: ["in_progress", "resolved", "closed"],
      in_progress: ["resolved", "on_hold", "closed"],
      resolved: ["closed", "open"], // Reopening is allowed but monitored
      on_hold: ["in_progress", "closed"],
      closed: ["open", "resolved"] // Only if it was closed by mistake or needs correction
    };

    if (!validTransitions[existing.status]?.includes(updates.status)) {
      throw new ApiError(400, `Invalid status transition from ${existing.status} to ${updates.status}`);
    }
  }

  const allowedUpdates = ["title", "description", "status", "priority", "assignee_id", "ai_tags"];
  const updateData: any = {};
  const meta: any = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined && updates[key] !== existing[key]) {
      updateData[key] = updates[key];
      meta[key] = { from: existing[key], to: updates[key] };
    }
  }

  if (Object.keys(updateData).length === 0) return existing;

  await ticketsRepository.updateTicket(workspaceId, ticketId, updateData);

  await auditService.logEvent({
    workspaceId,
    actorId,
    action: "TICKET_UPDATE",
    metadata: { ticketId, changes: meta },
    requestId
  });

  const updatedTicket = await getTicket(workspaceId, ticketId);

  eventBus.emitEvent(AppEventType.TICKET_UPDATED, {
    ticketId,
    workspaceId,
    ticket: updatedTicket,
    changes: meta
  });

  return updatedTicket;
}

export async function touchTicket(workspaceId: string, ticketId: string) {
  await ticketsRepository.touchTicket(ticketId);
}

export async function deleteTicket(workspaceId: string, ticketId: string) {
  const existing = await getTicket(workspaceId, ticketId);
  await ticketsRepository.deleteTicket(workspaceId, ticketId);

  await auditService.logEvent({
    workspaceId,
    actorId: "system", // Generic since delete role is checked in controller/middleware
    action: "TICKET_DELETE",
    metadata: { ticketId, title: (existing as any).title }
  });

  eventBus.emitEvent(AppEventType.TICKET_DELETED, {
    ticketId,
    workspaceId,
    title: (existing as any).title
  });
}
