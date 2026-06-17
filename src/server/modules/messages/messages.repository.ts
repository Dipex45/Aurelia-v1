import { orm } from "../../shared/db.ts";
import { messages, users } from "../../shared/schema.ts";
import { eq, and, asc } from "drizzle-orm";

export async function findByTicket(workspaceId: string, ticketId: string) {
  return await orm
    .select({
      id: messages.id,
      ticket_id: messages.ticket_id,
      workspace_id: messages.workspace_id,
      author_id: messages.author_id,
      content: messages.content,
      is_internal: messages.is_internal,
      created_at: messages.created_at,
      author_name: users.full_name,
      author_avatar: users.avatar_url
    })
    .from(messages)
    .innerJoin(users, eq(messages.author_id, users.id))
    .where(and(eq(messages.ticket_id, ticketId), eq(messages.workspace_id, workspaceId)))
    .orderBy(asc(messages.created_at));
}

export async function create(data: {
  id: string;
  ticketId: string;
  workspaceId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
}) {
  await orm.insert(messages).values({
    id: data.id,
    ticket_id: data.ticketId,
    workspace_id: data.workspaceId,
    author_id: data.authorId,
    content: data.content,
    is_internal: data.isInternal
  });
}
