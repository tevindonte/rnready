"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TutorMessage } from "@/lib/ai-tutor";

type TutorChatProps = {
  sessionId: string;
  questionId: string;
  enabled: boolean;
};

export function TutorChat({ sessionId, questionId, enabled }: TutorChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [remaining, setRemaining] = useState(10);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !enabled) return;
    fetch(`/api/tutor?session_id=${sessionId}&question_id=${questionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      })
      .catch(() => {});
  }, [open, enabled, sessionId, questionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!enabled) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
        <p className="text-sm text-muted-foreground">
          AI tutor follow-ups are included with{" "}
          <Link href="/settings#subscription" className="font-medium text-indigo hover:underline">
            RNReady Plus
          </Link>
          .
        </p>
      </div>
    );
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || remaining <= 0) return;

    setLoading(true);
    setError(null);
    setInput("");

    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
        message: text,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not send message");
      setInput(text);
      return;
    }

    setMessages(data.messages ?? []);
    setRemaining(data.remaining ?? 0);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 min-h-[44px]"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Ask a follow-up
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-slate-50">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-medium text-foreground">AI tutor</p>
        <p className="text-xs text-muted-foreground">{remaining} messages left</p>
      </div>

      <div className="max-h-40 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask why an option is wrong, request a simpler explanation, etc.
          </p>
        )}
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={
              msg.role === "user"
                ? "ml-6 rounded-lg bg-white px-3 py-2 text-sm text-foreground"
                : "mr-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-foreground"
            }
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-3 pb-2 text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this question…"
          className="min-h-[44px]"
          disabled={loading || remaining <= 0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 shrink-0"
          disabled={loading || remaining <= 0 || !input.trim()}
          onClick={() => void sendMessage()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
