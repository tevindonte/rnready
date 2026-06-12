import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cost-based tier model:
 * - FREE: one-time AI cost, cached (question bank, rationales, analytics, capped study guides)
 * - PAID: per-use AI cost (tutor chat, re-explain, TTS, unlimited study guides)
 */

export type SubscriptionStatus = "free" | "active" | "cancelled" | "past_due";

export const FREE_TIER_LIMITS = {
  /** Max saved study guides on free tier */
  maxStudyGuides: 3,
  /** Max new study guides created per rolling 7 days */
  studyGuidesPerWeek: 1,
} as const;

export type ProfileEntitlements = {
  subscriptionStatus: SubscriptionStatus;
  isPaid: boolean;
  studyGuides: {
    total: number;
    createdThisWeek: number;
    canCreate: boolean;
    reason?: string;
  };
  features: {
    aiTutorChat: boolean;
    reExplain: boolean;
    ttsRationales: boolean;
    unlimitedStudyGuides: boolean;
  };
};

export function isPaidSubscriber(status: SubscriptionStatus | null | undefined): boolean {
  return status === "active";
}

export function canUseAiTutor(status: SubscriptionStatus | null | undefined): boolean {
  return isPaidSubscriber(status);
}

export function canReExplain(status: SubscriptionStatus | null | undefined): boolean {
  return isPaidSubscriber(status);
}

export function canUseTtsRationales(status: SubscriptionStatus | null | undefined): boolean {
  return isPaidSubscriber(status);
}

export async function getStudyGuideUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ total: number; createdThisWeek: number }> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count: total } = await supabase
    .from("study_guides")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  const { count: createdThisWeek } = await supabase
    .from("study_guides")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", weekAgo.toISOString());

  return {
    total: total ?? 0,
    createdThisWeek: createdThisWeek ?? 0,
  };
}

export function evaluateStudyGuideLimit(
  status: SubscriptionStatus | null | undefined,
  usage: { total: number; createdThisWeek: number }
): { allowed: boolean; reason?: string } {
  if (isPaidSubscriber(status)) return { allowed: true };

  if (usage.total >= FREE_TIER_LIMITS.maxStudyGuides) {
    return {
      allowed: false,
      reason: `Free plan includes up to ${FREE_TIER_LIMITS.maxStudyGuides} study guides. Upgrade for unlimited.`,
    };
  }

  if (usage.createdThisWeek >= FREE_TIER_LIMITS.studyGuidesPerWeek) {
    return {
      allowed: false,
      reason: `Free plan allows ${FREE_TIER_LIMITS.studyGuidesPerWeek} new study guide per week. Upgrade for unlimited.`,
    };
  }

  return { allowed: true };
}

export async function canCreateStudyGuide(
  supabase: SupabaseClient,
  userId: string,
  subscriptionStatus: SubscriptionStatus | null | undefined
): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getStudyGuideUsage(supabase, userId);
  return evaluateStudyGuideLimit(subscriptionStatus, usage);
}

export async function getProfileEntitlements(
  supabase: SupabaseClient,
  userId: string,
  subscriptionStatus: SubscriptionStatus | null | undefined
): Promise<ProfileEntitlements> {
  const isPaid = isPaidSubscriber(subscriptionStatus);
  const usage = await getStudyGuideUsage(supabase, userId);
  const guideCheck = evaluateStudyGuideLimit(subscriptionStatus, usage);

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
      reExplain: isPaid,
      ttsRationales: isPaid,
      unlimitedStudyGuides: isPaid,
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
