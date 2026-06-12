"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTouchLayout } from "@/hooks/useTouchLayout";
import { cn } from "@/lib/utils";

type ScratchPadProps = {
  value: string;
  onChange: (value: string) => void;
  iconOnly?: boolean;
  mobileBar?: boolean;
};

function ScratchPadEditor({
  value,
  onChange,
  textareaRef,
  className,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  className?: string;
  onFocus?: () => void;
}) {
  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "w-full resize-none bg-background p-3 text-base focus:outline-none md:text-sm",
        className
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder="Jot down calculations or notes for this question..."
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}

export function ScratchPad({ value, onChange, iconOnly, mobileBar }: ScratchPadProps) {
  const touchLayout = useTouchLayout();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || touchLayout) return;

    function onMove(clientX: number, clientY: number) {
      if (!dragging.current) return;
      setPos({ x: clientX - offset.current.x, y: clientY - offset.current.y });
    }

    function onMouseMove(e: MouseEvent) {
      onMove(e.clientX, e.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) onMove(touch.clientX, touch.clientY);
    }

    function onUp() {
      dragging.current = false;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [open, touchLayout]);

  useEffect(() => {
    if (!open || !touchLayout) return;
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [open, touchLayout]);

  function startDrag(clientX: number, clientY: number) {
    dragging.current = true;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
  }

  function handleTextareaFocus() {
    if (!touchLayout) return;
    window.setTimeout(() => {
      textareaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }

  const trigger = iconOnly ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors",
        mobileBar
          ? "h-11 w-11 text-slate-500 hover:bg-slate-100"
          : "h-11 w-11 text-slate-400 hover:bg-white/10 hover:text-white md:h-9 md:w-9"
      )}
      aria-label="Scratch pad"
    >
      <Eraser className={cn("h-5 w-5", !mobileBar && "md:h-4 md:w-4")} strokeWidth={1.5} />
    </button>
  ) : (
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      Scratch pad
    </Button>
  );

  if (!open) return trigger;

  if (touchLayout) {
    return (
      <>
        <div
          className="fixed inset-0 z-[60] bg-black/30"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-label="Scratch pad"
          className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[min(55vh,360px)] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Scratch pad</p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange("")}
                aria-label="Clear notes"
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
          <ScratchPadEditor
            value={value}
            onChange={onChange}
            textareaRef={textareaRef}
            className="min-h-[160px] flex-1"
            onFocus={handleTextareaFocus}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed z-50 w-72 rounded-lg border border-border bg-background shadow-lg"
        style={{ left: pos.x, top: pos.y }}
        role="dialog"
        aria-label="Scratch pad"
      >
        <div
          className="flex cursor-move touch-none items-center justify-between border-b px-2 py-1"
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) startDrag(touch.clientX, touch.clientY);
          }}
        >
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <GripVertical className="h-3 w-3" />
            Scratch pad
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange("")}
              aria-label="Clear notes"
            >
              <Eraser className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
        <ScratchPadEditor
          value={value}
          onChange={onChange}
          textareaRef={textareaRef}
          className="h-40 rounded-b-lg"
        />
      </div>
    </>
  );
}
