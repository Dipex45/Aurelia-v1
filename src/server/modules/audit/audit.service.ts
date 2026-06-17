import * as auditRepository from "./audit.repository.ts";
import { eventBus, AppEventType } from "../../shared/events.ts";
import { logStructuredAudit } from "../../shared/logger.ts";

export interface AuditLogOptions {
  workspaceId: string;
  actorId: string;
  action: string;
  metadata?: any;
  requestId?: string;
}

// Background listener for decoupled auditing
eventBus.on(AppEventType.MESSAGE_CREATED, (payload) => {
  logEvent({
    workspaceId: payload.workspaceId,
    actorId: payload.authorId,
    action: "MESSAGE_CREATE",
    metadata: { 
      ticketId: payload.ticketId, 
      messageId: payload.messageId, 
      isInternal: payload.isInternal 
    },
    requestId: payload.requestId
  }).catch(err => console.error(JSON.stringify({ 
    type: "error", 
    msg: "Decoupled audit logging failed", 
    err: err.message, 
    requestId: payload.requestId 
  })));
});

export async function logEvent({ workspaceId, actorId, action, metadata, requestId }: AuditLogOptions) {
  const metadataStr = metadata ? JSON.stringify(metadata) : null;

  // Log to centralized Winston stream
  logStructuredAudit(action, actorId, `workspace:${workspaceId}`, { metadata, requestId });

  return auditRepository.create({
    workspaceId,
    actorId,
    action,
    metadata: metadataStr,
    requestId: requestId || null
  });
}

export async function getEvents(workspaceId: string, filters: { actorId?: string; action?: string; limit?: number; offset?: number; page?: number }) {
  const limit = Math.min(filters.limit || 20, 100);
  const page = filters.page || 1;
  const offset = (page - 1) * limit;

  const { items, total } = await auditRepository.findByWorkspace(workspaceId, {
    actorId: filters.actorId,
    action: filters.action,
    limit,
    offset
  });

  return {
    items,
    page,
    limit,
    total,
    has_next: offset + items.length < total
  };
}
