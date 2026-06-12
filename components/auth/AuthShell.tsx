import Link from "next/link";
import { Brain, LineChart, Target } from "lucide-react";
import { LogoFull } from "@/components/LogoMark";
import { copyrightNotice } from "@/lib/site-meta";

const highlights = [
  { icon: Brain, text: "AI explanations after every answer" },
  { icon: Target, text: "Adaptive drills for your weak areas" },
  { icon: LineChart, text: "Readiness tracking across all 8 NCLEX categories" },
];

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-1/2 flex-col justify-between bg-navy p-12 lg:flex">
        <Link href="/">
          <LogoFull height={44} />
        </Link>

        <div>
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Pass the NCLEX.
            <br />
            First try.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Join nursing students using AI-powered practice to understand the material, not just
            memorize it.
          </p>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-indigo-300" strokeWidth={1.5} />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">{copyrightNotice()}</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center bg-background p-6">
        <div className="mb-8 lg:hidden">
          <LogoFull href="/" height={36} />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
