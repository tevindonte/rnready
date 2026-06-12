"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Pencil, Share2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StudyGuide = {
  id: string;
  title: string;
  source_type: string | null;
  question_count: number | null;
  is_public: boolean;
  share_code: string | null;
  take_count: number;
  created_at: string;
};

export default function MyStudyGuidesPage() {
  const router = useRouter();
  const [guides, setGuides] = useState<StudyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/study-guides")
      .then((r) => r.json())
      .then((data) => setGuides(data.guides ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function retake(id: string) {
    const res = await fetch(`/api/study-guides/${id}/retake`, { method: "POST" });
    const data = await res.json();
    if (res.ok) router.push(`/quiz/${data.sessionId}`);
  }

  async function toggleShare(id: string) {
    const res = await fetch(`/api/study-guides/${id}/share`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return;
    setGuides((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, is_public: data.is_public, share_code: data.share_code } : g
      )
    );
  }

  function copyLink(code: string, id: string) {
    const url = `${window.location.origin}/shared/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function startRename(guide: StudyGuide) {
    setEditingId(guide.id);
    setEditTitle(guide.title);
    setRenameError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setEditTitle("");
    setRenameError(null);
  }

  async function saveRename(id: string) {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setRenameError("Name cannot be empty");
      return;
    }

    const res = await fetch(`/api/study-guides/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRenameError(data.error || "Failed to rename");
      return;
    }

    setGuides((prev) =>
      prev.map((g) => (g.id === id ? { ...g, title: data.guide.title } : g))
    );
    cancelRename();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24 md:px-0 md:pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My study guides</h1>
          <p className="text-muted-foreground">Re-take or share quizzes you created.</p>
        </div>
        <Button asChild size="sm" className="min-h-[44px]">
          <Link href="/study-guide">New guide</Link>
        </Button>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : guides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No saved study guides yet.</p>
            <Button asChild className="mt-4 min-h-[44px]">
              <Link href="/study-guide">Create your first guide</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {guides.map((guide) => (
            <Card key={guide.id}>
              <CardHeader className="pb-2">
                {editingId === guide.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="min-h-[44px]"
                      autoFocus
                    />
                    {renameError && <p className="text-sm text-red-600">{renameError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" className="min-h-[44px]" onClick={() => saveRename(guide.id)}>
                        <Check className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={cancelRename}>
                        <X className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{guide.title}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px] shrink-0"
                      onClick={() => startRename(guide)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <CardDescription>
                  {guide.question_count ?? 0} questions · {guide.source_type ?? "text"}
                  {guide.is_public && guide.take_count > 0 && (
                    <span> · {guide.take_count} people have taken this</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" className="min-h-[44px]" onClick={() => retake(guide.id)}>
                  Re-take
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => toggleShare(guide.id)}
                >
                  <Share2 className="mr-1 h-4 w-4" />
                  {guide.is_public ? "Sharing on" : "Share"}
                </Button>
                {guide.is_public && guide.share_code && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => copyLink(guide.share_code!, guide.id)}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    {copied === guide.id ? "Copied!" : "Copy link"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
