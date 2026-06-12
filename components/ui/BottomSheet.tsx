"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  heightClass?: string;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  heightClass = "max-h-[60vh]",
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={title}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl pb-[env(safe-area-inset-bottom)]",
          heightClass,
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
