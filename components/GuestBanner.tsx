"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissGuestBanner,
  getRemainingFreeQuestions,
  GUEST_PROGRESS_EVENT,
} from "@/lib/guest";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type GuestBannerProps = {
  isGuest: boolean;
};

export function GuestBanner({ isGuest }: GuestBannerProps) {
  const [remaining, setRemaining] = useState(0);
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(() => {
    if (!isGuest) return;
    try {
      const state = JSON.parse(localStorage.getItem("rnready_guest") ?? "{}");
      if (state.bannerDismissed) {
        setVisible(false);
        return;
      }
      setRemaining(getRemainingFreeQuestions());
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, [isGuest]);

  useEffect(() => {
    refresh();
    window.addEventListener(GUEST_PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(GUEST_PROGRESS_EVENT, refresh);
  }, [refresh]);

  if (!isGuest || !visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex h-8 items-center justify-between gap-3 bg-navy px-4 text-xs text-white md:bottom-0 md:px-6",
        "max-md:bottom-14"
      )}
    >
      <p className="truncate">
        {remaining > 0
          ? `You have ${remaining} free question${remaining === 1 ? "" : "s"} remaining.`
          : "Free questions used."}{" "}
        <Link href="/signup" className="text-indigo-300 hover:text-indigo-200">
          Sign up free to unlock unlimited access
        </Link>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" className="hidden h-6 px-2 text-xs sm:inline-flex" asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
        <button
          type="button"
          onClick={() => {
            dismissGuestBanner();
            setVisible(false);
          }}
          className="rounded p-0.5 text-white/60 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
