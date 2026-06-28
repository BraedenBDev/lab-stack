import { hc } from "hono/client";
import type { AppType } from "@/server/index";

/**
 * Fully typed API client. Because AppType is imported with `import type`, none
 * of the server code (Hono, Drizzle, Better Auth) is bundled into the frontend
 * — only the inferred route types come across. Calls like
 * `client.api.notes.$get()` are autocompleted and type-checked end to end.
 */
export const client = hc<AppType>("/");

export const api = client.api;
