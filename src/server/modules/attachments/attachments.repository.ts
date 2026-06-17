import { orm } from "../../shared/db.ts";
import { attachments } from "../../shared/schema.ts";
import { eq, and, asc, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function createAttachment(data: any) {
  const id = uuidv4();
  await orm.insert(attachments).values({
    id,
    workspace_id: data.workspace_id,
    ticket_id: data.ticket_id,
    message_id: data.message_id || null,
    user_id: data.user_id,
    filename: data.filename,
    original_name: data.original_name,
    mimetype: data.mimetype,
    size: data.size,
    storage_key: data.storage_key,
    is_internal: data.is_internal
  });
  return id;
}

export async function findByTicket(workspaceId: string, ticketId: string) {
  return await orm.query.attachments.findMany({
    where: and(eq(attachments.workspace_id, workspaceId), eq(attachments.ticket_id, ticketId)),
    orderBy: [asc(attachments.created_at)]
  });
}

export async function findByMessage(messageId: string) {
  return await orm.query.attachments.findMany({
    where: eq(attachments.message_id, messageId),
    orderBy: [asc(attachments.created_at)]
  });
}

export async function findById(id: string) {
  return await orm.query.attachments.findFirst({
    where: eq(attachments.id, id)
  });
}

export async function deleteAttachment(id: string) {
  await orm.delete(attachments).where(eq(attachments.id, id));
}

export async function linkAttachmentsToMessage(attachmentIds: string[], messageId: string) {
  if (attachmentIds.length === 0) return;
  await orm.update(attachments)
    .set({ message_id: messageId })
    .where(inArray(attachments.id, attachmentIds));
}
