import { v4 as uuidv4 } from "uuid";
import * as messagesRepository from "./messages.repository.ts";
import * as ticketsService from "../tickets/tickets.service.ts";
import * as attachmentsRepository from "../attachments/attachments.repository.ts";
import { eventBus, AppEventType } from "../../shared/events.ts";
import { handleAgentResponse } from "../sla/sla.service.ts";

export async function getTicketMessages(workspaceId: string, ticketId: string) {
  // Use ticketsService to verify existence/access if needed, 
  // though middleware already handled workspaceId/membership
  await ticketsService.getTicket(workspaceId, ticketId);
  return messagesRepository.findByTicket(workspaceId, ticketId);
}

export async function addMessage(data: {
  ticketId: string;
  workspaceId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  attachmentIds?: string[];
  requestId?: string;
}) {
  const messageId = uuidv4();
  
  await messagesRepository.create({
    id: messageId,
    ticketId: data.ticketId,
    workspaceId: data.workspaceId,
    authorId: data.authorId,
    content: data.content,
    isInternal: data.isInternal
  });

  if (data.attachmentIds && data.attachmentIds.length > 0) {
    attachmentsRepository.linkAttachmentsToMessage(data.attachmentIds, messageId);
  }

  await ticketsService.touchTicket(data.workspaceId, data.ticketId);

  if (!data.isInternal) {
    try {
      await handleAgentResponse(data.workspaceId, data.ticketId, data.authorId);
    } catch (slaErr) {
      console.warn("[SLA-AgentResponse] Hook failure ignored:", slaErr);
    }
  }

  // Emit event for decoupled auditing and future integrations (WS, etc)
  eventBus.emitEvent(AppEventType.MESSAGE_CREATED, {
    messageId,
    workspaceId: data.workspaceId,
    authorId: data.authorId,
    ticketId: data.ticketId,
    isInternal: data.isInternal,
    requestId: data.requestId
  });

  return { id: messageId, ...data, created_at: new Date().toISOString() };
}
