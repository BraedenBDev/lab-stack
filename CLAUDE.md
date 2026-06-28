# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`bun-stack` is the boilerplate "fingerprint" for **Almost a Lab**'s web-app SaaS prototypes — clone it, rename it, build the product. The whole stack is open-source TypeScript and deploys as **one container**: a single Bun/Hono process serves both the JSON API and the built React SPA.

Stack: **Bun** (runtime + package manager) · **Hono** (server + typed RPC) · **PostgreSQL** via Bun's native `Bun.SQL` driver (no `pg` dep) · **Drizzle** (ORM/migrations) · **Better Auth** (email+password, Google OAuth, verification, reset) · **Nodemailer/SMTP** (Resend by default) · **Zod** (shared validation) · **React 19 + Tailwind v4 + shadcn/ui** · **Vite**.

## Commands

```bash
bun install                 # install deps
bun run dev                 # server (:3000) + Vite (:5173) together — develop here
bun run dev:server          # just the Hono server, --watch
bun run dev:web             # just Vite
bun run typecheck           # tsc --noEmit — the only "test" gate in this repo
bun run build               # vite build → ./dist (the SPA the prod server serves)
bun run start               # NODE_ENV=production, server serves API + ./dist on :3000

bun run db:push             # push schema straight to DB (dev)
bun run db:generate         # generate SQL migration from schema → drizzle/
bun run db:migrate          # apply migrations (used at deploy time)
bun run db:studio           # Drizzle Studio
bun run auth:generate       # regenerate auth tables after adding a Better Auth plugin
```

There is **no test runner and no linter** configured. `bun run typecheck` is the correctness gate — run it after any change. If you add tests, `bun test` is the native runner (no extra deps).

Local DB for dev: `docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app -p 5432:5432 postgres:17-alpine`, then `bun run db:push`. Or `docker compose up --build` for the full app+DB on `:3000`. Both need `.env` (copy `.env.example`, set `BETTER_AUTH_SECRET` to ≥32 random chars).

## Architecture — the load-bearing ideas

**One Hono app, chained, exported as a type.** `src/server/index.ts` builds the app with a single chained `.use().on().get().route()` expression and does `export type AppType = typeof app`. The chaining is not stylistic — breaking it into separate statements **loses the route types**, which breaks the typed client. Keep it chained when adding routes (`.route("/api/whatever", yourRoute)`).

**End-to-end types with zero runtime coupling.** `src/client/lib/api.ts` does `hc<AppType>("/")` importing `AppType` with `import type`, so the frontend gets autocomplete + typechecking across the network boundary but bundles **none** of the server (Hono/Drizzle/Better Auth never reach the client). Don't import server values into client code — only `import type`.

**One Zod object, two sides.** `src/shared/schema.ts` is imported by both the server (`zValidator("json", createNoteSchema)`) and the client (form validation + `z.infer` types). Add new request/response shapes here, never duplicate them per side.

**Auth is a catch-all, order-sensitive.** In `index.ts`: CORS for `/api/*` **must** come before the Better Auth handler, which is mounted as `.on(["POST","GET"], "/api/auth/*", c => auth.handler(c.req.raw))` — it owns every `/api/auth/*` path (sign-up/in/out, sessions, OAuth callbacks, verify, reset). Your own routes live under other `/api/*` prefixes.

**Protected routes use the `requireAuth` middleware** (`src/server/lib/auth-middleware.ts`), which calls `auth.api.getSession()`, 401s if absent, and sets `c.get("user")` / `c.get("session")`. `routes/notes.ts` is the reference pattern: `new Hono<{ Variables: AuthVariables }>().use(requireAuth).get(...)`. **Every query is scoped to `c.get("user").id`** — both reads (`where eq(userId)`) and writes (ownership check in the `and(...)` clause). Copy this scoping for any user-owned resource or you create an IDOR.

**DB schema = Better Auth tables + your tables, in one file.** `src/server/db/schema.ts` holds the four Better-Auth tables (`user`, `session`, `account`, `verification`) plus app tables (`notes`). The auth-table field names must stay camelCase (the adapter maps them); column-name strings can differ. After adding a Better Auth plugin, run `bun run auth:generate` (rewrites `src/server/db/auth-schema.ts`) then `db:generate && db:migrate`.

**Email degrades gracefully.** `src/server/lib/email.ts` returns a null transporter when `SMTP_PASS` is unset and **logs the verification/reset link to the server console** instead of sending — so the full auth flow is testable in local dev with no provider.

**Prod vs dev origin model.** Dev = two origins (Vite :5173 proxies `/api` → Hono :3000) so CORS + same-origin cookies matter. Prod = one origin (Hono serves `/api` and `./dist`), so `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` are typically the same public URL. Static serving in `index.ts` is gated on `isProd`.

## Path aliases

`@/*` → `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`). shadcn is wired to `src/client/components/ui` via `components.json` — add components with `bunx shadcn@latest add <name>`.
