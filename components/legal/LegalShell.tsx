import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size="sm" />
            <span className="text-base font-semibold text-foreground">RNReady</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <div className="prose prose-slate mt-8 max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}
