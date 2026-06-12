import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizConfigClient } from "@/components/quiz/QuizConfigClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Start NCLEX Practice Session",
  description:
    "Configure your NCLEX RN practice session: review, timed, section, adaptive, missed review, or guest trial. Free to start.",
  path: "/quiz/config",
  keywords: [
    "NCLEX practice session",
    "NCLEX quiz config",
    "free NCLEX questions",
    "NCLEX timed practice",
  ],
});

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
