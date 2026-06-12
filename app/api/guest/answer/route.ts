import { NextResponse } from "next/server";
import {
  applyGuestCookie,
  getGuestIdFromCookieHeader,
  getOrCreateGuestUsage,
  guestUsagePayload,
  recordGuestAnswerServer,
} from "@/lib/guest-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieGuestId = getGuestIdFromCookieHeader(request.headers.get("cookie"));
  if (!cookieGuestId) {
    return NextResponse.json({ error: "Guest session not found" }, { status: 401 });
  }

  const body = await request.json();
  const questionId = body.question_id as string | undefined;
  if (!questionId) {
    return NextResponse.json({ error: "question_id required" }, { status: 400 });
  }

  const { guestId } = await getOrCreateGuestUsage(cookieGuestId);
  const { usage: updated, recorded } = await recordGuestAnswerServer(guestId, questionId);

  const response = NextResponse.json({ ...guestUsagePayload(updated), recorded });
  return applyGuestCookie(response, guestId);
}
