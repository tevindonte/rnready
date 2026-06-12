import Link from "next/link";
import { Brain, BookOpenCheck, LineChart, SlidersHorizontal, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/LogoMark";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatQuestionCount, getSharedQuestionBankStats } from "@/lib/question-bank";

const features = [
  {
    icon: Brain,
    title: "AI Explanations",
    description: "Understand why, not just what",
  },
  {
    icon: Target,
    title: "Adaptive Mode",
    description: "Drills your weak areas automatically",
  },
  {
    icon: LineChart,
    title: "Performance Tracking",
    description: "See exactly where you stand",
  },
];

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Configure",
    description: "Pick your mode, question count, and categories",
  },
  {
    icon: Brain,
    title: "Practice",
    description: "Answer NCLEX-style questions with instant feedback",
  },
  {
    icon: LineChart,
    title: "Track",
    description: "See readiness scores and drill weak areas",
  },
];

export default async function LandingPage() {
  const { sharedTotal } = await getSharedQuestionBankStats(createAdminClient());
  const bankLabel =
    sharedTotal > 0
      ? `${formatQuestionCount(sharedTotal)}+ NCLEX-style questions in our bank`
      : "Growing NCLEX question bank";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size="sm" />
            <span className="text-lg font-semibold text-foreground">RNReady</span>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <p className="mb-4 text-sm font-medium text-indigo">{bankLabel}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-tight">
            Pass the NCLEX. First try.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            AI-powered practice questions with instant explanations. Built for nursing students who
            want to actually understand the material.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="min-w-[200px]" asChild>
              <Link href="/quiz/config">Start practicing free</Link>
            </Button>
            <Button variant="ghost" size="lg" className="min-w-[200px]" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free trial: 10 questions, no credit card required
          </p>
        </section>

        <section className="border-t border-border bg-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="mb-10 text-center text-sm font-medium text-muted-foreground">
              How it works
            </p>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, description }, i) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo text-sm font-semibold text-white">
                    {i + 1}
                  </div>
                  <Icon className="mx-auto mb-3 h-6 w-6 text-indigo" strokeWidth={1.5} />
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16">
          <div className="mx-auto grid max-w-5xl items-center gap-12 px-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Practice like the real exam
              </h2>
              <p className="mt-3 text-muted-foreground">
                Full-width answer cards, question navigation, scratch pad, calculator, and lab
                values, and everything you need on test day.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 shadow-card">
              <p className="text-xs text-muted-foreground">Pharmacology</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                A client receiving IV heparin has an aPTT of 90 seconds. What is the nurse&apos;s
                best action?
              </p>
              <div className="mt-4 space-y-2">
                {[
                  { letter: "A", text: "Continue current infusion rate", selected: false },
                  { letter: "B", text: "Hold the infusion and notify the provider", selected: true },
                  { letter: "C", text: "Increase the infusion rate", selected: false },
                ].map(({ letter, text, selected }) => (
                  <div
                    key={letter}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                      selected
                        ? "border-indigo bg-indigo-50"
                        : "border-border bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        selected ? "bg-indigo text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {letter}
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-white">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="text-center md:text-left">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 md:mx-0">
                  <Icon className="h-6 w-6 text-indigo" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-indigo-50">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-14 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex items-start gap-3">
              <BookOpenCheck className="mt-0.5 h-6 w-6 text-indigo" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Bring your own notes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Signed-in users can paste study notes and generate a custom quiz session.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} RNReady</p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
