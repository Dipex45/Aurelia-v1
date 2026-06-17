import { config } from "dotenv";
config({ override: true });
import { runMigrations, runRollback, runSeeding, bootstrapAdmin } from "../shared/migrate.ts";

async function main() {
  const argument = process.argv[2];

  if (!argument) {
    console.log(`
Aurelia Ops Database Management System
---------------------------------------
Usage: tsx src/server/scripts/dbCli.ts [command]

Commands:
  --migrate     Run all pending migrations in ./drizzle
  --rollback    Perform fallback cascading drops of all tables (rollback)
  --seed        Seed database with default workspaces and structures
  --bootstrap   Ensure secure super-admin bootstrap
    `);
    process.exit(0);
  }

  try {
    switch (argument) {
      case "--migrate":
        console.log("Starting Migration Step...");
        await runMigrations();
        break;
      case "--rollback":
        console.log("Starting Rollback/Reset Step...");
        await runRollback();
        break;
      case "--seed":
        console.log("Starting Seeding Step...");
        await runSeeding();
        break;
      case "--bootstrap":
        console.log("Starting Admin Bootstrap Step...");
        await bootstrapAdmin();
        break;
      default:
        console.error(`Unknown argument: ${argument}. Run without arguments for help.`);
        process.exit(1);
    }
    console.log("Database CLI task successfully executed.");
    process.exit(0);
  } catch (error) {
    console.error("Database CLI task failed:", error);
    process.exit(1);
  }
}

main();
