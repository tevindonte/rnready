"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NCLEX_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30];

export default function StudyGuidePage() {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          question_count: count,
          category: category || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      router.push(`/quiz/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create study guide</h1>
        <p className="text-muted-foreground">
          Paste your class notes or textbook excerpts — we&apos;ll generate a personalized quiz.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your notes</CardTitle>
          <CardDescription>
            Up to 6,000 words. Facts, definitions, and comparisons work best.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-[240px] w-full rounded-md border border-input bg-background p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Paste notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{wordCount} / 6000 words</p>

          <div className="space-y-2">
            <Label htmlFor="category">NCLEX category (optional)</Label>
            <select
              id="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Auto-detect from content</option>
              {NCLEX_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Number of questions</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNTS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={count === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            className="w-full min-h-[44px]"
            disabled={loading || notes.trim().length < 50 || wordCount > 6000}
            onClick={handleGenerate}
          >
            {loading ? "Generating quiz… (10–30 sec)" : "Generate quiz"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
