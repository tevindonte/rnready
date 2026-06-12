import type { SubscriptionStatus } from "@/lib/entitlements";

export const PAST_DUE_GRACE_DAYS = 7;

export function isWithinPastDueGrace(
  pastDueAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!pastDueAt) return false;
  const started = new Date(pastDueAt);
  if (Number.isNaN(started.getTime())) return false;
  const graceMs = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - started.getTime() <= graceMs;
}

/** Plus access: active subscription, or past_due within grace window. */
export function hasPremiumAccess(
  status: SubscriptionStatus | null | undefined,
  pastDueAt: string | null | undefined,
  now?: Date
): boolean {
  if (status === "active") return true;
  if (status === "past_due" && isWithinPastDueGrace(pastDueAt, now)) return true;
  return false;
}
