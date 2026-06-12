"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SessionExitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveForLater: () => void;
  onFinishSession: () => void;
  answeredCount: number;
};

export function SessionExitDialog({
  open,
  onOpenChange,
  onSaveForLater,
  onFinishSession,
  answeredCount,
}: SessionExitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>Leave this session?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Save for later keeps your progress without updating analytics. Finish & review scores
            what you&apos;ve answered so far ({answeredCount} so far).
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full"
            onClick={() => {
              onSaveForLater();
              onOpenChange(false);
            }}
          >
            Save for later
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={answeredCount === 0}
            onClick={() => {
              onFinishSession();
              onOpenChange(false);
            }}
          >
            Finish & review
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Keep going
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
