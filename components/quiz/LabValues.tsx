"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LAB_VALUES = [
  { test: "Potassium (K+)", range: "3.5–5.0 mEq/L" },
  { test: "Sodium (Na+)", range: "136–145 mEq/L" },
  { test: "Chloride (Cl-)", range: "96–106 mEq/L" },
  { test: "Bicarbonate (HCO3-)", range: "22–28 mEq/L" },
  { test: "Calcium (ionized)", range: "4.5–5.5 mg/dL" },
  { test: "Magnesium (Mg2+)", range: "1.5–2.5 mEq/L" },
  { test: "Phosphorus", range: "2.5–4.5 mg/dL" },
  { test: "Glucose (fasting)", range: "70–100 mg/dL" },
  { test: "BUN", range: "7–20 mg/dL" },
  { test: "Creatinine", range: "0.6–1.2 mg/dL" },
  { test: "Hemoglobin (M)", range: "14–18 g/dL" },
  { test: "Hemoglobin (F)", range: "12–16 g/dL" },
  { test: "Hematocrit (M)", range: "42–52%" },
  { test: "Hematocrit (F)", range: "37–47%" },
  { test: "WBC", range: "4,500–11,000/mm³" },
  { test: "Platelets", range: "150,000–400,000/mm³" },
  { test: "PT", range: "11–13.5 sec" },
  { test: "INR", range: "0.8–1.2" },
  { test: "aPTT", range: "25–35 sec" },
];

function LabTable() {
  return (
    <Table className="px-4 pb-4">
      <TableHeader>
        <TableRow>
          <TableHead>Test</TableHead>
          <TableHead>Normal range</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {LAB_VALUES.map((lab) => (
          <TableRow key={lab.test}>
            <TableCell className="font-medium">{lab.test}</TableCell>
            <TableCell>{lab.range}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type LabValuesProps = {
  iconOnly?: boolean;
  mobileBar?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function LabValues({ iconOnly, mobileBar, open: controlledOpen, onOpenChange }: LabValuesProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        iconOnly
          ? cn(
              "flex items-center justify-center rounded-lg transition-colors",
              mobileBar
                ? "h-11 w-11 text-slate-500 hover:bg-slate-100"
                : "h-11 w-11 text-slate-400 hover:bg-white/10 hover:text-white md:h-9 md:w-9"
            )
          : "inline-flex min-h-[44px] items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"
      )}
      aria-label="Lab values"
    >
      {iconOnly ? (
        <FlaskConical className={cn("h-5 w-5", !mobileBar && "md:h-4 md:w-4")} strokeWidth={1.5} />
      ) : (
        <>
          <FlaskConical className="mr-2 h-4 w-4" />
          Lab values
        </>
      )}
    </button>
  );

  return (
    <>
      {trigger}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Normal lab values">
        <LabTable />
      </BottomSheet>
    </>
  );
}
