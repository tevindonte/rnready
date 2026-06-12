import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe";
import { getSupabaseServiceKey } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    configured: isStripeConfigured(),
    hasWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    serviceKeyConfigured: Boolean(getSupabaseServiceKey()),
  });
}
