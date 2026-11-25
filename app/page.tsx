import Link from "next/link";
import { ArrowRight, CalendarRange, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { Logo, seriesColor } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { DemoButton } from "@/components/demo-button";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BudgetMeter } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

const PREVIEW = [
  { name: "Needs", pct: 50, spent: 196_000, target: 250_000, color: 1 },
  { name: "Wants", pct: 30, spent: 128_500, target: 150_000, color: 2, risk: true },
  { name: "Savings", pct: 20, spent: 60_000, target: 100_000, color: 3 },
];

const FEATURES = [
  {
    icon: CalendarRange,
    title: "Every month starts fresh",
    body: "Record income, and Kudi splits it across your categories. Look back at any month to see how it really went.",
  },
  {
    icon: Gauge,
    title: "Early warnings",
    body: "Kudi projects each category to month-end, so you hear about overspending on the 12th, not the 30th.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Your data sits in Postgres behind row-level security. Only you can read your transactions.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <ThemeToggle />
          <Link href={signedIn ? "/dashboard" : "/login"} className={buttonClasses("secondary", "sm")}>
            {signedIn ? "Open app" : "Sign in"}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <Badge tone="brand" className="mb-5">
              Budgeting for real life
            </Badge>
            <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Give every naira a job.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-pretty text-ink-2">
              Kudi turns your income into a plan: split it across categories, log spending as it happens, and see
              the overspend coming before it lands.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
              <Link href={signedIn ? "/dashboard" : "/login"} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
                {signedIn ? "Go to your dashboard" : "Start budgeting, free"} <ArrowRight />
              </Link>
              {!signedIn && <DemoButton className="w-full sm:w-auto" />}
            </div>
            {!signedIn && (
              <p className="mt-3 text-[13px] text-ink-3">The demo needs no sign-up. You get a private account with 6 months of sample data.</p>
            )}
          </div>

          {/* Product preview */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-[40px] opacity-60 blur-3xl"
              style={{ background: "radial-gradient(closest-side, var(--brand-soft), transparent)" }}
            />
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] text-ink-3">November · day 18 of 30</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">{formatCurrency(115_500)}</p>
                  <p className="text-[13px] text-ink-3">left to spend · ≈ {formatCurrency(8_885)}/day</p>
                </div>
                <Badge tone="warn">
                  <TrendingUp /> Wants on pace to overspend
                </Badge>
              </div>
              <ul className="mt-6 space-y-4">
                {PREVIEW.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="size-2.5 rounded-full" style={{ background: seriesColor(c.color) }} />
                        {c.name}
                        <span className="text-[12px] font-normal text-ink-3">{c.pct}%</span>
                      </span>
                      <span className="text-[13px] text-ink-3 tabular-nums">
                        {formatCurrency(c.spent)} / {formatCurrency(c.target)}
                      </span>
                    </div>
                    <BudgetMeter
                      spent={c.spent}
                      target={c.target}
                      color={seriesColor(c.color)}
                      marker={0.6}
                      label={`${c.name} preview`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-surface/50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 sm:py-16 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-1.5 text-sm text-ink-2">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-[13px] text-ink-3 sm:px-6">
        Built with Next.js, Supabase and Tailwind CSS.
      </footer>
    </div>
  );
}
