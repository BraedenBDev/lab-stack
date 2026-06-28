import { createAuthClient } from "better-auth/react";

/**
 * baseURL is omitted on purpose: the client defaults to the current origin.
 * In dev, Vite proxies /api/auth to the Hono server; in prod the same server
 * serves both. So this works in both environments unchanged.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
