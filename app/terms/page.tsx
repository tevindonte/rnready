import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { CONTACT_EMAIL } from "@/lib/site-meta";
import { PAST_DUE_GRACE_DAYS } from "@/lib/subscription-grace";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description:
    "RNReady terms of service, subscription billing, cancellation policy, and acceptable use for NCLEX prep.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>Last updated: June 2026</p>
      <p>
        RNReady provides NCLEX preparation tools including practice questions, analytics, mock exams,
        and AI-generated explanations. By using RNReady, you agree to these terms.
      </p>
      <h2 className="text-base font-semibold text-foreground">Educational use</h2>
      <p>
        RNReady is a study aid and does not guarantee NCLEX passage. Content is for educational
        purposes and is not a substitute for clinical judgment, your nursing program, or official
        NCSBN materials.
      </p>
      <h2 className="text-base font-semibold text-foreground">Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for
        activity under your account.
      </p>
      <h2 className="text-base font-semibold text-foreground">Subscriptions & billing</h2>
      <p>
        RNReady Plus is a recurring monthly subscription billed through Stripe. By subscribing, you
        authorize us to charge your payment method each billing period until you cancel.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Cancellation:</strong> You may cancel anytime from Settings → Manage subscription
          (Stripe Customer Portal). Access continues through the end of the paid period unless
          otherwise required by law.
        </li>
        <li>
          <strong>Failed payments:</strong> If a renewal payment fails, Plus features may be paused
          after a {PAST_DUE_GRACE_DAYS}-day grace period while we retry billing. Update your payment
          method in the billing portal to restore access.
        </li>
        <li>
          <strong>Refunds:</strong> Subscription fees are generally non-refundable except where
          required by applicable law or at our discretion for billing errors. Contact us if you
          believe you were charged in error.
        </li>
        <li>
          <strong>Price changes:</strong> We may change Plus pricing with reasonable notice. Changes
          apply to subsequent billing periods.
        </li>
      </ul>
      <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
      <p>
        Do not scrape, resell, or redistribute question content. Do not attempt to bypass usage
        limits or interfere with the service.
      </p>
      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <p>
        Questions about these terms? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalShell>
  );
}
