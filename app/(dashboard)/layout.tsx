"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, FileText, Home, LogOut, Menu, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { LogoFull, LogoMark } from "@/components/LogoMark";
import { GuestBanner } from "@/components/GuestBanner";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/home", label: "Home", icon: Home, authOnly: true },
  { href: "/quiz/config", label: "Quiz", icon: BookOpen, authOnly: false },
  { href: "/study-guide", label: "Study guide", icon: FileText, authOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, authOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, authOnly: true },
];

function isQuizSession(pathname: string): boolean {
  return /^\/quiz\/(guest|[\w-]+)$/.test(pathname) && !pathname.endsWith("/review");
}

function isMinimalLayout(pathname: string): boolean {
  return pathname.startsWith("/quiz/config") || isQuizSession(pathname);
}

function NavLinks({ onNavigate, isGuest }: { onNavigate?: () => void; isGuest?: boolean }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !isGuest || !item.authOnly);
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/home" && pathname === "/home") ||
          (href !== "/home" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const minimal = isMinimalLayout(pathname);
  const inQuiz = isQuizSession(pathname);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsGuest(!user);
    }
    checkAuth();
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (minimal) {
    return (
      <div className={cn("min-h-screen bg-background", inQuiz && "overflow-hidden")}>
        {children}
        <GuestBanner isGuest={isGuest} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LogoMark size="sm" />
            <span className="font-semibold text-foreground">RNReady</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="border-navy bg-navy text-white">
              <SheetHeader>
                <SheetTitle className="text-white">RNReady</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <NavLinks isGuest={isGuest} />
                {!isGuest && (
                  <Button
                    variant="ghost"
                    className="mt-4 w-full justify-start gap-3 text-slate-400 hover:bg-white/5 hover:text-white"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                )}
                {isGuest && (
                  <Button className="mt-4 w-full" asChild>
                    <Link href="/signup">Sign up free</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-60 shrink-0 bg-navy md:block">
          <div className="sticky top-0 flex h-screen flex-col p-5">
            <div className="mb-8">
              <LogoFull />
              <p className="mt-1 pl-10 text-xs text-slate-500">NCLEX Prep</p>
            </div>
            <NavLinks isGuest={isGuest} />
            <div className="mt-auto space-y-2">
              {isGuest ? (
                <Button className="w-full" asChild>
                  <Link href="/signup">Sign up free</Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-slate-400 hover:bg-white/5 hover:text-white"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>

      <MobileBottomNav isGuest={isGuest} />
      <GuestBanner isGuest={isGuest} />
    </div>
  );
}
