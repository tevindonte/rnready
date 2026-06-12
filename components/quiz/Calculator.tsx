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

type CalculatorProps = {
  onOpen?: () => void;
  iconOnly?: boolean;
};

export function Calculator({ onOpen, iconOnly }: CalculatorProps) {
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

  const buttons = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"];

  const trigger = iconOnly ? (
    <button
      type="button"
      onClick={() => {
        setOpen(true);
        onOpen?.();
      }}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Calculator"
    >
      <CalcIcon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  ) : (
    <Button variant="outline" size="sm">
      Calculator
    </Button>
  );

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
        <div className="rounded-md bg-muted p-3 text-right font-mono text-2xl">{display}</div>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="secondary" className="col-span-4" onClick={clear}>
            Clear
          </Button>
          {buttons.map((b) => (
            <Button
              key={b}
              variant={["+", "-", "×", "÷", "="].includes(b) ? "default" : "outline"}
              onClick={() => {
                if (b === "=") handleEquals();
                else if (["+", "-", "×", "÷"].includes(b)) handleOp(b);
                else inputDigit(b);
              }}
            >
              {b}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
