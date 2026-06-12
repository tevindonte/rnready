import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/auth/LoginClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign In",
  description: "Sign in to RNReady to track NCLEX readiness, mock exams, analytics, and study guides.",
  path: "/login",
});

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
