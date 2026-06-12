import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseServiceKey } from "@/lib/supabase/env";
import { getStripe, resolveStripeCustomerId, resolveSubscriptionStatus } from "@/lib/stripe";
import type { SubscriptionStatus } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function updateProfileSubscription(params: {
  userId: string;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  requireSupabaseServiceKey();

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    subscription_status: params.subscriptionStatus,
  };
  if (params.stripeCustomerId) updates.stripe_customer_id = params.stripeCustomerId;
  if (params.stripeSubscriptionId !== undefined) {
    updates.stripe_subscription_id = params.stripeSubscriptionId;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", params.userId);
  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

async function resolveUserIdFromSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  if (subscription.metadata?.userId) return subscription.metadata.userId;

  const supabase = createAdminClient();
  const customerId = resolveStripeCustomerId(subscription.customer);
  if (!customerId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile?.id) return profile.id;

  const { data: bySub } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  return bySub?.id ?? null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (userId) {
          await updateProfileSubscription({
            userId,
            subscriptionStatus: "active",
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripeSubscriptionId: subscriptionId ?? null,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(subscription);
        if (!userId) break;

        const subscriptionStatus =
          event.type === "customer.subscription.deleted"
            ? "cancelled"
            : resolveSubscriptionStatus(subscription);

        await updateProfileSubscription({
          userId,
          subscriptionStatus,
          stripeCustomerId: resolveStripeCustomerId(subscription.customer),
          stripeSubscriptionId:
            event.type === "customer.subscription.deleted" ||
            subscription.status === "canceled"
              ? null
              : subscription.id,
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("[stripe webhook]", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
