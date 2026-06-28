import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export type AuthVariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

/**
 * Reads the Better Auth session from the incoming request and rejects
 * unauthenticated callers with 401. Apply it to any route group that needs a
 * logged-in user. Downstream handlers can read c.get("user").
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!result) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", result.user);
    c.set("session", result.session);
    await next();
  }
);
