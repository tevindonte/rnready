"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, FileText, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home, authOnly: true },
  { href: "/quiz/config", label: "Quiz", icon: BookOpen, authOnly: false },
  { href: "/study-guide", label: "Notes", icon: FileText, authOnly: true },
  { href: "/analytics", label: "Stats", icon: BarChart3, authOnly: true },
];

type MobileBottomNavProps = {
  isGuest?: boolean;
};

export function MobileBottomNav({ isGuest = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !isGuest || !item.authOnly);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex justify-around py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 text-xs font-medium",
                active ? "text-indigo" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
