"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuestionAudioPart } from "@/lib/tts";

type QuestionTtsButtonProps = {
  questionId: string;
  enabled: boolean;
  part: QuestionAudioPart;
  label?: string;
  upsellHint?: string;
  className?: string;
  compact?: boolean;
};

export function QuestionTtsButton({
  questionId,
  enabled,
  part,
  label,
  upsellHint = "Listen with RNReady Plus",
  className,
  compact = false,
}: QuestionTtsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const defaultLabel =
    part === "question" ? "Listen to question" : "Listen to explanation";

  if (!enabled) {
    if (compact) return null;
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        {upsellHint}{" "}
        <Link href="/settings#subscription" className="text-indigo hover:underline">
          Upgrade
        </Link>
        .
      </p>
    );
  }

  async function playAudio() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tts/${questionId}?part=${part}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load audio");

      const audio = new Audio(data.audioUrl);
      setPlaying(true);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        setError("Playback failed");
      };
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not play audio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "icon" : "sm"}
        className={
          compact
            ? "h-9 w-9 shrink-0 text-muted-foreground"
            : "h-9 px-2 text-muted-foreground"
        }
        disabled={loading || playing}
        title={label ?? defaultLabel}
        aria-label={label ?? defaultLabel}
        onClick={() => void playAudio()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Volume2 className={compact ? "h-4 w-4" : "mr-1.5 h-4 w-4"} />
        )}
        {!compact && (playing ? "Playing…" : (label ?? defaultLabel))}
      </Button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
