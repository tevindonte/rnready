import type { Metadata } from "next";
import Link from "next/link";
import { StatusPageShell } from "@/components/StatusPageShell";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Page Not Found",
  description: "The page you requested could not be found on RNReady.",
  noIndex: true,
});

export default function NotFound() {
  return (
    <StatusPageShell
      code="404"
      title="Page not found"
      description="This page doesn't exist or may have moved. Head back to your dashboard or start a practice session."
      action={
        <>
          <Button asChild>
            <Link href="/quiz/config">Start a quiz</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </>
      }
    />
  );
}
