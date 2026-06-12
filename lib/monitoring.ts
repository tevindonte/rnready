/** Error reporting — logs locally; wire SENTRY_DSN + @sentry/nextjs for production. */

type ErrorContext = Record<string, unknown>;

export async function captureServerException(error: unknown, context?: ErrorContext) {
  console.error("[server error]", error, context ?? "");
}

export function captureClientException(error: unknown, context?: ErrorContext) {
  console.error("[client error]", error, context ?? "");
}
