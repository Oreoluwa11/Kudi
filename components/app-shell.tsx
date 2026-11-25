"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListOrdered, LogOut, PieChart, Plus, Sparkles } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonClasses } from "@/components/ui/button";
import { useTransactionDialog } from "@/components/transaction-dialog";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/budget", label: "Budget", icon: PieChart },
];

export function AppShell({
  name,
  email,
  isDemo,
  children,
}: {
  name: string | null;
  email?: string;
  isDemo?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { open } = useTransactionDialog();
  const initial = (name || email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 px-4 py-5 lg:flex">
        <Link href="/dashboard" className="px-2">
          <Logo />
        </Link>

        <Button className="mt-7 w-full" onClick={() => open()}>
          <Plus /> New transaction
        </Button>

        <nav className="mt-6 space-y-0.5" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active ? "bg-surface-2 text-ink" : "text-ink-3 hover:bg-surface-2/60 hover:text-ink",
                )}
              >
                <Icon className={cn("size-[18px]", active && "text-brand")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-semibold text-brand-soft-ink">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{name || "Your account"}</p>
            <p className="truncate text-[12px] text-ink-3">{isDemo ? "Demo account" : email}</p>
          </div>
          <ThemeToggle className="size-8" />
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="Kudi home">
          <LogoMark className="size-7" />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="inline-flex size-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </header>

      <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
          {isDemo && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center">
              <Sparkles className="hidden size-5 shrink-0 text-brand sm:block" />
              <p className="flex-1 text-sm text-ink-2">
                <span className="font-medium text-ink">You&apos;re exploring a demo.</span> It&apos;s your own private
                copy filled with sample data, so add, edit and delete freely. It&apos;s cleared after a few days.
              </p>
              <form action={signOut}>
                <button type="submit" className={buttonClasses("secondary", "sm", "w-full sm:w-auto")}>
                  Exit demo &amp; create an account
                </button>
              </form>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV.slice(0, 2).map((item) => (
            <MobileLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}
          <button
            type="button"
            onClick={() => open()}
            aria-label="New transaction"
            className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-brand"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-brand-ink shadow-sm">
              <Plus className="size-4" />
            </span>
            Add
          </button>
          <MobileLink {...NAV[2]} active={pathname.startsWith(NAV[2].href)} />
        </div>
      </nav>
    </div>
  );
}

function MobileLink({
  href,
  label,
  icon: Icon,
  active,
}: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium",
        active ? "text-ink" : "text-ink-3",
      )}
    >
      <Icon className={cn("size-5", active && "text-brand")} />
      {label}
    </Link>
  );
}
