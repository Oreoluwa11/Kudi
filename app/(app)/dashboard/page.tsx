import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MonthSwitcher } from "@/components/month-switcher";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { CategoryBudgets } from "@/components/category-budgets";
import { TransactionList } from "@/components/transaction-list";
import { LegacyImport } from "@/components/legacy-import";
import { HistoryChart } from "@/components/charts/history-chart";
import { PaceChart } from "@/components/charts/pace-chart";
import { getCategories, getHistory, getProfile, getTransactions } from "@/lib/data";
import { summarizeMonth, type MonthSummary } from "@/lib/finance";
import { getMonth, monthLabel, todayISO } from "@/lib/month";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const month = getMonth(m);
  const current = getMonth();
  const today = todayISO();

  const [profile, categories, transactions, history] = await Promise.all([
    getProfile(),
    getCategories(),
    getTransactions(month),
    getHistory(month),
  ]);

  const currency = profile.currency;
  const summary = summarizeMonth(transactions, categories, month, today);
  const isCurrent = month.key === current.key;
  const isFuture = month.start > today;
  const lastIncome = history.length > 1 ? history[history.length - 2].income : 0;
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <>
      <LegacyImport />

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-3">{isCurrent && firstName ? `Hi ${firstName} 👋` : monthLabel(month)}</p>
          <h1 className="mt-1 text-[22px] leading-tight font-semibold tracking-tight text-balance sm:text-[28px]">
            <Headline summary={summary} currency={currency} month={monthLabel(month)} isCurrent={isCurrent} />
          </h1>
        </div>
        <MonthSwitcher monthKey={month.key} currentKey={current.key} />
      </header>

      {summary.income === 0 ? (
        <IncomePrompt month={monthLabel(month)} monthStart={month.start} lastIncome={lastIncome} currency={currency} />
      ) : null}

      <section aria-label="Month at a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4 [&>*]:min-w-0">
        <Stat label="Income" value={formatCurrency(summary.income, currency)} />
        <Stat
          label="Spent"
          value={formatCurrency(summary.spent, currency)}
          sub={summary.income > 0 ? `${Math.round((summary.spent / summary.income) * 100)}% of income` : undefined}
        />
        <Stat
          label="Planned"
          value={formatCurrency(summary.planned, currency)}
          sub={summary.planned > 0 ? "Bills still to pay" : "Nothing scheduled"}
        />
        <Stat
          label="Left to spend"
          value={formatCurrency(summary.left, currency)}
          tone={summary.left < 0 ? "critical" : "brand"}
          sub={dailyAllowance(summary, month.days, isCurrent, currency)}
        />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Card>
          <CardHeader
            title="Budget"
            description="Spent against each category's share of income"
            action={
              <Link href="/budget" className="text-[13px] font-medium text-brand hover:underline">
                Edit
              </Link>
            }
          />
          <CardBody>
            {summary.income > 0 || summary.spent > 0 ? (
              <CategoryBudgets
                items={summary.categories}
                currency={currency}
                progress={summary.progress}
                showPace={isCurrent}
              />
            ) : (
              <Empty text="Add income to see how much each category can spend." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Spending pace"
            description={isCurrent ? `Day ${summary.elapsedDays} of ${month.days}` : monthLabel(month)}
          />
          <CardBody>
            {isFuture || (summary.income === 0 && summary.spent === 0) ? (
              <Empty text={isFuture ? "This month hasn't started yet." : "No activity this month yet."} />
            ) : (
              <PaceChart data={summary.daily} currency={currency} monthName={monthLabel(month)} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] [&>*]:min-w-0">
        <Card>
          <CardHeader title="Last 6 months" description="Income and spending by month" />
          <CardBody>
            <HistoryChart data={history} currency={currency} selectedKey={month.key} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <Link
                href={`/transactions${m ? `?m=${month.key}` : ""}`}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
              >
                See all <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <CardBody>
            {transactions.length ? (
              <TransactionList
                transactions={transactions.slice(0, 6)}
                categories={categories}
                currency={currency}
                grouped={false}
              />
            ) : (
              <Empty text="No transactions this month." />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Headline({
  summary,
  currency,
  month,
  isCurrent,
}: {
  summary: MonthSummary;
  currency: string;
  month: string;
  isCurrent: boolean;
}) {
  const fmt = (n: number) => formatCurrency(n, currency);
  const over = summary.categories.find((c) => c.status === "over");
  const risk = summary.categories.find((c) => c.status === "at-risk");

  if (summary.income === 0 && summary.spent === 0) return <>Let&apos;s plan {month}.</>;
  if (over)
    return (
      <>
        {over.category.name} is <span className="text-critical">{fmt(-over.remaining)} over</span> budget.
      </>
    );
  if (isCurrent && risk)
    return (
      <>
        At this pace, {risk.category.name} will{" "}
        <span className="text-warn">overspend by {fmt(risk.projected - risk.target)}</span>.
      </>
    );
  if (isCurrent)
    return (
      <>
        You&apos;re on track, with <span className="text-brand">{fmt(Math.max(summary.left, 0))}</span> left to spend.
      </>
    );
  const rate = summary.income > 0 ? Math.round((summary.spent / summary.income) * 100) : 0;
  return (
    <>
      You spent {rate}% of your income in {month}.
    </>
  );
}

function dailyAllowance(s: MonthSummary, days: number, isCurrent: boolean, currency: string) {
  if (!isCurrent || s.left <= 0) return s.left < 0 ? "Over your income" : undefined;
  const remainingDays = days - s.elapsedDays + 1;
  return `≈ ${formatCurrency(s.left / remainingDays, currency)}/day for ${remainingDays} days`;
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "brand" | "critical";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-3.5 sm:p-5",
        tone === "brand" && "border-brand/25 bg-brand-soft",
        tone === "critical" && "border-critical/30 bg-critical-soft",
      )}
    >
      <p
        className={cn(
          "text-[13px] font-medium text-ink-3",
          tone === "brand" && "text-brand-soft-ink",
          tone === "critical" && "text-critical",
        )}
      >
        {label}
      </p>
      <p className="mt-1.5 text-lg leading-tight font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-xl xl:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-[12px] leading-snug text-ink-3">{sub}</p>}
    </div>
  );
}

function IncomePrompt({
  month,
  monthStart,
  lastIncome,
  currency,
}: {
  month: string;
  monthStart: string;
  lastIncome: number;
  currency: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">
        <Wallet className="size-5" />
      </span>
      <div className="flex-1">
        <p className="font-medium">Start {month} by adding your income</p>
        <p className="text-sm text-ink-3">Kudi splits it across your categories so you know what each can spend.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {lastIncome > 0 && (
          <AddTransactionButton
            variant="secondary"
            draft={{ type: "income", amount: lastIncome, description: "Monthly income", occurred_on: monthStart }}
          >
            Same as last month · {formatCurrency(lastIncome, currency, { compact: true })}
          </AddTransactionButton>
        )}
        <AddTransactionButton draft={{ type: "income", occurred_on: monthStart }}>
          <Plus /> Add income
        </AddTransactionButton>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-line px-6 text-center text-sm text-ink-3">
      {text}
    </div>
  );
}
