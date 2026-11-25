import "server-only";
import { cache } from "react";
import { requireUserId } from "@/lib/supabase/server";
import { shiftMonth, type Month } from "@/lib/month";
import type { Category, Profile, Transaction } from "@/types/database";

const num = <T extends { amount: number }>(row: T): T => ({ ...row, amount: Number(row.amount) });

export const getProfile = cache(async (): Promise<Profile & { email?: string; isDemo: boolean }> => {
  const { supabase, userId, email, isDemo } = await requireUserId();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return { ...(data ?? { id: userId, display_name: null, currency: "NGN", created_at: "" }), email, isDemo };
});

/** All categories (archived included, so history can still be labelled). */
export const getCategories = cache(async (): Promise<Category[]> => {
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, target_pct: Number(c.target_pct) }));
});

export async function getTransactions(
  month: Month,
  filters: { q?: string; type?: string; category?: string } = {},
): Promise<Transaction[]> {
  const { supabase } = await requireUserId();
  let query = supabase
    .from("transactions")
    .select("*")
    .gte("occurred_on", month.start)
    .lte("occurred_on", month.end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.q) query = query.ilike("description", `%${filters.q.replace(/[%_\\]/g, "\\$&")}%`);
  if (filters.type === "income" || filters.type === "expense") query = query.eq("type", filters.type);
  if (filters.category) query = query.eq("category_id", filters.category);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(num);
}

export type HistoryPoint = { key: string; income: number; spent: number };

export async function getHistory(month: Month, count = 6): Promise<HistoryPoint[]> {
  const { supabase } = await requireUserId();
  const from = shiftMonth(month, -(count - 1));
  const { data, error } = await supabase.rpc("monthly_totals", { p_from: from.start, p_to: month.start });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    key: r.month.slice(0, 7),
    income: Number(r.income),
    spent: Number(r.spent),
  }));
}
