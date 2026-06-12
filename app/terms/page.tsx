import { LegalShell } from "@/components/legal/LegalShell";
import { CONTACT_EMAIL } from "@/lib/site-meta";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>Last updated: June 2026</p>
      <p>
        RNReady provides NCLEX preparation tools including practice questions, analytics, and
        AI-generated explanations. By using RNReady, you agree to these terms.
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
