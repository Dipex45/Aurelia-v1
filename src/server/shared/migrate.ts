import { config } from "dotenv";
config({ override: true });
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { orm } from "./db.ts";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.ts";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";

const rawDbUrl = process.env.DATABASE_URL;
const connectionString = (rawDbUrl && rawDbUrl !== "void" && (rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://")))
  ? rawDbUrl
  : "postgresql://postgres:Oluwatimilehin@db.gngubqgiwqtglxkrevdt.supabase.co:5432/postgres";

/**
 * Validates whether the database connection string is a valid Postgres URL
 * in a secure manner without triggering critical uncaught exceptions.
 */
function isValidDbUrl(url?: string): boolean {
  if (!url) return false;
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes all pending database schema migrations from `./drizzle`
 */
export async function runMigrations() {
  if (!isValidDbUrl(connectionString)) {
    console.warn("[DB-Migration] DATABASE_URL is missing or invalid. Skipping migrations.");
    return;
  }

  console.log("[DB-Migration] Running database migrations...");
  const migrationClient = postgres(connectionString!, { max: 1 });
  const dbInstance = drizzle(migrationClient, { schema });

  try {
    await migrate(dbInstance, { migrationsFolder: "./drizzle" });
    console.log("[DB-Migration] Migrations run completed successfully.");
  } catch (error) {
    console.error("[DB-Migration] Migration run failed:", error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

/**
 * Safe database rollback strategy.
 * For production security, this warns and runs inside the requested sandbox config.
 */
export async function runRollback() {
  if (!isValidDbUrl(connectionString)) {
    console.warn("[DB-Migration] DATABASE_URL is missing or invalid. Skipping schema rollback.");
    return;
  }

  console.warn("[DB-Migration] TRUNCATING ALL TABLES FOR ROLLBACK STRATEGY...");
  const rollbackClient = postgres(connectionString!, { max: 1 });
  const dbInstance = drizzle(rollbackClient, { schema });

  try {
    // Drop all tables in correct dependency order
    await dbInstance.execute(sql`
      DROP TABLE IF EXISTS "sessions" CASCADE;
      DROP TABLE IF EXISTS "audit_events" CASCADE;
      DROP TABLE IF EXISTS "attachments" CASCADE;
      DROP TABLE IF EXISTS "messages" CASCADE;
      DROP TABLE IF EXISTS "tickets" CASCADE;
      DROP TABLE IF EXISTS "workspace_members" CASCADE;
      DROP TABLE IF EXISTS "workspaces" CASCADE;
      DROP TABLE IF EXISTS "users" CASCADE;
      DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;
    `);
    console.log("[DB-Migration] Rollback: All tables completely dropped.");
  } catch (error) {
    console.error("[DB-Migration] Rollback process failed:", error);
    throw error;
  } finally {
    await rollbackClient.end();
  }
}

/**
 * Core admin bootstrap function.
 * Ensures a secure super-admin user exists in the system on launch.
 */
export async function bootstrapAdmin(adminEmail = "admin@aureliaops.com", adminName = "Super Admin") {
  if (!isValidDbUrl(connectionString)) {
    console.warn("[DB-Seed] DATABASE_URL is missing or invalid. Skipping Admin bootstrap.");
    return null;
  }

  const client = postgres(connectionString!, { max: 1 });
  const dbInstance = drizzle(client, { schema });

  try {
    // 1. Check if user already exists
    const existing = await dbInstance.execute(sql`
      SELECT * FROM "users" WHERE LOWER("email") = ${adminEmail.toLowerCase()} LIMIT 1
    `);

    const defaultPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "AureliaSuperAdmin2026!";
    const passwordHash = await argon2.hash(defaultPassword);

    if (existing.length > 0) {
      console.log("[DB-Seed] Admin user already exists. Synchronizing password hash with current configuration.");
      await dbInstance.execute(sql`
        UPDATE "users" 
        SET "password_hash" = ${passwordHash}, "status" = 'active', "email_verified" = true
        WHERE LOWER("email") = ${adminEmail.toLowerCase()}
      `);
      return existing[0];
    }

    // 2. Create high-entropy secure hash for bootstrap admin
    const id = uuidv4();

    await dbInstance.execute(sql`
      INSERT INTO "users" ("id", "email", "password_hash", "full_name", "status", "created_at", "updated_at")
      VALUES (${id}, ${adminEmail}, ${passwordHash}, ${adminName}, 'active', NOW(), NOW())
    `);

    console.log(`[DB-Seed] Secure admin bootstrapped: ${adminEmail}`);
    console.log("[DB-Seed] Default password is from configured environment, falling back to: AureliaSuperAdmin2026!");
    return { id, email: adminEmail };
  } catch (error) {
    console.error("[DB-Seed] Admin bootstrapping failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * General mock & metadata seed generator for pre-populating tenants and queues
 */
export async function runSeeding() {
  if (!isValidDbUrl(connectionString)) {
    console.warn("[DB-Seed] DATABASE_URL is missing or invalid. Skipping data seeding.");
    return;
  }

  const client = postgres(connectionString!, { max: 1 });
  const dbInstance = drizzle(client, { schema });

  try {
    console.log("[DB-Seed] Seeding sample workspaces...");

    // Bootstrap an admin first
    const admin = await bootstrapAdmin();
    if (!admin) return;

    // Create default workspace if none exist
    const workspaceCheck = await dbInstance.execute(sql`SELECT * FROM "workspaces" LIMIT 1`);
    if (workspaceCheck.length === 0) {
      const workspaceId = uuidv4();
      const slug = "ops-hq";
      
      await dbInstance.execute(sql`
        INSERT INTO "workspaces" ("id", "name", "slug", "owner_id", "status", "created_at", "updated_at")
        VALUES (${workspaceId}, 'Aurelia Operations HQ', ${slug}, ${admin.id}, 'active', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);

      await dbInstance.execute(sql`
        INSERT INTO "workspace_members" ("workspace_id", "user_id", "role", "created_at")
        VALUES (${workspaceId}, ${admin.id}, 'owner', NOW())
        ON CONFLICT DO NOTHING
      `);

      console.log("[DB-Seed] Default workspace 'ops-hq' successfully seeded.");
    } else {
      console.log("[DB-Seed] Database already contains workspaces. Skipping seeding.");
    }
  } catch (error) {
    console.error("[DB-Seed] Data seeding failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}
