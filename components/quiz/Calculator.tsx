"use client";

import { useState } from "react";
import { Calculator as CalcIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTouchLayout } from "@/hooks/useTouchLayout";
import { cn } from "@/lib/utils";

type CalculatorProps = {
  onOpen?: () => void;
  iconOnly?: boolean;
  mobileBar?: boolean;
};

function CalculatorPad({
  display,
  onClear,
  onInput,
  onOp,
  onEquals,
}: {
  display: string;
  onClear: () => void;
  onInput: (d: string) => void;
  onOp: (op: string) => void;
  onEquals: () => void;
}) {
  const buttons = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"];

  return (
    <>
      <div className="rounded-md bg-muted p-3 text-right font-mono text-2xl">{display}</div>
      <div className="grid grid-cols-4 gap-2">
        <Button variant="secondary" className="col-span-4" onClick={onClear}>
          Clear
        </Button>
        {buttons.map((b) => (
          <Button
            key={b}
            variant={["+", "-", "×", "÷", "="].includes(b) ? "default" : "outline"}
            className="h-11"
            onClick={() => {
              if (b === "=") onEquals();
              else if (["+", "-", "×", "÷"].includes(b)) onOp(b);
              else onInput(b);
            }}
          >
            {b}
          </Button>
        ))}
      </div>
    </>
  );
}

export function Calculator({ onOpen, iconOnly, mobileBar }: CalculatorProps) {
  const touchLayout = useTouchLayout();
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [open, setOpen] = useState(false);

  function inputDigit(d: string) {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
    } else {
      setDisplay(display === "0" && d !== "." ? d : display + d);
    }
  }

  function compute(a: number, b: number, operator: string): number {
    switch (operator) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  }

  function handleOp(nextOp: string) {
    const current = parseFloat(display);
    if (prev !== null && op && !fresh) {
      setDisplay(String(compute(prev, current, op)));
      setPrev(compute(prev, current, op));
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    setFresh(true);
  }

  function handleEquals() {
    if (prev === null || !op) return;
    const result = compute(prev, parseFloat(display), op);
    setDisplay(String(result));
    setPrev(null);
    setOp(null);
    setFresh(true);
  }

  function clear() {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  }

  function handleOpen() {
    setOpen(true);
    onOpen?.();
  }

  const trigger = iconOnly ? (
    <button
      type="button"
      onClick={handleOpen}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors",
        mobileBar
          ? "h-11 w-11 text-slate-500 hover:bg-slate-100"
          : "h-11 w-11 text-slate-400 hover:bg-white/10 hover:text-white md:h-9 md:w-9"
      )}
      aria-label="Calculator"
    >
      <CalcIcon className={cn("h-5 w-5", !mobileBar && "md:h-4 md:w-4")} strokeWidth={1.5} />
    </button>
  ) : (
    <Button variant="outline" size="sm" onClick={handleOpen}>
      Calculator
    </Button>
  );

  const pad = (
    <CalculatorPad
      display={display}
      onClear={clear}
      onInput={inputDigit}
      onOp={handleOp}
      onEquals={handleEquals}
    />
  );

  if (touchLayout) {
    return (
      <>
        {trigger}
        {open && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/30"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-label="Calculator"
              className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl border-t border-border bg-background p-4 pb-[env(safe-area-inset-bottom)] shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Calculator</p>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
              {pad}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpen?.();
      }}
    >
      {!iconOnly && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {iconOnly && trigger}
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Calculator</DialogTitle>
        </DialogHeader>
        {pad}
      </DialogContent>
    </Dialog>
  );
}
