"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileEntitlements } from "@/lib/entitlements";

const PAID_FEATURES = [
  "Up to 20 custom study guides per month",
  "AI tutor follow-ups in the rationale panel",
  "Listen to questions and explanations (cached audio, on demand)",
];

function readCheckoutParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("checkout");
}

export function SubscriptionCard() {
  const [entitlements, setEntitlements] = useState<ProfileEntitlements | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkout" | "portal" | "sync" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);

  async function loadEntitlements(syncStripe = false) {
    if (syncStripe) {
      const syncRes = await fetch("/api/stripe/sync", { method: "POST" });
      const syncData = await syncRes.json();
      if (syncData.synced) {
        setCancelAtPeriodEnd(Boolean(syncData.cancelAtPeriodEnd));
        setCancelAt(typeof syncData.cancelAt === "string" ? syncData.cancelAt : null);
      }
    }

    const [entRes, stripeRes] = await Promise.all([
      fetch("/api/entitlements"),
      fetch("/api/stripe/status"),
    ]);
    const entData = await entRes.json();
    const stripeData = await stripeRes.json();

    if (entData.entitlements) setEntitlements(entData.entitlements);
    setStripeReady(Boolean(stripeData.configured));
  }

  useEffect(() => {
    const checkout = readCheckoutParam();
    if (checkout === "success") {
      setMessage("Payment received. Syncing your subscription…");
    } else if (checkout === "cancelled") {
      setMessage("Checkout cancelled. You can upgrade anytime.");
    }

    void loadEntitlements(true).finally(() => setLoading(false));
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

  async function refreshSubscription() {
    setBusy("sync");
    setError(null);
    await loadEntitlements(true);
    setBusy(null);
    setMessage("Subscription status refreshed from Stripe.");
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
  const cancelDateLabel = cancelAt
    ? new Date(cancelAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card id="subscription">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-medium text-foreground">RNReady Plus ($9.99/mo)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPaid
                ? "Your Plus subscription is active. AI tutor, audio explanations, and expanded study guides are unlocked."
                : "Upgrade for AI tutor chat, audio explanations, and up to 20 custom study guides per month."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-sm font-medium text-foreground">
            Status:{" "}
            <span className={isPaid ? "text-emerald" : "text-muted-foreground"}>
              {entitlements?.subscriptionStatus ?? "free"}
              {cancelAtPeriodEnd && isPaid && cancelDateLabel
                ? ` (cancels ${cancelDateLabel})`
                : ""}
            </span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {PAID_FEATURES.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
        </div>

        {message && <p className="text-sm text-emerald">{message}</p>}
        {cancelAtPeriodEnd && isPaid && (
          <p className="text-sm text-amber-700">
            Your subscription is set to cancel at the end of the current billing period. Plus
            features stay active until then.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!stripeReady ? (
          <p className="text-sm text-muted-foreground">
            Stripe is not configured yet. Add test keys to `.env.local` and redeploy to try checkout.
          </p>
        ) : isPaid ? (
          <div className="flex flex-col gap-2">
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
            <Button
              variant="ghost"
              className="w-full min-h-[44px]"
              disabled={busy === "sync"}
              onClick={() => void refreshSubscription()}
            >
              {busy === "sync" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing…
                </>
              ) : (
                "Refresh subscription status"
              )}
            </Button>
          </div>
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
