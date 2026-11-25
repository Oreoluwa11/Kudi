"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/supabase/server";
import { todayISO } from "@/lib/month";
import type { Database } from "@/types/database";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const transactionSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.coerce
      .number({ error: "Enter an amount" })
      .positive("Amount must be more than zero")
      .max(1_000_000_000_000, "That amount is too large"),
    description: z.string().trim().min(1, "Add a short description").max(120, "Keep it under 120 characters"),
    category_id: z.preprocess(emptyToNull, z.uuid().nullable()),
    occurred_on: z.string().regex(ISO_DATE, "Pick a date"),
    status: z.enum(["paid", "planned"]),
  })
  .refine((v) => v.type === "income" || v.category_id, {
    message: "Pick a category",
    path: ["category_id"],
  })
  .transform((v) => ({ ...v, category_id: v.type === "income" ? null : v.category_id }));

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveTransaction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = transactionSchema.safeParse({
    ...Object.fromEntries(formData),
    status: formData.get("status") ?? "paid",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { supabase } = await requireUserId();
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id
      ? await supabase.from("transactions").update(parsed.data).eq("id", id)
      : await supabase.from("transactions").insert(parsed.data);

  if (error) return { error: "Couldn't save that transaction. Please try again." };
  refresh();
  return { ok: true };
}

export async function setTransactionStatus(id: string, status: "paid" | "planned") {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("transactions")
    .update({ status })
    .eq("id", z.uuid().parse(id));
  if (error) throw new Error("Couldn't update the transaction");
  refresh();
}

export async function deleteTransaction(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("transactions").delete().eq("id", z.uuid().parse(id));
  if (error) throw new Error("Couldn't delete the transaction");
  refresh();
}

// ─── Categories ──────────────────────────────────────────────

const categoriesSchema = z
  .array(
    z.object({
      id: z.uuid().optional(),
      name: z.string().trim().min(1, "Every category needs a name").max(40),
      target_pct: z.number().min(0).max(100),
      color_index: z.number().int().min(1).max(8),
    }),
  )
  .min(1, "Keep at least one category")
  .max(8, "Up to 8 categories")
  .refine((rows) => Math.abs(rows.reduce((a, r) => a + r.target_pct, 0) - 100) < 0.01, {
    message: "Allocations must add up to exactly 100%",
  })
  .refine((rows) => new Set(rows.map((r) => r.name.toLowerCase())).size === rows.length, {
    message: "Category names must be unique",
  });

export type CategoryInput = z.input<typeof categoriesSchema>[number];

export async function saveCategories(input: CategoryInput[]): Promise<FormState> {
  const parsed = categoriesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase } = await requireUserId();
  const { data: existing, error: readError } = await supabase
    .from("categories")
    .select("id")
    .is("archived_at", null);
  if (readError) return { error: "Couldn't load your categories." };

  const keep = new Set(parsed.data.flatMap((r) => (r.id ? [r.id] : [])));
  const removed = (existing ?? []).map((c) => c.id).filter((id) => !keep.has(id));

  // Archive first so a re-added name doesn't collide with the unique index.
  if (removed.length) {
    const { error } = await supabase
      .from("categories")
      .update({ archived_at: new Date().toISOString() })
      .in("id", removed);
    if (error) return { error: "Couldn't remove a category." };
  }

  for (const [sort_order, row] of parsed.data.entries()) {
    const values = { name: row.name, target_pct: row.target_pct, color_index: row.color_index, sort_order };
    const { error } = row.id
      ? await supabase.from("categories").update(values).eq("id", row.id)
      : await supabase.from("categories").insert(values);
    if (error) {
      return {
        error: error.code === "23505" ? `You already have a category called "${row.name}".` : "Couldn't save categories.",
      };
    }
  }

  refresh();
  return { ok: true };
}

export async function updateCurrency(currency: string): Promise<FormState> {
  const code = z.string().regex(/^[A-Z]{3}$/).safeParse(currency);
  if (!code.success) return { error: "Unknown currency" };
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("profiles").update({ currency: code.data }).eq("id", userId);
  if (error) return { error: "Couldn't update currency." };
  refresh();
  return { ok: true };
}

// ─── Import from the old localStorage version ────────────────

const legacySchema = z.object({
  monthlyIncome: z.coerce.number().min(0).catch(0),
  budgetRule: z
    .array(z.object({ id: z.string(), label: z.string().trim().min(1).max(40), percentage: z.coerce.number() }))
    .catch([]),
  expenses: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        amount: z.coerce.number().positive(),
        category: z.string(),
        isPaid: z.boolean().optional(),
        date: z.string().optional(),
      }),
    )
    .max(5000)
    .catch([]),
});

export async function importLegacyData(raw: unknown): Promise<FormState & { imported?: number }> {
  const parsed = legacySchema.safeParse(raw);
  if (!parsed.success) return { error: "That saved data couldn't be read." };
  const legacy = parsed.data;

  const { supabase } = await requireUserId();
  const { data: cats, error } = await supabase
    .from("categories")
    .select("id, name, color_index")
    .is("archived_at", null);
  if (error) return { error: "Couldn't load your categories." };

  const byName = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  const legacyIdToCategory = new Map<string, string>();
  let nextColor = Math.max(0, ...(cats ?? []).map((c) => c.color_index)) + 1;

  for (const rule of legacy.budgetRule) {
    let id = byName.get(rule.label.toLowerCase());
    if (!id && byName.size < 8) {
      const { data, error: insertError } = await supabase
        .from("categories")
        .insert({ name: rule.label, target_pct: 0, color_index: Math.min(nextColor++, 8), sort_order: byName.size })
        .select("id")
        .single();
      if (insertError) continue;
      id = data.id;
      byName.set(rule.label.toLowerCase(), id);
    }
    if (id) legacyIdToCategory.set(rule.id, id);
  }

  const fallback = cats?.[0]?.id;
  const rows: TransactionInsert[] = [];

  if (legacy.monthlyIncome > 0) {
    rows.push({
      type: "income",
      amount: legacy.monthlyIncome,
      description: "Monthly income",
      category_id: null,
      occurred_on: `${todayISO().slice(0, 7)}-01`,
      status: "paid",
    });
  }

  for (const e of legacy.expenses) {
    const category_id = legacyIdToCategory.get(e.category) ?? byName.get(e.category.toLowerCase()) ?? fallback;
    if (!category_id) continue;
    rows.push({
      type: "expense",
      amount: e.amount,
      description: e.name,
      category_id,
      occurred_on: e.date && ISO_DATE.test(e.date.slice(0, 10)) ? e.date.slice(0, 10) : todayISO(),
      status: e.isPaid === false ? "planned" : "paid",
    });
  }

  if (rows.length) {
    const { error: insertError } = await supabase.from("transactions").insert(rows);
    if (insertError) return { error: "Import failed. Nothing was saved." };
  }

  refresh();
  return { ok: true, imported: rows.length };
}
