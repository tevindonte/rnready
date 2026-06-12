"use client";

import { useEffect, useState } from "react";

type UseQuizLeaveGuardOptions = {
  enabled: boolean;
  onConfirmLeave?: () => void;
};

export function useQuizLeaveGuard({ enabled, onConfirmLeave }: UseQuizLeaveGuardOptions) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handlePopState = () => {
      window.history.pushState({ quizGuard: true }, "");
      setShowLeaveDialog(true);
      setPendingNavigation(() => () => {
        window.history.back();
      });
    };

    window.history.pushState({ quizGuard: true }, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled]);

  function stay() {
    setShowLeaveDialog(false);
    setPendingNavigation(null);
  }

  function leave() {
    setShowLeaveDialog(false);
    onConfirmLeave?.();
    pendingNavigation?.();
    setPendingNavigation(null);
  }

  return { showLeaveDialog, stay, leave };
}
