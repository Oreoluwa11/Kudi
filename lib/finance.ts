import type { Category, Transaction } from "@/types/database";
import type { Month } from "./month";

export type CategoryStatus = "ok" | "full" | "at-risk" | "over";

export type CategorySummary = {
  category: Category;
  target: number;
  spent: number;
  planned: number;
  /** Projected month-end spend at the current pace (current month only). */
  projected: number;
  remaining: number;
  status: CategoryStatus;
};

export type MonthSummary = {
  income: number;
  spent: number;
  planned: number;
  left: number;
  /** 0..1 how far through the month we are (1 for past months, 0 for future). */
  progress: number;
  elapsedDays: number;
  categories: CategorySummary[];
  /** Cumulative paid spending by day, null after today. */
  daily: { day: number; actual: number | null; pace: number }[];
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function summarizeMonth(
  txns: Transaction[],
  categories: Category[],
  month: Month,
  today: string,
): MonthSummary {
  const inMonth = txns.filter((t) => t.occurred_on >= month.start && t.occurred_on <= month.end);
  const paid = (t: Transaction) => t.status === "paid";
  const expenses = inMonth.filter((t) => t.type === "expense");

  const income = sum(inMonth.filter((t) => t.type === "income" && paid(t)).map((t) => Number(t.amount)));
  const spent = sum(expenses.filter(paid).map((t) => Number(t.amount)));
  const planned = sum(expenses.filter((t) => !paid(t)).map((t) => Number(t.amount)));

  const elapsedDays =
    today > month.end ? month.days : today < month.start ? 0 : Number(today.slice(8, 10));
  const progress = elapsedDays / month.days;
  const isCurrent = elapsedDays > 0 && elapsedDays < month.days;

  // Active categories, plus archived ones that still have activity this month.
  const usedIds = new Set(expenses.map((t) => t.category_id));
  const visible = categories.filter((c) => !c.archived_at || usedIds.has(c.id));

  const summaries = visible.map<CategorySummary>((category) => {
    const rows = expenses.filter((t) => t.category_id === category.id);
    const cSpent = sum(rows.filter(paid).map((t) => Number(t.amount)));
    const cPlanned = sum(rows.filter((t) => !paid(t)).map((t) => Number(t.amount)));
    const target = (income * Number(category.target_pct)) / 100;
    const projected = isCurrent ? cPlanned + (cSpent / elapsedDays) * month.days : cSpent + cPlanned;
    const committed = cSpent + cPlanned;

    let status: CategoryStatus = "ok";
    if (target > 0 && committed > target) status = "over";
    // Already at (or within 2% of) the limit, e.g. a savings transfer made on day 1:
    // extrapolating a one-off payment across the month would be misleading.
    else if (target > 0 && committed >= target * 0.98) status = "full";
    else if (target > 0 && isCurrent && projected > target * 1.05) status = "at-risk";
    else if (target === 0 && committed > 0) status = "over";

    return { category, target, spent: cSpent, planned: cPlanned, projected, remaining: target - committed, status };
  });

  const byDay = new Map<number, number>();
  for (const t of expenses.filter(paid)) {
    const d = Number(t.occurred_on.slice(8, 10));
    byDay.set(d, (byDay.get(d) ?? 0) + Number(t.amount));
  }
  let running = 0;
  const daily = Array.from({ length: month.days }, (_, i) => {
    const day = i + 1;
    running += byDay.get(day) ?? 0;
    return { day, actual: day <= elapsedDays ? running : null, pace: (income * day) / month.days };
  });

  return {
    income,
    spent,
    planned,
    left: income - spent - planned,
    progress,
    elapsedDays,
    categories: summaries,
    daily,
  };
}
