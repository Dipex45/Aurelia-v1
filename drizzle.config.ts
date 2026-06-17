import { defineConfig } from 'drizzle-kit';

const rawDbUrl = process.env.DATABASE_URL;
const connectionString = (rawDbUrl && rawDbUrl !== "void" && (rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://")))
  ? rawDbUrl
  : "postgresql://postgres:Oluwatimilehin@db.gngubqgiwqtglxkrevdt.supabase.co:5432/postgres";

export default defineConfig({
  schema: './src/server/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
