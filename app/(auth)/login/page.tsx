import { Suspense } from "react";
import { LoginClient } from "@/components/auth/LoginClient";

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
