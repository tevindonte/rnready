"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusPageShell } from "@/components/StatusPageShell";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPageShell
      code="Error"
      title="Something went wrong"
      description="An unexpected error occurred. Try again, or return to your dashboard if the problem persists."
      action={
        <>
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/home">Go to dashboard</Link>
          </Button>
        </>
      }
    />
  );
}
