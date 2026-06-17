import { orm } from "../../shared/db.ts";
import { auditEvents } from "../../shared/schema.ts";
import { eq, and, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function create(data: {
  workspaceId: string;
  actorId: string;
  action: string;
  metadata: string | null;
  requestId: string | null;
}) {
  const id = uuidv4();
  await orm.insert(auditEvents).values({
    id,
    workspace_id: data.workspaceId,
    actor_id: data.actorId,
    action: data.action,
    metadata: data.metadata,
    request_id: data.requestId
  });
  return id;
}

export async function findByWorkspace(workspaceId: string, filters: { 
  actorId?: string; 
  action?: string; 
  limit: number; 
  offset: number 
}) {
  const whereConditions = [eq(auditEvents.workspace_id, workspaceId)];
  if (filters.actorId) {
    whereConditions.push(eq(auditEvents.actor_id, filters.actorId));
  }
  if (filters.action) {
    whereConditions.push(eq(auditEvents.action, filters.action));
  }

  const items = await orm.query.auditEvents.findMany({
    where: and(...whereConditions),
    orderBy: [desc(auditEvents.created_at)],
    limit: filters.limit,
    offset: filters.offset
  });

  const countResult = await orm
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(and(...whereConditions));

  return { items, total: Number(countResult[0]?.count || 0) };
}
