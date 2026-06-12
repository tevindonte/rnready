import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPremiumAccess } from "@/lib/subscription-grace";

/**
 * Cost-based tier model:
 * - FREE: one-time AI cost, cached (question bank, rationales, analytics, capped study guides)
 * - PAID: per-use AI (tutor chat, TTS with cache), generous study guide cap
 */

export type SubscriptionStatus = "free" | "active" | "cancelled" | "past_due";

export const FREE_TIER_LIMITS = {
  maxStudyGuides: 3,
  studyGuidesPerWeek: 1,
} as const;

export const PAID_TIER_LIMITS = {
  /** Soft abuse cap — more than any real student needs */
  studyGuidesPerMonth: 20,
} as const;

export const TUTOR_MESSAGES_PER_QUESTION = 10;

export type ProfileEntitlements = {
  subscriptionStatus: SubscriptionStatus;
  isPaid: boolean;
  studyGuides: {
    total: number;
    createdThisWeek: number;
    createdThisMonth: number;
    canCreate: boolean;
    reason?: string;
  };
  features: {
    aiTutorChat: boolean;
    ttsRationales: boolean;
    generousStudyGuides: boolean;
  };
};

export function isPaidSubscriber(
  status: SubscriptionStatus | null | undefined,
  pastDueAt?: string | null
): boolean {
  return hasPremiumAccess(status, pastDueAt ?? null);
}

export function canUseAiTutor(
  status: SubscriptionStatus | null | undefined,
  pastDueAt?: string | null
): boolean {
  return isPaidSubscriber(status, pastDueAt);
}

export function canUseTtsRationales(
  status: SubscriptionStatus | null | undefined,
  pastDueAt?: string | null
): boolean {
  return isPaidSubscriber(status, pastDueAt);
}

export async function getStudyGuideUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ total: number; createdThisWeek: number; createdThisMonth: number }> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { count: total } = await supabase
    .from("study_guides")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  const { count: createdThisWeek } = await supabase
    .from("study_guides")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", weekAgo.toISOString());

  const { count: createdThisMonth } = await supabase
    .from("study_guides")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", monthAgo.toISOString());

  return {
    total: total ?? 0,
    createdThisWeek: createdThisWeek ?? 0,
    createdThisMonth: createdThisMonth ?? 0,
  };
}

export function evaluateStudyGuideLimit(
  status: SubscriptionStatus | null | undefined,
  usage: { total: number; createdThisWeek: number; createdThisMonth: number },
  pastDueAt?: string | null
): { allowed: boolean; reason?: string } {
  if (isPaidSubscriber(status, pastDueAt)) {
    if (usage.createdThisMonth >= PAID_TIER_LIMITS.studyGuidesPerMonth) {
      return {
        allowed: false,
        reason: `Plus plan allows up to ${PAID_TIER_LIMITS.studyGuidesPerMonth} new study guides per month.`,
      };
    }
    return { allowed: true };
  }

  if (usage.total >= FREE_TIER_LIMITS.maxStudyGuides) {
    return {
      allowed: false,
      reason: `Free plan includes up to ${FREE_TIER_LIMITS.maxStudyGuides} study guides. Upgrade for more.`,
    };
  }

  if (usage.createdThisWeek >= FREE_TIER_LIMITS.studyGuidesPerWeek) {
    return {
      allowed: false,
      reason: `Free plan allows ${FREE_TIER_LIMITS.studyGuidesPerWeek} new study guide per week. Upgrade for more.`,
    };
  }

  return { allowed: true };
}

export async function canCreateStudyGuide(
  supabase: SupabaseClient,
  userId: string,
  subscriptionStatus: SubscriptionStatus | null | undefined,
  pastDueAt?: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getStudyGuideUsage(supabase, userId);
  return evaluateStudyGuideLimit(subscriptionStatus, usage, pastDueAt);
}

export async function getProfileEntitlements(
  supabase: SupabaseClient,
  userId: string,
  subscriptionStatus: SubscriptionStatus | null | undefined,
  pastDueAt?: string | null
): Promise<ProfileEntitlements> {
  const isPaid = isPaidSubscriber(subscriptionStatus, pastDueAt);
  const usage = await getStudyGuideUsage(supabase, userId);
  const guideCheck = evaluateStudyGuideLimit(subscriptionStatus, usage, pastDueAt);

  return {
    subscriptionStatus: subscriptionStatus ?? "free",
    isPaid,
    studyGuides: {
      ...usage,
      canCreate: guideCheck.allowed,
      reason: guideCheck.reason,
    },
    features: {
      aiTutorChat: isPaid,
      ttsRationales: isPaid,
      generousStudyGuides: isPaid,
    },
  };
}

export async function touchLastSessionAt(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("profiles")
    .update({ last_session_at: new Date().toISOString() })
    .eq("id", userId);
}

/** @deprecated Use canUseAiTutor — re-explain not shipped yet */
export function canReExplain(status: SubscriptionStatus | null | undefined): boolean {
  return isPaidSubscriber(status);
}

/** @deprecated Use features.generousStudyGuides */
export function unlimitedStudyGuides(status: SubscriptionStatus | null | undefined): boolean {
  return isPaidSubscriber(status);
}
