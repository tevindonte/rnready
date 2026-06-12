"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type FlaggedQuestion = {
  id: string;
  question: string;
  category: string;
  subcategory: string | null;
  source_id: string | null;
  needs_review: boolean;
};

type DownVote = {
  id: string;
  vote: string;
  reason: string | null;
  comment: string | null;
  created_at: string;
  question_id: string;
  questions: {
    question: string;
    category: string;
    needs_review: boolean;
  } | null;
};

export default function AdminQuestionsPage() {
  const [flagged, setFlagged] = useState<FlaggedQuestion[]>([]);
  const [downVotes, setDownVotes] = useState<DownVote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/questions");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not load admin data");
      return;
    }
    setFlagged(data.flaggedQuestions ?? []);
    setDownVotes(data.recentDownVotes ?? []);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function clearReview(questionId: string) {
    await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, needs_review: false }),
    });
    void load();
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Question review</h1>
        <p className="text-sm text-red-500">{error}</p>
        <p className="text-sm text-muted-foreground">
          Set <code className="rounded bg-slate-100 px-1">ADMIN_EMAILS</code> in env to your login
          email.
        </p>
        <Button variant="outline" asChild>
          <Link href="/home">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Question review</h1>
        <p className="text-sm text-muted-foreground">
          Flagged questions and recent down-votes from student feedback.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-base font-medium">Needs review ({flagged.length})</h2>
          {flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flagged questions.</p>
          ) : (
            flagged.map((q) => (
              <div key={q.id} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">
                  {q.category} · {q.source_id ?? "unknown source"}
                </p>
                <p className="mt-2 text-sm text-foreground">{q.question}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void clearReview(q.id)}
                >
                  Clear review flag
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-base font-medium">Recent down-votes</h2>
          {downVotes.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">
                {row.reason} · {new Date(row.created_at).toLocaleString()}
              </p>
              <p className="mt-2 text-sm">{row.questions?.question ?? row.question_id}</p>
              {row.comment && (
                <p className="mt-1 text-xs text-muted-foreground">{row.comment}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
