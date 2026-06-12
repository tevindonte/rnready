"use client";

type SessionProgressBarProps = {
  current: number;
  total: number;
};

export function SessionProgressBar({ current, total }: SessionProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-0.5 bg-slate-200">
      <div
        className="h-full bg-indigo transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type ProgressBarProps = {
  current: number;
  total: number;
  correct: number;
  answered: number;
};

export function ProgressBar({ current, total }: ProgressBarProps) {
  return <SessionProgressBar current={current} total={total} />;
}
