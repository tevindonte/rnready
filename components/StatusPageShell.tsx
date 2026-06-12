import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusPageShellProps = {
  code: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function StatusPageShell({
  code,
  title,
  description,
  action,
  className,
}: StatusPageShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      <header className="border-b border-border bg-white px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark size="sm" />
          <span className="text-base font-semibold text-foreground">RNReady</span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo">{code}</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {action ?? (
            <>
              <Button asChild>
                <Link href="/home">Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
