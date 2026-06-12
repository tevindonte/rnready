import { LegalShell } from "@/components/legal/LegalShell";
import { CONTACT_EMAIL } from "@/lib/site-meta";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>Last updated: June 2026</p>
      <p>
        RNReady respects your privacy. This policy describes what we collect and how we use it when
        you use our NCLEX prep platform.
      </p>
      <h2 className="text-base font-semibold text-foreground">Information we collect</h2>
      <p>
        Account information (email, name), quiz session data (answers, scores, timestamps), and
        optional profile settings such as your exam date. Guest trial usage may be tracked with an
        anonymous cookie to enforce free-tier limits.
      </p>
      <h2 className="text-base font-semibold text-foreground">How we use data</h2>
      <p>
        To provide the service, personalize your study experience, generate analytics, and improve
        question quality. We use Supabase for authentication and data storage.
      </p>
      <h2 className="text-base font-semibold text-foreground">AI features</h2>
      <p>
        When you request AI explanations or generate study-guide questions, relevant question or
        note content may be sent to our AI provider to produce a response.
      </p>
      <h2 className="text-base font-semibold text-foreground">Data retention</h2>
      <p>
        We retain account and session data while your account is active. You may request deletion by
        contacting support.
      </p>
      <h2 className="text-base font-semibold text-foreground">Contact</h2>
      <p>
        Privacy questions or data deletion requests? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalShell>
  );
}
