"use client";

import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

export function LabValues({ iconOnly }: { iconOnly?: boolean }) {
  const trigger = iconOnly ? (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Lab values"
    >
      <FlaskConical className="h-4 w-4" strokeWidth={1.5} />
    </button>
  ) : (
    <Button variant="outline" size="sm">
      Lab values
    </Button>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Normal lab values</SheetTitle>
        </SheetHeader>
        <Table className="mt-4">
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
      </SheetContent>
    </Sheet>
  );
}
