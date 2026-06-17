import { orm } from "../../shared/db.ts";
import { users, sessions } from "../../shared/schema.ts";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function findUserByEmail(email: string) {
  return await orm.query.users.findFirst({
    where: eq(sql`lower(${users.email})`, email.toLowerCase())
  });
}

export async function findUserById(userId: string) {
  return await orm.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function updateUser(userId: string, data: Partial<typeof users.$inferInsert>) {
  await orm.update(users)
    .set(data)
    .where(eq(users.id, userId));
}

export async function findUserByResetToken(token: string) {
  return await orm.query.users.findFirst({
    where: eq(users.password_reset_token, token)
  });
}

export async function findUserByVerificationToken(token: string) {
  return await orm.query.users.findFirst({
    where: eq(users.email_verification_token, token)
  });
}

export async function createUser(id: string, email: string, passwordHash: string, fullName: string) {
  await orm.insert(users).values({
    id,
    email,
    password_hash: passwordHash,
    full_name: fullName
  });
}

export async function createSession(data: {
  userId: string;
  jti: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
}) {
  const sessionId = uuidv4();
  await orm.insert(sessions).values({
    id: sessionId,
    user_id: data.userId,
    token_jti: data.jti,
    refresh_token: data.refreshToken,
    user_agent: data.userAgent || null,
    ip_address: data.ipAddress || null,
    expires_at: new Date(data.expiresAt) as any // ensure it's a date object for PG
  });
  return sessionId;
}

export async function findSessionByToken(refreshToken: string) {
  return await orm.query.sessions.findFirst({
    where: eq(sessions.refresh_token, refreshToken)
  });
}

export async function findSessionByJti(jti: string) {
  return await orm.query.sessions.findFirst({
    where: eq(sessions.token_jti, jti)
  });
}

export async function updateSessionTokens(sessionId: string, jti: string, refreshToken: string, expiresAt: string) {
  await orm.update(sessions)
    .set({
      token_jti: jti,
      refresh_token: refreshToken,
      expires_at: new Date(expiresAt) as any
    })
    .where(eq(sessions.id, sessionId));
}

export async function revokeSessionByJti(jti: string) {
  await orm.update(sessions)
    .set({ is_revoked: true })
    .where(eq(sessions.token_jti, jti));
}

export async function findSessionsByUser(userId: string) {
  return await orm.query.sessions.findMany({
    where: and(eq(sessions.user_id, userId), eq(sessions.is_revoked, false)),
    orderBy: (sessions, { desc }) => [desc(sessions.created_at)]
  });
}

export async function revokeAllUserSessions(userId: string) {
  await orm.update(sessions)
    .set({ is_revoked: true })
    .where(eq(sessions.user_id, userId));
}

export async function revokeSessionById(userId: string, sessionId: string) {
  await orm.update(sessions)
    .set({ is_revoked: true })
    .where(and(eq(sessions.id, sessionId), eq(sessions.user_id, userId)));
}
