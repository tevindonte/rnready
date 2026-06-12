"use client";

import { useState } from "react";
import Link from "next/link";
import type { CategoryScore } from "@/lib/adaptive";
import { NCLEX_CATEGORY_SHORT, getReadinessLevel, type NclexCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MasteryHexagonProps = {
  scores: CategoryScore[];
  weightedScore: number;
};

function scoreColor(pct: number, count: number): string {
  if (count === 0) return "#94A3B8";
  if (pct >= 75) return "#10B981";
  if (pct >= 65) return "#F59E0B";
  return "#EF4444";
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function segmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function MasteryHexagon({ scores, weightedScore }: MasteryHexagonProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const level = getReadinessLevel(weightedScore);
  const cx = 160;
  const cy = 160;
  const innerR = 60;
  const maxOuterR = 130;
  const segmentAngle = 360 / scores.length;

  const readinessLabel =
    level === "Likely" ? "Likely Pass" : level === "Borderline" ? "Borderline" : "Needs Work";
  const readinessColor =
    level === "Likely" ? "text-emerald" : level === "Borderline" ? "text-amber-500" : "text-red-500";

  const active = selected;

  return (
    <div className="relative">
      <svg viewBox="0 0 320 320" className="mx-auto h-auto w-full max-w-[320px]">
        {scores.map((s, i) => {
          const startAngle = i * segmentAngle;
          const endAngle = (i + 1) * segmentAngle - 2;
          const fillPct = s.count > 0 ? s.pct / 100 : 0;
          const outerR = innerR + (maxOuterR - innerR) * fillPct;
          const color = scoreColor(s.pct, s.count);
          const isActive = active === i;

          return (
            <g key={s.category}>
              <path
                d={segmentPath(cx, cy, innerR, maxOuterR, startAngle, endAngle)}
                fill="#F1F5F9"
              />
              <path
                d={segmentPath(cx, cy, innerR, maxOuterR, startAngle, endAngle)}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setSelected(i)}
                onMouseLeave={() => setSelected(null)}
                onClick={() => setSelected(isActive ? null : i)}
              />
              {fillPct > 0 && (
                <path
                  d={segmentPath(cx, cy, innerR, outerR, startAngle, endAngle)}
                  fill={color}
                  opacity={isActive ? 1 : 0.85}
                  className="pointer-events-none transition-opacity"
                />
              )}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={innerR - 4} fill="white" />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-2xl font-semibold">
          {weightedScore}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-xs">
          overall
        </text>
      </svg>

      <div className="mt-2 text-center">
        <p className={cn("text-lg font-semibold", readinessColor)}>{readinessLabel}</p>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald" /> ≥75%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 65–74%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> &lt;65%
        </span>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground md:hidden">
        Tap a segment for details
      </p>

      {active !== null && scores[active] && (
        <div className="mt-4 rounded-xl border border-border bg-white p-4 text-center shadow-card">
          <p className="text-sm font-medium text-foreground">{scores[active].category}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {scores[active].count > 0 ? `${scores[active].pct}%` : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">
            {scores[active].count} questions answered
          </p>
          <Button size="sm" className="mt-3" asChild>
            <Link
              href={`/quiz/config?mode=section&category=${encodeURIComponent(scores[active].category)}`}
            >
              Drill this
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-4 hidden gap-1 md:grid md:grid-cols-2">
        {scores.map((s, i) => (
          <button
            key={s.category}
            type="button"
            onClick={() => setSelected(selected === i ? null : i)}
            className={cn(
              "rounded-lg px-2 py-1 text-left text-xs transition-colors",
              selected === i ? "bg-indigo-50 text-indigo" : "text-muted-foreground hover:bg-slate-50"
            )}
          >
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: scoreColor(s.pct, s.count) }}
            />
            {NCLEX_CATEGORY_SHORT[s.category as NclexCategory] ?? s.category}
          </button>
        ))}
      </div>
    </div>
  );
}
