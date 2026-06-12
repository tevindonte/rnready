import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, name")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: profile?.name ?? undefined,
    metadata: { userId: user.id },
  });

  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  return customer.id;
}
