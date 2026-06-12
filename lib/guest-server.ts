import type { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_MAX_QUESTIONS } from "@/lib/guest";

export const GUEST_ID_COOKIE = "rnready_gid";

export type GuestUsageRow = {
  id: string;
  questions_answered: number;
  exhausted: boolean;
  answered_question_ids: string[];
};

export function getGuestIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${GUEST_ID_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(GUEST_ID_COOKIE.length + 1)) || null;
}

export async function getGuestIdFromCookies(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store.get(GUEST_ID_COOKIE)?.value ?? null;
}

export async function getOrCreateGuestUsage(guestId?: string | null): Promise<{
  guestId: string;
  usage: GuestUsageRow;
}> {
  const admin = createAdminClient();
  let id = guestId ?? crypto.randomUUID();

  const { data: existing } = await admin
    .from("guest_usage")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existing) {
    return { guestId: id, usage: existing as GuestUsageRow };
  }

  const { data: created, error } = await admin
    .from("guest_usage")
    .insert({ id })
    .select("*")
    .single();

  if (error || !created) {
    id = crypto.randomUUID();
    const { data: retry } = await admin.from("guest_usage").insert({ id }).select("*").single();
    return { guestId: id, usage: retry as GuestUsageRow };
  }

  return { guestId: id, usage: created as GuestUsageRow };
}

export function guestUsagePayload(usage: GuestUsageRow) {
  const remaining = Math.max(0, GUEST_MAX_QUESTIONS - usage.questions_answered);
  const gated = usage.exhausted || usage.questions_answered >= GUEST_MAX_QUESTIONS;
  return {
    remaining,
    questionsAnswered: usage.questions_answered,
    exhausted: usage.exhausted,
    gated,
    maxQuestions: GUEST_MAX_QUESTIONS,
  };
}

export async function recordGuestAnswerServer(
  guestId: string,
  questionId: string
): Promise<{ usage: GuestUsageRow; recorded: boolean }> {
  const admin = createAdminClient();
  const { data: usage } = await admin.from("guest_usage").select("*").eq("id", guestId).single();

  if (!usage) throw new Error("Guest usage not found");

  const row = usage as GuestUsageRow;
  if (row.exhausted || row.questions_answered >= GUEST_MAX_QUESTIONS) {
    return { usage: row, recorded: false };
  }

  if (row.answered_question_ids.includes(questionId)) {
    return { usage: row, recorded: false };
  }

  const answeredIds = [...row.answered_question_ids, questionId];
  const questionsAnswered = row.questions_answered + 1;
  const exhausted = questionsAnswered >= GUEST_MAX_QUESTIONS;

  const { data: updated } = await admin
    .from("guest_usage")
    .update({
      answered_question_ids: answeredIds,
      questions_answered: questionsAnswered,
      exhausted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestId)
    .select("*")
    .single();

  return { usage: updated as GuestUsageRow, recorded: true };
}

export async function completeGuestUsageServer(guestId: string): Promise<GuestUsageRow> {
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("guest_usage")
    .update({ exhausted: true, updated_at: new Date().toISOString() })
    .eq("id", guestId)
    .select("*")
    .single();

  return updated as GuestUsageRow;
}

export function applyGuestCookie<T extends NextResponse>(response: T, guestId: string): T {
  response.cookies.set(GUEST_ID_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
