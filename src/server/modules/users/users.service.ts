import { orm } from "../../shared/db.ts";
import { users, sessions } from "../../shared/schema.ts";
import { eq, sql } from "drizzle-orm";
import { ApiError } from "../../shared/middleware/errorHandler.ts";

export async function getUserById(userId: string) {
  const user = await orm.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      status: true,
      created_at: true
    }
  });

  if (!user) throw new ApiError(404, "User not found");
  return user;
}

export async function updateProfile(userId: string, updates: { fullName?: string; avatarUrl?: string }) {
  const user = await getUserById(userId) as any;
  
  await orm.update(users)
    .set({
      full_name: updates.fullName ?? user.full_name,
      avatar_url: updates.avatarUrl ?? user.avatar_url,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(eq(users.id, userId));

  return { ...user, ...updates };
}

export async function purgeIdentity(userId: string) {
  await orm.update(users)
    .set({
      email: sql`'deleted-' || ${users.id} || '@deleted.internal'`,
      full_name: 'Deleted User',
      avatar_url: null,
      status: 'suspended'
    })
    .where(eq(users.id, userId));
  
  await orm.update(sessions)
    .set({ is_revoked: true })
    .where(eq(sessions.user_id, userId));

  return { success: true };
}
