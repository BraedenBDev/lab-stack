import { z } from "zod";

/**
 * Validated server environment — the single source of config truth.
 *
 * Imported at startup (before auth/db), so a misconfigured deploy fails fast
 * with ONE aggregated message instead of surfacing as a 500 three requests
 * later. Read config from `env` on the server, not `process.env`.
 */
const schema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1, "required — copy .env.example to .env"),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
  TRUSTED_ORIGINS: z.string().default("http://localhost:5173"),
  REQUIRE_EMAIL_VERIFICATION: z.string().default("true"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().default("smtp.resend.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().default("resend"),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("onboarding@resend.dev"),
  PORT: z.coerce.number().default(3000),
});

const parsed = schema.safeParse(process.env);

const problems: string[] = parsed.success
  ? []
  : parsed.error.issues.map((i) => `${i.path.join(".") || "(env)"}: ${i.message}`);

// In production the auth secret must be real: forging-resistant length and not
// the public template placeholder. (Checked here even if the base parse failed.)
if ((process.env.NODE_ENV ?? "development") === "production") {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s || s.length < 32 || s.includes("replace-me")) {
    problems.push(
      "BETTER_AUTH_SECRET: must be a unique 32+ char random value in production " +
        "(generate with: openssl rand -base64 32)"
    );
  }
}

if (problems.length) {
  throw new Error("Invalid environment configuration:\n  - " + problems.join("\n  - "));
}

export const env = parsed.data!;
export const isProduction = env.NODE_ENV === "production";

/** Origins allowed to call the API (CORS + Better Auth). */
export const trustedOrigins = env.TRUSTED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
