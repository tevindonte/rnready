import { NextResponse } from "next/server";
import {
  applyGuestCookie,
  getGuestIdFromCookieHeader,
  getOrCreateGuestUsage,
  completeGuestUsageServer,
  guestUsagePayload,
} from "@/lib/guest-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieGuestId = getGuestIdFromCookieHeader(request.headers.get("cookie"));
  if (!cookieGuestId) {
    return NextResponse.json({ error: "Guest session not found" }, { status: 401 });
  }

  const { guestId } = await getOrCreateGuestUsage(cookieGuestId);
  const usage = await completeGuestUsageServer(guestId);
  const response = NextResponse.json(guestUsagePayload(usage));
  return applyGuestCookie(response, guestId);
}
