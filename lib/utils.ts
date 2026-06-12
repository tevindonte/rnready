import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function normalizeAnswer(answer: string): string {
  return answer
    .split(",")
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function gradeAnswer(given: string, correct: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(correct);
}
