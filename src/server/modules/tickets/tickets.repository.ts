import { orm } from "../../shared/db.ts";
import { tickets, messages, users } from "../../shared/schema.ts";
import { eq, and, sql, desc, asc, ilike, or } from "drizzle-orm";

export async function findTickets(workspaceId: string, filters: {
  status?: any;
  priority?: any;
  assigneeId?: string;
  search?: string;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const whereConditions = [eq(tickets.workspace_id, workspaceId)];

  if (filters.status) {
    whereConditions.push(eq(tickets.status, filters.status));
  }
  if (filters.priority) {
    whereConditions.push(eq(tickets.priority, filters.priority));
  }
  if (filters.assigneeId) {
    whereConditions.push(eq(tickets.assignee_id, filters.assigneeId));
  }

  if (filters.search) {
    whereConditions.push(
      or(
        ilike(tickets.title, `%${filters.search}%`),
        ilike(tickets.description, `%${filters.search}%`)
      ) as any
    );
  }

  // 11.5 Dynamic query sorting clauses
  let orderClause = desc(tickets.created_at);
  const orderAsc = filters.sortOrder === "asc";
  if (filters.sortBy === "priority") {
    orderClause = orderAsc ? asc(tickets.priority) : desc(tickets.priority);
  } else if (filters.sortBy === "status") {
    orderClause = orderAsc ? asc(tickets.status) : desc(tickets.status);
  } else if (filters.sortBy === "updated_at") {
    orderClause = orderAsc ? asc(tickets.updated_at) : desc(tickets.updated_at);
  } else if (filters.sortBy === "title") {
    orderClause = orderAsc ? asc(tickets.title) : desc(tickets.title);
  } else if (filters.sortBy === "created_at") {
    orderClause = orderAsc ? asc(tickets.created_at) : desc(tickets.created_at);
  }

  const items = await orm.query.tickets.findMany({
    where: and(...whereConditions),
    orderBy: [orderClause],
    limit: filters.limit,
    offset: filters.offset,
  });

  const countResult = await orm
    .select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(and(...whereConditions));

  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function createTicket(data: {
  id: string;
  workspaceId: string;
  creatorId: string;
  title: string;
  description: string;
  priority: any;
}) {
  await orm.insert(tickets).values({
    id: data.id,
    workspace_id: data.workspaceId,
    creator_id: data.creatorId,
    title: data.title,
    description: data.description,
    priority: data.priority,
  });
}

export async function findTicketById(workspaceId: string, ticketId: string) {
  return await orm.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), eq(tickets.workspace_id, workspaceId))
  });
}

export async function updateTicket(workspaceId: string, ticketId: string, updates: any) {
  await orm.update(tickets)
    .set({
      ...updates,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(and(eq(tickets.id, ticketId), eq(tickets.workspace_id, workspaceId)));
}

export async function findMessages(workspaceId: string, ticketId: string) {
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

export async function createMessage(data: {
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
    is_internal: data.isInternal,
  });
}

export async function touchTicket(ticketId: string) {
  await orm.update(tickets)
    .set({ updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(tickets.id, ticketId));
}

export async function deleteTicket(workspaceId: string, ticketId: string) {
  await orm.delete(messages).where(and(eq(messages.ticket_id, ticketId), eq(messages.workspace_id, workspaceId)));
  await orm.delete(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.workspace_id, workspaceId)));
}
