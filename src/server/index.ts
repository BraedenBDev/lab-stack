import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/bun";
import { auth } from "./auth";
import { notesRoute } from "./routes/notes";

const isProd = process.env.NODE_ENV === "production";

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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
      `<!doctype html><html><head><meta charset="utf-8"/><title>bun-stack API</title>
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

// In production the same server serves the built SPA. In dev, Vite does that
// on :5173 and proxies /api here, so we skip static handling.
if (isProd) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

const port = Number(process.env.PORT ?? 3000);
console.log(`server listening on http://localhost:${port} (prod=${isProd})`);

export default {
  port,
  fetch: app.fetch,
};
