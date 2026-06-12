import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceKey } from "@/lib/supabase/env";
import {
  getStripe,
  isStripeConfigured,
  resolveStripeCustomerId,
  resolveSubscriptionStatus,
} from "@/lib/stripe";
import type { SubscriptionStatus } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  if (!getSupabaseServiceKey()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_KEY is not configured. Add it to .env.local and restart npm run dev.",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({
      subscriptionStatus: (profile?.subscription_status ?? "free") as SubscriptionStatus,
      synced: false,
      reason: "No Stripe customer on file",
    });
  }

  const stripe = getStripe();
  let subscription = null;

  if (profile.stripe_subscription_id) {
    try {
      subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    } catch {
      subscription = null;
    }
  }

  if (!subscription) {
    const list = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 1,
    });
    subscription = list.data[0] ?? null;
  }

  const admin = createAdminClient();
  let subscriptionStatus: SubscriptionStatus = "free";
  let stripeSubscriptionId: string | null = null;

  if (subscription) {
    subscriptionStatus = resolveSubscriptionStatus(subscription);
    stripeSubscriptionId = subscription.status === "canceled" ? null : subscription.id;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: subscriptionStatus,
      stripe_customer_id: resolveStripeCustomerId(subscription?.customer) ?? profile.stripe_customer_id,
      stripe_subscription_id: stripeSubscriptionId,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subscriptionStatus,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    cancelAt: subscription?.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    synced: true,
  });
}
