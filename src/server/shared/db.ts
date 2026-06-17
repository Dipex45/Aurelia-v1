import { config } from "dotenv";
config({ override: true });
import postgres from "postgres";
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';

const rawDbUrl = process.env.DATABASE_URL;
const connectionString = (rawDbUrl && rawDbUrl !== "void" && (rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://")))
  ? rawDbUrl
  : "postgresql://postgres:Oluwatimilehin@db.gngubqgiwqtglxkrevdt.supabase.co:5432/postgres";

let isValidDbUrl = false;
let queryClient: any = null;

try {
  if (connectionString && (connectionString.startsWith("postgres://") || connectionString.startsWith("postgresql://"))) {
    new URL(connectionString); // Validate string can be parsed as a URL object
    queryClient = postgres(connectionString);
    isValidDbUrl = true;
  }
} catch (err: any) {
  console.error("[DB-Init] DATABASE_URL parsing failed. Database operations will be unavailable:", err.message);
  isValidDbUrl = false;
  queryClient = null;
}

if (!isValidDbUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL environment variable is required in production and must be a valid postgres URL");
}

// Use 'orm' for Drizzle and 'sq' for raw queries if needed
const drizzleInstance = queryClient ? drizzle(queryClient, { schema }) : null;

export const isDbInitialized = () => !!drizzleInstance;

export const orm = new Proxy({} as any, {
  get(target, prop) {
    if (!drizzleInstance) {
      throw new Error("Database not initialized. Please provide a valid DATABASE_URL in your environment variables/secrets.");
    }
    return (drizzleInstance as any)[prop];
  }
});

// Initialization function with robust connection tests and backoff retries for Supabase PostgreSQL
export async function initDb() {
  if (!connectionString) {
    console.warn("DATABASE_URL is not set. Database integration will be disabled.");
    return;
  }
  if (!queryClient) {
    console.warn("Database query client not initialized due to invalid URL config.");
    return;
  }

  const maxRetries = 5;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Run a simple test query to verify connection to Supabase DB pool
      await queryClient`SELECT 1`;
      console.log("PostgreSQL Database connection initialized successfully (SELECT 1 succeeded)");
      return;
    } catch (err: any) {
      console.warn(`[DB-Init] Database connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) {
        console.error("[DB-Init] FATAL: Unable to establish database connection within retry budget.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
