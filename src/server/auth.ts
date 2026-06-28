import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendEmail, emailLayout } from "./lib/email";
import { env, trustedOrigins } from "./env";

const googleId = env.GOOGLE_CLIENT_ID;
const googleSecret = env.GOOGLE_CLIENT_SECRET;

// Verification is on by default. Locally, with no SMTP configured, the email
// module logs the link to the console so you can still complete the flow.
const requireEmailVerification = env.REQUIRE_EMAIL_VERIFICATION === "true";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  // The production secret guard lives in ./env (fails closed at boot).
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password: ${url}`,
        html: emailLayout(
          "Reset your password",
          "Click the button below to choose a new password. This link expires in 1 hour. If you didn't request this, you can ignore this email.",
          { url, label: "Reset password" }
        ),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Verify your email: ${url}`,
        html: emailLayout(
          "Verify your email",
          "Welcome! Confirm your email address to finish setting up your account.",
          { url, label: "Verify email" }
        ),
      });
    },
  },
  // Google is only enabled when both credentials are present, so the boilerplate
  // runs fine before you've set them up.
  socialProviders:
    googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : undefined,
});

export type Session = typeof auth.$Infer.Session;
