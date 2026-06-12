"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScratchPadProps = {
  value: string;
  onChange: (value: string) => void;
  iconOnly?: boolean;
};

export function ScratchPad({ value, onChange, iconOnly }: ScratchPadProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!open) {
    if (iconOnly) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Scratch pad"
        >
          <Eraser className="h-4 w-4" strokeWidth={1.5} />
        </button>
      );
    }
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Scratch pad
      </Button>
    );
  }

  return (
    <div
      className="fixed z-50 w-72 rounded-lg border bg-background shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex cursor-move items-center justify-between border-b px-2 py-1"
        onMouseDown={(e) => {
          dragging.current = true;
          offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        }}
      >
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <GripVertical className="h-3 w-3" />
          Scratch pad
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange("")}>
            <Eraser className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
      <textarea
        className={cn("h-40 w-full resize-none rounded-b-lg p-3 text-sm focus:outline-none")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notes..."
      />
    </div>
  );
}
