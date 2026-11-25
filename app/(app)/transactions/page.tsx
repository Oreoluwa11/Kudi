import type { Metadata } from "next";
import { Plus, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MonthSwitcher } from "@/components/month-switcher";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionList } from "@/components/transaction-list";
import { getCategories, getProfile, getTransactions } from "@/lib/data";
import { getMonth, monthLabel } from "@/lib/month";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Transactions" };

type Search = { m?: string; q?: string; type?: string; category?: string };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const month = getMonth(params.m);
  const current = getMonth();
  const filters = { q: params.q?.slice(0, 100), type: params.type, category: params.category };
  const filtered = Boolean(filters.q || filters.type || filters.category);

  const [profile, categories, transactions] = await Promise.all([
    getProfile(),
    getCategories(),
    getTransactions(month, filters),
  ]);

  const income = transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Transactions</h1>
          <p className="mt-1 text-sm text-ink-3 tabular-nums">
            <span className="whitespace-nowrap">
              {transactions.length} {filtered ? "matching" : ""} in {monthLabel(month)}
            </span>{" "}
            · <span className="whitespace-nowrap text-good">+{formatCurrency(income, profile.currency)}</span> ·{" "}
            <span className="whitespace-nowrap">−{formatCurrency(expenses, profile.currency)}</span>
          </p>
        </div>
        <MonthSwitcher monthKey={month.key} currentKey={current.key} />
      </header>

      <Card className="p-4 sm:p-5">
        <TransactionFilters categories={categories} />
        <div className="mt-5">
          {transactions.length ? (
            <TransactionList transactions={transactions} categories={categories} currency={profile.currency} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-3">
                <Receipt className="size-5" />
              </span>
              <div>
                <p className="font-medium">{filtered ? "No matches" : "Nothing recorded yet"}</p>
                <p className="text-sm text-ink-3">
                  {filtered ? "Try a different search or filter." : `Add the first transaction for ${monthLabel(month)}.`}
                </p>
              </div>
              {!filtered && (
                <AddTransactionButton variant="secondary" size="sm" draft={{ occurred_on: month.key === current.key ? undefined : month.start }}>
                  <Plus /> Add transaction
                </AddTransactionButton>
              )}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
