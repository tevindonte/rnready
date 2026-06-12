"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type FreemiumGateModalProps = {
  open: boolean;
};

export function FreemiumGateModal({ open }: FreemiumGateModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-[400px] gap-6 rounded-xl border-border p-8 [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3 text-center">
          <DialogTitle className="text-xl font-semibold">
            You&apos;ve used your free questions
          </DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sign up free to unlock unlimited questions, AI explanations, and track your progress
            toward passing the NCLEX.
          </p>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button className="h-12 w-full" asChild>
            <Link href="/signup">Sign up free</Link>
          </Button>
          <Button variant="ghost" className="h-12 w-full" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
