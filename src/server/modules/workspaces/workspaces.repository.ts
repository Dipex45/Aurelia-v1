import { orm } from "../../shared/db.ts";
import { workspaces, workspaceMembers, users } from "../../shared/schema.ts";
import { eq, and, sql } from "drizzle-orm";

export async function findByUserId(userId: string) {
  return await orm
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      owner_id: workspaces.owner_id,
      status: workspaces.status,
      created_at: workspaces.created_at,
      updated_at: workspaces.updated_at,
      role: workspaceMembers.role
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspace_id))
    .where(eq(workspaceMembers.user_id, userId));
}

export async function findBySlug(slug: string) {
  return await orm.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    columns: { id: true }
  });
}

export async function createWithMember(id: string, name: string, slug: string, ownerId: string) {
  await orm.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id,
      name,
      slug,
      owner_id: ownerId
    });

    await tx.insert(workspaceMembers).values({
      workspace_id: id,
      user_id: ownerId,
      role: "owner"
    });
  });
}

export async function update(id: string, name: string, slug: string) {
  await orm.update(workspaces)
    .set({ name, slug, updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(workspaces.id, id));
}

export async function deleteWorkspace(id: string) {
  // We should also delete members but references might handle it depending on DB constraints
  await orm.delete(workspaceMembers).where(eq(workspaceMembers.workspace_id, id));
  await orm.delete(workspaces).where(eq(workspaces.id, id));
}

export async function findMembers(workspaceId: string) {
  return await orm
    .select({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      avatar_url: users.avatar_url,
      role: workspaceMembers.role,
      created_at: workspaceMembers.created_at
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.user_id, users.id))
    .where(eq(workspaceMembers.workspace_id, workspaceId));
}

export async function addOrUpdateMember(workspaceId: string, userId: string, role: any) {
  await orm.insert(workspaceMembers)
    .values({
      workspace_id: workspaceId,
      user_id: userId,
      role
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspace_id, workspaceMembers.user_id],
      set: { role }
    });
}

export async function removeMember(workspaceId: string, userId: string) {
  await orm.delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspace_id, workspaceId), eq(workspaceMembers.user_id, userId)));
}

export async function findWorkspaceAndMemberRole(workspaceId: string, userId: string) {
  const result = await orm
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      owner_id: workspaces.owner_id,
      role: workspaceMembers.role
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspace_id))
    .where(and(eq(workspaces.id, workspaceId), eq(workspaceMembers.user_id, userId)));
  
  return result[0];
}

export async function findOwnerId(workspaceId: string) {
  const result = await orm.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { owner_id: true }
  });
  return result?.owner_id;
}
