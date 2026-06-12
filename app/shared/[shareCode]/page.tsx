"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoFull } from "@/components/LogoMark";
import {
  canStartGuestSession,
  startGuestSession,
  type GuestSession,
} from "@/lib/guest";
import type { Question } from "@/lib/constants";

export default function SharedStudyGuidePage({ params }: { params: { shareCode: string } }) {
  const router = useRouter();
  const [guide, setGuide] = useState<{
    id: string;
    title: string;
    question_count: number | null;
    take_count: number;
  } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/shared/${params.shareCode}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setGuide(data.guide);
        setQuestions(data.questions ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.shareCode]);

  async function startQuiz() {
    setStarting(true);
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && guide) {
      const res = await fetch(`/api/study-guides/${guide.id}/retake`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetch(`/api/shared/${params.shareCode}`, { method: "POST" });
        router.push(`/quiz/${data.sessionId}`);
      } else {
        setError(data.error || "Could not start quiz");
        setStarting(false);
      }
      return;
    }

    if (!canStartGuestSession()) {
      setError("Free trial limit reached. Sign up to continue.");
      setStarting(false);
      return;
    }

    const session: GuestSession = {
      id: crypto.randomUUID(),
      mode: "review",
      categoryFilter: null,
      totalQuestions: questions.length,
      startedAt: new Date().toISOString(),
      questions,
      answers: {},
      correct: 0,
      durationSecs: 0,
    };

    if (!startGuestSession(session)) {
      setError("Could not start session");
      setStarting(false);
      return;
    }

    await fetch(`/api/shared/${params.shareCode}`, { method: "POST" });
    router.push("/quiz/guest");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-12">
      <LogoFull href="/" height={28} variant="compact" className="mb-8" />

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : error && !guide ? (
        <p className="text-muted-foreground">{error}</p>
      ) : guide ? (
        <Card>
          <CardHeader>
            <CardTitle>{guide.title}</CardTitle>
            <CardDescription>
              {guide.question_count ?? questions.length} questions
              {guide.take_count > 0 && ` · ${guide.take_count} students have taken this`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="min-h-[48px] w-full" disabled={starting} onClick={startQuiz}>
              {starting ? "Starting…" : "Start quiz"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Free trial applies for guests.{" "}
              <Link href="/signup" className="text-indigo underline">
                Sign up
              </Link>{" "}
              for unlimited access.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
