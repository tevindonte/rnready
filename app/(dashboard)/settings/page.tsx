"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionBankSummary } from "@/components/QuestionBankSummary";

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankTotal, setBankTotal] = useState(0);
  const [customBankTotal, setCustomBankTotal] = useState(0);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setName(data.profile.name ?? "");
          setExamDate(data.profile.exam_date ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/questions/stats")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.sharedTotal === "number") setBankTotal(data.sharedTotal);
        if (typeof data.customTotal === "number") setCustomBankTotal(data.customTotal);
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, exam_date: examDate || null }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and exam date</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_date">NCLEX exam date</Label>
              <Input
                id="exam_date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for your exam countdown on the home dashboard
              </p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {saved && <p className="text-sm text-emerald">Settings saved</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {bankTotal > 0 && (
        <QuestionBankSummary sharedTotal={bankTotal} customTotal={customBankTotal} />
      )}
    </div>
  );
}
