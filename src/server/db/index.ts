import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";
import * as schema from "./schema";
import { env } from "../env";

/**
 * Uses Bun's built-in Postgres client (`Bun.SQL`) — no `pg` dependency at
 * runtime. Drizzle's `bun-sql` adapter wraps it. The migration CLI
 * (drizzle-kit) connects separately using the same DATABASE_URL. Presence of
 * DATABASE_URL is validated at boot in ../env.
 */
const client = new SQL(env.DATABASE_URL);

export const db = drizzle({ client, schema });
export { schema };
