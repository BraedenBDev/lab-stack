import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

/**
 * Uses Bun's built-in Postgres client (`Bun.SQL`) — no `pg` dependency at
 * runtime. Drizzle's `bun-sql` adapter wraps it. The migration CLI
 * (drizzle-kit) connects separately using the same DATABASE_URL.
 */
const client = new SQL(databaseUrl);

export const db = drizzle({ client, schema });
export { schema };
