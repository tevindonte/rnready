import { LANDING_FAQ } from "@/lib/seo";

export function LandingFaq() {
  return (
    <section className="border-t border-border bg-white py-16" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-6">
        <h2 id="faq-heading" className="text-center text-2xl font-semibold text-foreground">
          NCLEX prep FAQ
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          Common questions about practicing for the NCLEX with RNReady.
        </p>
        <dl className="mt-10 space-y-6">
          {LANDING_FAQ.map((item) => (
            <div key={item.question} className="rounded-xl border border-border p-5">
              <dt className="text-base font-semibold text-foreground">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
