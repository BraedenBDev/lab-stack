# Implementation guide

How `lab-stack` actually works, end to end — for the engineer who's about to
fork it into a new Almost a Lab prototype and wants to know where everything
lives, why it's wired this way, and how to extend it without fighting the grain.

Read [`README.md`](../README.md) first for the quickstart. This document is the
"how it's built" companion; [`CLAUDE.md`](../CLAUDE.md) is the terse version for
AI agents.

---

## 1. The one idea

**One Bun process. One origin. One source of truth for types.**

A single `Bun.serve` process (driven by a Hono app) serves the JSON API *and*,
in production, the built React SPA. There is no separate API server and web
server — it deploys as one container. The frontend talks to the backend through
a Hono RPC client that is typed *from the server's own route definitions*, so a
change to a route signature shows up as a red squiggle in the React code with no
codegen step and no runtime coupling.

```
Browser (React 19 + shadcn/ui)
  │  fetch via typed Hono RPC client  (src/client/lib/api.ts)
  │  cookies: HttpOnly better-auth.session_token
  ▼
Hono app  (src/server/index.ts)
  ├─ secureHeaders()              security headers on every response
  ├─ cors() for /api/*            allowlist = TRUSTED_ORIGINS (dev cross-origin)
  ├─ /api/auth/*  → Better Auth   sign up/in/out, sessions, OAuth, verify, reset
  ├─ /api/health                  liveness
  ├─ /api/docs, /api/openapi.yaml Swagger UI + spec
  ├─ /api/notes/* → requireAuth   example CRUD, scoped to the session user
  └─ /*           → ./dist        built SPA (production only)
  ▼
Drizzle ORM  →  Bun.SQL (native, no `pg` at runtime)  →  PostgreSQL
```

---

## 2. Request lifecycle

### An authenticated API call (`GET /api/notes`)

1. Browser issues `fetch` (via `api.notes.$get()`); the `better-auth.session_token`
   cookie rides along automatically (same-origin in prod; Vite proxy keeps it
   same-origin in dev).
2. `secureHeaders()` and `cors()` run. CORS only matters cross-origin (dev);
   it reflects the request origin only if it's in `TRUSTED_ORIGINS`.
3. The request is **not** under `/api/auth/*`, so Better Auth's catch-all skips it.
4. `notesRoute` matches. Its `.use(requireAuth)` middleware
   (`src/server/lib/auth-middleware.ts`) calls `auth.api.getSession({ headers })`.
   No session → `401 {"error":"Unauthorized"}`. Session → it stashes
   `c.set("user", …)` / `c.set("session", …)`.
5. The handler queries Drizzle, **scoped to `c.get("user").id`**, and returns JSON.
6. Drizzle compiles a parameterized query and runs it through `Bun.SQL`.

### A sign-up (`POST /api/auth/sign-up/email`)

1. Hits the Better Auth catch-all (`auth.handler(c.req.raw)`).
2. Better Auth (via the Drizzle adapter) inserts into `user` + `account`, hashes
   the password, and — because `emailVerification.sendOnSignUp` is true — calls
   our `sendEmail` (`src/server/lib/email.ts`). With no `SMTP_PASS`, the link is
   **logged to the server console** instead of sent.
3. A session row is created and an `HttpOnly`, `SameSite=Lax` session cookie is
   set. (If `REQUIRE_EMAIL_VERIFICATION=true`, sign-*in* is blocked until verified;
   sign-up still returns.)

---

## 3. End-to-end type safety (the mechanism)

Three moving parts, no codegen:

| Where | What |
|---|---|
| `src/server/index.ts` | The app is one chained expression; `export type AppType = typeof app` captures **every** route's method, path, input and output types. |
| `src/client/lib/api.ts` | `hc<AppType>("/")` builds a client whose calls (`api.notes.$post({...})`) are typed from `AppType`. `AppType` is imported with **`import type`**, so zero server code is bundled into the browser. |
| `src/shared/schema.ts` | The same Zod objects validate request bodies on the server (`zValidator`) and forms on the client, and `z.infer` gives both sides the TS types. |

**Rules that keep this working:**
- Keep the app definition in `index.ts` a single chain. Splitting it into
  `app.use(...); app.get(...);` statements drops the accumulated route types and
  silently degrades the client to `any`.
- Never `import` server *values* into client code — only `import type`. The
  `@/shared/*` modules are the only runtime code both sides may import.

---

## 4. Auth (Better Auth)

Configured in `src/server/auth.ts`:

- **Adapter:** `drizzleAdapter(db, { provider: "pg", schema })`. Better Auth's
  models map to the `user` / `session` / `account` / `verification` tables in
  `src/server/db/schema.ts`. The TS field names (`emailVerified`, `accessToken`,
  …) must stay camelCase — the adapter maps them; the DB column strings
  (snake_case) are free to differ.
- **Email + password:** enabled; `requireEmailVerification` from env.
- **Verification & reset:** both wired to `sendEmail` + `emailLayout`. Reset is
  the "Forgot password?" flow in `App.tsx`.
- **Google OAuth:** only registered when `GOOGLE_CLIENT_ID` *and*
  `GOOGLE_CLIENT_SECRET` are set, so the template runs before you configure it.
  The "Continue with Google" button hides itself otherwise.
- **Secret guard:** in production the server refuses to boot if
  `BETTER_AUTH_SECRET` is missing, shorter than 32 chars, or still the template
  placeholder — otherwise session cookies could be forged with a public secret.

`requireAuth` is the gate for your own routes: apply it with `.use(requireAuth)`
on a `new Hono<{ Variables: AuthVariables }>()` group and read `c.get("user")`
downstream.

### Ownership scoping (do not skip)

Every `notes` query filters by the session user on **every verb**:

```ts
.where(and(eq(notes.id, c.req.param("id")), eq(notes.userId, c.get("user").id)))
```

Reads filter by `userId`; writes include the ownership check in the `WHERE`, and
a miss returns `404` (verified: user B gets 404 on user A's note, never data).
`userId` is set from the session on insert and is absent from the update schema,
so a client cannot reassign ownership. **Copy this pattern for any user-owned
resource** — dropping the `userId` predicate is an IDOR.

---

## 5. Database & migrations

- **Runtime** uses Bun's native Postgres client: `new SQL(DATABASE_URL)` wrapped
  by Drizzle's `bun-sql` adapter (`src/server/db/index.ts`). No `pg` dependency
  is loaded at runtime.
- **The migration CLI (`drizzle-kit`) is separate.** It does *not* use Bun.SQL;
  it needs a Node-style Postgres driver, so `pg` is a **devDependency** purely so
  `db:push` / `db:migrate` / `db:studio` can connect. (Without it the commands
  fail with "please install pg/postgres/…".) This is the one non-obvious
  dependency in the stack.

| Command | Uses | When |
|---|---|---|
| `db:push` | drizzle-kit + `pg` | Dev: shove the schema straight into the DB. |
| `db:generate` | drizzle-kit | Author a versioned SQL migration in `drizzle/`. |
| `db:migrate` | drizzle-kit + `pg` | Apply migrations — this is what Docker runs on deploy. |
| `db:studio` | drizzle-kit + `pg` | Browse data. |

drizzle-kit records applied migrations in a `__drizzle_migrations` table inside a
separate **`drizzle` schema** (not `public`) — handy to know when resetting a dev
DB (dropping `public` alone won't make it re-run migrations).

The first migration (`drizzle/0000_*.sql`) is committed and matches the schema
exactly, so `db:migrate` on a fresh DB and `db:push` produce identical tables.

### Adding a Better Auth plugin (organisations, 2FA, passkeys…)

```bash
# 1. add the plugin in src/server/auth.ts
bun run auth:generate        # rewrites src/server/db/auth-schema.ts from the config
# 2. fold the new tables into src/server/db/schema.ts (or import them)
bun run db:generate && bun run db:migrate
```

---

## 6. Adding a feature (the whole loop)

Say you want `projects`:

1. **Table** — add `projects` to `src/server/db/schema.ts` (scope it with a
   `userId` FK + `onDelete: "cascade"`).
2. **Validation/types** — add `createProjectSchema` / `updateProjectSchema` to
   `src/shared/schema.ts` (remember: for the update schema use explicit
   `.optional()` fields, **not** `.partial()` on a schema with `.default()` — that
   footgun silently overwrites defaulted columns; see the comment in that file).
3. **Route** — `src/server/routes/projects.ts`, copy `notes.ts`: `.use(requireAuth)`,
   scope every query to `c.get("user").id`, validate bodies with `zValidator`.
4. **Mount** — add `.route("/api/projects", projectsRoute)` to the chain in
   `src/server/index.ts`. It's now typed in the client automatically.
5. **Use it** — call `api.projects.$get()` / `.$post()` from React; import the
   shared schema for the form. Add to `openapi.yaml` if you want it in `/api/docs`.
6. **Migrate** — `bun run db:push` (dev) or `db:generate && db:migrate`.

---

## 7. Build & deploy

- **Dev** (`bun run dev`): two processes via `concurrently` — Hono on `:3000`
  (`--watch`) and Vite on `:5173`. Vite proxies `/api` → Hono so the browser is
  single-origin and auth cookies work. Open `:5173`.
- **Prod** (`bun run start` / Docker): `NODE_ENV=production`. Hono serves `/api`
  *and* the built SPA from `./dist`; everything is one origin, so `BETTER_AUTH_URL`
  and `TRUSTED_ORIGINS` are typically the same public URL.
- **Dockerfile**: three stages — `deps` (cached install), `build` (`vite build`
  → `/app/dist`), `runtime` (copies `node_modules` + `dist` + `src` + `drizzle` +
  `openapi.yaml`, drops to the non-root `bun` user, runs `bun src/server/index.ts`).
  `node_modules` includes drizzle-kit so migrations can run at deploy time. The
  `oven/bun` image ships a node fallback bin, so the drizzle-kit CLI runs fine.
- **docker-compose**: Postgres + app; the app's command is
  `bun run db:migrate && bun src/server/index.ts`. `BETTER_AUTH_SECRET` is
  required (`:?`). Postgres is not published to the host.
- **Coolify**: deploy the compose file, or the Dockerfile + a managed Postgres
  with `db:migrate` as a release command. TLS is handled by Coolify's proxy.

---

## 8. Security posture

**Enforced in code:** per-user ownership scoping (no IDOR), parameterized
Drizzle/Bun.SQL queries (no SQL injection), an allowlisted credentialed CORS
config (not wildcard-with-credentials), `HttpOnly` + `SameSite=Lax` session
cookies (CSRF-resistant), default security headers via `secureHeaders()`, a
production boot guard on `BETTER_AUTH_SECRET`, HTML-escaped email templates, and
a non-root container.

**Known limitations to address per-product** (documented, not bugs):
- **Rate limiting** — Better Auth rate-limits `/api/auth/*` in production only,
  and it's in-memory (per-instance). It does **not** cover `/api/notes`. For
  multi-replica prod, add a shared store and/or proxy-level limits.
- **Password policy** — Better Auth's default minimum is 8 chars, no complexity
  or breach checks. Raise `emailAndPassword.minPasswordLength` if needed.
- **Dev secret** — with `NODE_ENV != production` and no secret set, Better Auth
  uses a well-known default; fine for localhost, never for a deployed env.
- **No CSP** — `secureHeaders()` ships without a Content-Security-Policy so it
  doesn't break the Vite bundle or the CDN-loaded Swagger UI. Add one
  (`contentSecurityPolicy: {...}`) when you lock a product down.
- **Change the Postgres password** in `docker-compose.yml` before exposing it
  anywhere beyond a local machine.

---

## 9. Observability & config

- **Config** is validated once at boot in `src/server/env.ts` (zod over
  `process.env`) — a bad deploy fails fast with one aggregated message rather
  than a runtime 500 later. Read `env` / `isProduction` / `trustedOrigins` from
  there on the server; don't reach into `process.env`.
- **Errors** funnel through one seam: the server's `app.onError` (reports +
  generic 500, no stack leak) and `app.notFound` (JSON), `hono/logger` for
  request logs, and a client `<ErrorBoundary>`. All error paths call
  `reportError()` in `src/shared/report.ts` — wire Sentry or self-hosted
  GlitchTip there once and every site reports. No CSP is set by default (so Vite
  + the CDN Swagger UI work); add one when locking a product down.

## 10. Testing & CI

CI (`.github/workflows/ci.yml`) runs `bun install` + `typecheck` + `build` on
every push to `main` and on PRs — green without any secrets. There's no unit
test framework wired in; `bun run typecheck` is the standing correctness gate.
Bun ships a native test runner, so add tests with zero deps:

```ts
// src/server/routes/notes.test.ts
import { test, expect } from "bun:test";
// …spin up the app, assert on responses
```

Run with `bun test`. This boilerplate was battle-tested by standing up a real
Postgres and exercising the full API (health, 401 gating, Better Auth sign-up
with cookies, notes CRUD, per-user IDOR checks, Zod validation, no-SMTP email
logging) — replicate that as integration tests when a product needs them.
