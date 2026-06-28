# bun-stack

**The Almost a Lab fingerprint** — the boilerplate we fork for every web-app SaaS
prototype. A drop-on-a-server starter for the full open-source TypeScript stack,
batteries included and battle-tested: clone it, rename it, ship the product.

> **Docs:** deep dive in [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) ·
> API reference in [`openapi.yaml`](openapi.yaml) or live Swagger UI at **`/api/docs`** ·
> agent notes in [`CLAUDE.md`](CLAUDE.md).

| Layer | Tool |
|---|---|
| Runtime / package manager | **Bun** |
| HTTP server | **Hono** |
| Database | **PostgreSQL** (via Bun's native `Bun.SQL` driver) |
| ORM / migrations | **Drizzle** |
| Auth | **Better Auth** (email+password, Google OAuth, email verification, password reset) |
| Email | **Nodemailer over SMTP** (defaults to **Resend**) |
| Validation | **Zod** (shared client ↔ server) |
| UI | **React 19** + **Tailwind CSS v4** + **shadcn/ui** |
| Build | **Vite** |

One server process serves both the JSON API and the built React app, so it
deploys as a single container.

---

## How the pieces connect

```
Browser (React + shadcn)
  │  fetch, fully typed via Hono RPC client (src/client/lib/api.ts)
  ▼
Hono server (src/server/index.ts)   [secureHeaders + CORS on every response]
  ├── /api/auth/*       → Better Auth handler  (sign-up / in / out, sessions)
  ├── /api/health       → liveness probe
  ├── /api/docs         → Swagger UI  ·  /api/openapi.yaml → the spec
  ├── /api/notes/*      → your routes, gated by requireAuth middleware
  │                        bodies validated with shared Zod schemas
  └── /*                → built SPA from ./dist (production only)
  ▼
Drizzle ORM  →  Bun.SQL  →  PostgreSQL
```

The same Zod object in `src/shared/schema.ts` validates the request body on the
server **and** the form on the client, and provides the TypeScript types for
both. The frontend's API client imports the server's route *types* only
(`import type`), so you get autocomplete and red squiggles across the network
boundary with zero runtime coupling.

```
src/
├── shared/schema.ts          # Zod schemas + types used by client AND server
├── server/
│   ├── index.ts              # Hono app: CORS, auth handler, routes, static
│   ├── auth.ts               # Better Auth instance (Drizzle adapter)
│   ├── db/
│   │   ├── index.ts          # Drizzle client over Bun.SQL
│   │   └── schema.ts         # auth tables + your tables
│   ├── lib/auth-middleware.ts# requireAuth (401 if no session)
│   ├── lib/email.ts          # SMTP sender (nodemailer → Resend by default)
│   └── routes/notes.ts       # example CRUD, scoped to the logged-in user
└── client/
    ├── App.tsx               # auth gate + notes demo
    ├── lib/auth-client.ts    # Better Auth React client (useSession, signIn…)
    ├── lib/api.ts            # typed Hono RPC client
    └── components/ui/*        # shadcn components
```

---

## Quickstart — local with Docker (the easy path)

Spins up Postgres + the app, runs migrations, serves on `:3000`.

```bash
cp .env.example .env
# set a real secret:
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env
docker compose up --build
```

Open http://localhost:3000.

## Quickstart — local dev (hot reload)

Two processes: Hono on `:3000`, Vite on `:5173` (Vite proxies `/api` to Hono so
the browser stays same-origin and auth cookies work).

```bash
bun install
cp .env.example .env                     # then set BETTER_AUTH_SECRET

# bring up a Postgres however you like, e.g.:
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app -p 5432:5432 postgres:17-alpine

bun run db:push                          # create tables from the schema
bun run dev                              # server + web together
```

Open http://localhost:5173. Bun auto-loads `.env`.

---

## Environment variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Signing secret — **must** be ≥32 random chars |
| `BETTER_AUTH_URL` | Public URL the server is reachable at (cookie issuer) |
| `TRUSTED_ORIGINS` | Comma-separated origins allowed to call the API |
| `REQUIRE_EMAIL_VERIFICATION` | Block sign-in until email verified (default `true`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (button hides if unset) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP server (defaults to Resend) |
| `EMAIL_FROM` | From address (must be on a verified domain) |
| `PORT` | Server port (default 3000) |

In production everything is one origin, so `BETTER_AUTH_URL` and
`TRUSTED_ORIGINS` are typically the same public URL, e.g.
`https://app.example.com`.

## Auth: Google OAuth + email

**Google.** In Google Cloud Console → APIs & Services → Credentials, create an
OAuth client ID (type: Web application). Set the authorized redirect URI to:

```
{BETTER_AUTH_URL}/api/auth/callback/google
# local:  http://localhost:3000/api/auth/callback/google
# prod:   https://app.example.com/api/auth/callback/google
```

Put the client ID/secret in `.env`. The "Continue with Google" button only
renders when both are set.

**Email (Resend SMTP).** Add a domain in Resend, create an API key, then set
`SMTP_PASS` to that key and `EMAIL_FROM` to an address on your verified domain.
The defaults already point `SMTP_HOST/PORT/USER` at Resend. Because it's plain
SMTP, you can swap in SES, Postmark, or self-hosted Postfix by changing those
four vars — no code change.

Email powers two flows out of the box: **verification** (sent on sign-up; with
`REQUIRE_EMAIL_VERIFICATION=true` users must verify before signing in) and
**password reset** (the "Forgot password?" link → reset email → `/reset-password`
page). During local dev with `SMTP_PASS` empty, both emails are **printed to the
server console** with a clickable link, so you can test without a real provider.

---

## Database commands

| Command | What it does |
|---|---|
| `bun run db:generate` | Generate SQL migration files from the schema (offline) |
| `bun run db:migrate` | Apply migration files to the database |
| `bun run db:push` | Push the schema straight to the DB (fast, good for dev) |
| `bun run db:studio` | Open Drizzle Studio |

A first migration is already generated in `drizzle/`. The runtime talks to
Postgres through Bun's native driver, but `drizzle-kit` (the CLI behind these
commands) needs a Node-style driver, so **`pg` ships as a devDependency** purely
for the migration tooling — that's the one non-obvious dependency here.

---

## API documentation

The HTTP API is described in [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0). Run
the app and open **`/api/docs`** for interactive Swagger UI, or load the spec
into any OpenAPI tool. Endpoints: `/api/health`, `/api/notes` CRUD (cookie-auth,
per-user), and the Better Auth `/api/auth/*` surface.

---

## Security & production notes

Enforced out of the box: per-user ownership scoping (no IDOR), parameterized
queries, allowlisted credentialed CORS, `HttpOnly`+`SameSite=Lax` session
cookies, default security headers, a production boot-guard on
`BETTER_AUTH_SECRET` (refuses to start with a missing/short/placeholder secret),
HTML-escaped emails, and a non-root container.

Tune these per product (details in [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md#8-security-posture)):

- **`BETTER_AUTH_SECRET`** must be a unique 32+ char random value in prod
  (`openssl rand -base64 32`). The placeholder will not boot in production.
- **Rate limiting** covers `/api/auth/*` only, in production, in-memory — add a
  shared store / proxy limits for multi-replica deployments and your own routes.
- **Password floor** is 8 chars (Better Auth default); raise if needed.
- **No CSP** by default (so Vite + the CDN Swagger UI work); add one when locking down.
- **Change the Postgres password** in `docker-compose.yml` before exposing it.

---

## Deploying to Coolify

**Option A — Docker Compose resource.** Point Coolify at this repo as a Docker
Compose resource. Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`TRUSTED_ORIGINS` (your public domain) in the Coolify env UI. The bundled
Postgres service and migration step run automatically.

**Option B — Dockerfile + managed Postgres.** Deploy as a Dockerfile resource,
add a Coolify-managed PostgreSQL, and set `DATABASE_URL` to its internal
connection string. Run `bun run db:migrate` as a post-deploy / release command
(or temporarily set the container command to
`sh -c "bun run db:migrate && bun src/server/index.ts"`).

Either way Coolify handles TLS via its reverse proxy, so set `BETTER_AUTH_URL`
to the `https://` domain.

---

## Extending it

**Add a shadcn component:**
```bash
bunx shadcn@latest add dialog
```
(`components.json` is already configured for this layout.)

**Add a Better Auth plugin** (organisations, 2FA, passkeys, …): add it in
`src/server/auth.ts`, then regenerate the auth tables and migrate:
```bash
bun run auth:generate      # rewrites src/server/db/auth-schema.ts
bun run db:generate && bun run db:migrate
```

**Add an API route:** create it in `src/server/routes/`, mount it in
`src/server/index.ts` with `.route("/api/whatever", yourRoute)`, and it's
instantly typed in the frontend RPC client.
