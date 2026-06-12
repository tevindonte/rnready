"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { NCLEX_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { QuestionStyle } from "@/lib/extraction";

const QUESTION_COUNTS = [5, 10, 15, 20, 25, 30];
const QUESTION_STYLES: {
  value: QuestionStyle;
  label: string;
  example: string;
  hint: string;
  recommended?: boolean;
}[] = [
  {
    value: "nclex_scenario",
    label: "NCLEX-style scenarios",
    example: '"A nurse is caring for a client who..."',
    hint: "Best for clinical content and case-based reasoning practice",
  },
  {
    value: "direct_recall",
    label: "Direct recall",
    example: '"What is the normal range for potassium?"',
    hint: "Best for definitions, lab values, drug facts, and quick review",
  },
  {
    value: "mixed",
    label: "Mixed",
    example: "AI picks the best format per question",
    hint: "Safest general-purpose default for mixed note types",
    recommended: true,
  },
];
const TABS = [
  { id: "text", label: "Paste text" },
  { id: "file", label: "Upload file" },
  { id: "link", label: "Paste link" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function suggestTitleFromNotes(notes: string): string {
  const firstLine = notes.trim().split(/\n/)[0]?.trim() ?? "";
  return firstLine.slice(0, 80);
}

export function StudyGuideClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleTouchedRef = useRef(false);
  const [tab, setTab] = useState<TabId>("text");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [questionStyle, setQuestionStyle] = useState<QuestionStyle>("mixed");
  const [count, setCount] = useState(10);
  const [title, setTitle] = useState("");
  const [saveGuide, setSaveGuide] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (titleTouchedRef.current || tab !== "text" || !notes.trim()) return;
    setTitle(suggestTitleFromNotes(notes));
  }, [notes, tab]);

  useEffect(() => {
    titleTouchedRef.current = false;
    setTitle("");
  }, [tab]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      let res: Response;

      if (tab === "file" && file) {
        const form = new FormData();
        form.append("file", file);
        form.append("question_count", String(count));
        form.append("question_style", questionStyle);
        form.append("save", String(saveGuide));
        if (category) form.append("category", category);
        if (title.trim()) form.append("title", title.trim());

        res = await fetch("/api/study-guide", { method: "POST", body: form });
      } else {
        res = await fetch("/api/study-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: tab === "text" ? notes : undefined,
            url: tab === "link" ? url : undefined,
            question_count: count,
            question_style: questionStyle,
            category: category || undefined,
            title: title.trim() || undefined,
            save: saveGuide,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      router.push(`/quiz/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const canGenerate =
    tab === "text"
      ? notes.trim().length >= 50 && wordCount <= 6000
      : tab === "file"
        ? !!file
        : url.trim().length > 8;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24 md:px-0 md:pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Create study guide</h1>
        <p className="text-muted-foreground">
          Generate a quiz from your notes, slides, videos, or articles.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[44px] flex-1 rounded-md px-3 text-sm font-medium transition-colors",
              tab === t.id ? "bg-indigo text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {tab === "text" && "Your notes"}
            {tab === "file" && "Upload file"}
            {tab === "link" && "Paste link"}
          </CardTitle>
          <CardDescription>
            {tab === "text" && "Up to 6,000 words. Facts, definitions, and comparisons work best."}
            {tab === "file" && "PDF, PowerPoint, Word, or plain text — max 20 MB."}
            {tab === "link" && "YouTube video or article URL."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tab === "text" && (
            <>
              <textarea
                className="min-h-[200px] w-full rounded-md border border-input bg-background p-3 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                placeholder="Paste notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{wordCount} / 6000 words</p>
            </>
          )}

          {tab === "file" && (
            <div
              className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {file ? file.name : "Tap to upload slides, notes, or textbook excerpt"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">.pdf, .pptx, .docx, .txt</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.pptx,.docx,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {tab === "link" && (
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=... or article URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="min-h-[44px] text-base"
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="category">NCLEX category</Label>
            <select
              id="category"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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

          <div className="space-y-3">
            <Label>Question style</Label>
            <div className="space-y-2">
              {QUESTION_STYLES.map((style) => {
                const selected = questionStyle === style.value;
                return (
                  <label
                    key={style.value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                      selected
                        ? "border-indigo bg-indigo-50/60"
                        : "border-border bg-white hover:border-slate-300",
                      style.recommended && !selected && "border-indigo-200"
                    )}
                  >
                    <input
                      type="radio"
                      name="question_style"
                      value={style.value}
                      checked={selected}
                      onChange={() => setQuestionStyle(style.value)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{style.label}</span>
                        {style.recommended && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{style.example}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{style.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
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
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => setCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Name this study guide</Label>
            <Input
              id="title"
              placeholder="e.g. Cardiac meds — Week 4"
              value={title}
              onChange={(e) => {
                titleTouchedRef.current = true;
                setTitle(e.target.value);
              }}
              className="min-h-[44px]"
            />
            <p className="text-xs text-muted-foreground">
              Auto-suggests the first line of pasted notes until you edit this field.
            </p>
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={saveGuide}
              onChange={(e) => setSaveGuide(e.target.checked)}
              className="h-5 w-5 rounded border-input"
            />
            <span className="text-sm">Save to my study guides</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            className="w-full min-h-[48px]"
            disabled={loading || !canGenerate}
            onClick={handleGenerate}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating quiz… (30–90 sec)
              </>
            ) : (
              "Generate quiz →"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
