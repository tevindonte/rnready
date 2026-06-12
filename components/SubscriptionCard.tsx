"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileEntitlements } from "@/lib/entitlements";

const PAID_FEATURES = [
  "Unlimited custom study guides",
  "AI tutor chat (coming soon)",
  "Re-explain rationales on demand (coming soon)",
  "Audio rationales (coming soon)",
];

export function SubscriptionCard() {
  const searchParams = useSearchParams();
  const [entitlements, setEntitlements] = useState<ProfileEntitlements | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setMessage("Payment received — your account should unlock within a few seconds.");
    } else if (checkout === "cancelled") {
      setMessage("Checkout cancelled. You can upgrade anytime.");
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch("/api/entitlements").then((r) => r.json()),
      fetch("/api/stripe/status").then((r) => r.json()),
    ])
      .then(([entData, stripeData]) => {
        if (entData.entitlements) setEntitlements(entData.entitlements);
        setStripeReady(Boolean(stripeData.configured));
      })
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout() {
    setBusy("checkout");
    setError(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Could not start checkout");
      return;
    }
    window.location.href = data.url;
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Could not open billing portal");
      return;
    }
    window.location.href = data.url;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isPaid = entitlements?.isPaid ?? false;

  return (
    <Card id="subscription">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-medium text-foreground">RNReady Plus</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPaid
                ? "You have an active subscription. Paid AI features unlock as we ship them."
                : "Upgrade for unlimited study guides and upcoming AI tutor features."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-sm font-medium text-foreground">
            Status:{" "}
            <span className={isPaid ? "text-emerald" : "text-muted-foreground"}>
              {entitlements?.subscriptionStatus ?? "free"}
            </span>
          </p>
          {!isPaid && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {PAID_FEATURES.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          )}
        </div>

        {message && <p className="text-sm text-emerald">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!stripeReady ? (
          <p className="text-sm text-muted-foreground">
            Stripe is not configured yet. Add test keys to `.env.local` and redeploy to try checkout.
          </p>
        ) : isPaid ? (
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            disabled={busy === "portal"}
            onClick={() => void openPortal()}
          >
            {busy === "portal" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening billing portal…
              </>
            ) : (
              "Manage subscription"
            )}
          </Button>
        ) : (
          <Button className="w-full min-h-[44px]" disabled={busy === "checkout"} onClick={() => void startCheckout()}>
            {busy === "checkout" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Stripe…
              </>
            ) : (
              "Upgrade with Stripe"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
