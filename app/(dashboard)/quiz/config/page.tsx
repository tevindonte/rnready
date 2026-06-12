import { Suspense } from "react";
import { QuizConfigClient } from "@/components/quiz/QuizConfigClient";

function ConfigFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[640px] items-center justify-center px-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function QuizConfigPage() {
  return (
    <Suspense fallback={<ConfigFallback />}>
      <QuizConfigClient />
    </Suspense>
  );
}
