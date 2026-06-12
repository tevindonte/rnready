"use client";

import { useEffect, useState } from "react";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEEDBACK_REASONS, type FeedbackReason } from "@/lib/question-feedback";
import { cn } from "@/lib/utils";

type QuestionFeedbackProps = {
  questionId: string;
  sessionId?: string;
  disabled?: boolean;
};

export function QuestionFeedback({ questionId, sessionId, disabled }: QuestionFeedbackProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | "">("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInitialLoading(true);
    setPanelOpen(false);
    setMessage(null);
    setError(null);
    fetch(`/api/questions/${questionId}/feedback`)
      .then((r) => r.json())
      .then((data) => {
        if (data.feedback?.vote) {
          setVote(data.feedback.vote);
          setReason(data.feedback.reason ?? "");
          setComment(data.feedback.comment ?? "");
        } else {
          setVote(null);
          setReason("");
          setComment("");
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [questionId]);

  async function submitFeedback(payload: {
    vote: "up" | "down";
    reason?: FeedbackReason;
    comment?: string;
  }) {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/questions/${questionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vote: payload.vote,
        reason: payload.reason,
        comment: payload.comment,
        session_id: sessionId,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save feedback");
      return false;
    }

    setVote(data.feedback.vote);
    setReason(data.feedback.reason ?? "");
    setComment(data.feedback.comment ?? "");
    return true;
  }

  async function handleUpvote() {
    if (disabled || loading) return;
    const ok = await submitFeedback({ vote: "up" });
    if (ok) {
      setPanelOpen(false);
      setMessage("Thanks for the feedback.");
    }
  }

  function handleDownvoteClick() {
    if (disabled || loading) return;
    setPanelOpen((open) => !open);
    setMessage(null);
    setError(null);
  }

  async function handleDownvoteSubmit() {
    if (!reason) {
      setError("Pick a reason so we know what to fix.");
      return;
    }
    const ok = await submitFeedback({
      vote: "down",
      reason,
      comment: comment.trim() || undefined,
    });
    if (ok) {
      setPanelOpen(false);
      setMessage("Thanks. We'll review this question.");
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center gap-1">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 text-muted-foreground",
            vote === "up" && "bg-emerald-50 text-emerald-700"
          )}
          disabled={disabled || loading}
          aria-label="Good question"
          title="Good question"
          onClick={() => void handleUpvote()}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 text-muted-foreground",
            vote === "down" && "bg-red-50 text-red-700"
          )}
          disabled={disabled || loading}
          aria-label="Report an issue"
          title="Report an issue"
          onClick={handleDownvoteClick}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      {panelOpen && (
        <div className="mt-3 rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-sm font-medium text-foreground">What is wrong with this question?</p>
          <div className="mt-2 space-y-2">
            {FEEDBACK_REASONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name={`feedback-reason-${questionId}`}
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="mt-1"
                />
                {option.label}
              </label>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional details (broken text, drug name, etc.)"
            className="mt-3 min-h-[72px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            maxLength={500}
          />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => void handleDownvoteSubmit()}
            >
              {loading ? "Submitting…" : "Submit feedback"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => setPanelOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && !panelOpen && (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
