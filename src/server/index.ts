// `./env` first: validates config and fails fast at boot before anything else
// (auth, db) tries to use it.
import { env, isProduction, trustedOrigins } from "./env";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { auth } from "./auth";
import { notesRoute } from "./routes/notes";
import { reportError } from "../shared/report";

/**
 * Order matters:
 *  1. CORS for /api/* (only relevant when client & server are on different
 *     origins, e.g. the Vite dev server). Must come before the auth handler.
 *  2. Better Auth catch-all on /api/auth/* — handles sign-up/in/out, sessions.
 *  3. Your own typed API routes.
 * The chained calls keep the type intact so `AppType` reflects every route.
 */
const app = new Hono()
  // Sensible default security headers on every response (X-Frame-Options,
  // nosniff, Referrer-Policy, HSTS in prod, ...). No CSP by default so it won't
  // break the Vite bundle; add one via `contentSecurityPolicy` when you lock down.
  .use("*", secureHeaders())
  // Request logging (method, path, status, timing) → stdout / container logs.
  .use("*", logger())
  .use(
    "/api/*",
    cors({
      origin: trustedOrigins,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    })
  )
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/health", (c) => c.json({ ok: true }))
  // Self-serve API docs: the OpenAPI spec + a Swagger UI page (CDN, no deps).
  // Visit /api/docs. The spec lives at repo root (copied into the image).
  .get("/api/openapi.yaml", (c) =>
    c.body(Bun.file("openapi.yaml").stream(), 200, {
      "Content-Type": "text/yaml; charset=utf-8",
    })
  )
  .get("/api/docs", (c) =>
    c.html(
      `<!doctype html><html><head><meta charset="utf-8"/><title>lab-stack API</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"
  integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn" crossorigin="anonymous"></head>
<body><div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
  integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep" crossorigin="anonymous"></script>
<script>window.ui = SwaggerUIBundle({ url: "/api/openapi.yaml", dom_id: "#swagger-ui" });</script>
</body></html>`
    )
  )
  .route("/api/notes", notesRoute);

/** Export the route type so the frontend gets a fully typed RPC client. */
export type AppType = typeof app;

// Central error handler: report once, never leak a stack trace to the client.
app.onError((err, c) => {
  reportError(err, { path: c.req.path, method: c.req.method });
  return c.json({ error: "Internal Server Error" }, 500);
});

// JSON 404 for unmatched API routes (in prod the SPA fallback below handles
// non-API GETs).
app.notFound((c) => c.json({ error: "Not Found" }, 404));

// In production the same server serves the built SPA. In dev, Vite does that
// on :5173 and proxies /api here, so we skip static handling.
if (isProduction) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

console.log(`server listening on http://localhost:${env.PORT} (prod=${isProduction})`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
