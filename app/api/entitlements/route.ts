import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileEntitlements, type SubscriptionStatus } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_past_due_at")
    .eq("id", user.id)
    .single();

  const entitlements = await getProfileEntitlements(
    supabase,
    user.id,
    (profile?.subscription_status ?? "free") as SubscriptionStatus,
    profile?.subscription_past_due_at
  );

  return NextResponse.json({ entitlements });
}
