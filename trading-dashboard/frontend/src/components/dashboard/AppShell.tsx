"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, History, KeyRound, LayoutDashboard, LogOut, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/control", label: "Contrôle", icon: SlidersHorizontal },
  { href: "/history", label: "Historique", icon: History },
  { href: "/security", label: "Sécurité", icon: KeyRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("td_token");
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-accent/40 bg-accent/10 text-accent">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-lg leading-none tracking-wide text-ink">SignalDesk</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                BTC/USDT · RSI+BB
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm transition",
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-ink-muted hover:bg-canvas-overlay hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 border border-line px-3 py-2 text-xs text-ink-muted transition hover:border-danger/50 hover:text-danger"
          >
            <LogOut className="h-3.5 w-3.5" />
            Quitter
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line/60 px-2 py-1 md:hidden">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-xs",
                  active ? "text-accent" : "text-ink-muted",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl animate-riseIn px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
