/**
 * Central error-reporting seam — called by the server's `onError` and the
 * client's `<ErrorBoundary>`. Today it just logs. Wire your provider in here
 * ONCE (Sentry, self-hosted GlitchTip, ...) and every call site reports
 * automatically — no need to hunt down try/catch blocks.
 *
 *   // server (src/server/index.ts boot):  Sentry.init({ dsn: env.SENTRY_DSN })
 *   // then below:                          Sentry.captureException(error, { extra: context })
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  // ponytail: console only — this is the seam, not the integration.
  console.error("[error]", error, context ?? {});
}
