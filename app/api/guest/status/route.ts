import { NextResponse } from "next/server";
import {
  applyGuestCookie,
  getGuestIdFromCookieHeader,
  getOrCreateGuestUsage,
  guestUsagePayload,
} from "@/lib/guest-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieGuestId = getGuestIdFromCookieHeader(request.headers.get("cookie"));
  const { guestId, usage } = await getOrCreateGuestUsage(cookieGuestId);
  const response = NextResponse.json(guestUsagePayload(usage));
  return applyGuestCookie(response, guestId);
}
