"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { seriesColor } from "@/components/brand";
import { deleteTransaction, saveTransaction, type FormState } from "@/lib/actions/finance";
import { todayISO } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { Category, Transaction, TransactionType } from "@/types/database";

type Draft = Partial<Pick<Transaction, "id" | "type" | "amount" | "description" | "category_id" | "occurred_on" | "status">>;

const Ctx = createContext<{ open: (draft?: Draft) => void } | null>(null);

export function useTransactionDialog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTransactionDialog must be used inside TransactionDialogProvider");
  return ctx;
}

export function TransactionDialogProvider({
  categories,
  currency,
  children,
}: {
  categories: Category[];
  currency: string;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [session, setSession] = useState(0);

  const open = useCallback((d: Draft = {}) => {
    setDraft(d);
    setSession((s) => s + 1);
  }, []);
  const close = useCallback(() => setDraft(null), []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <Dialog
        open={draft !== null}
        onClose={close}
        title={draft?.id ? "Edit transaction" : "New transaction"}
      >
        {draft && (
          <TransactionForm
            key={session}
            draft={draft}
            categories={categories.filter((c) => !c.archived_at || c.id === draft.category_id)}
            currency={currency}
            onDone={close}
          />
        )}
      </Dialog>
    </Ctx.Provider>
  );
}

function currencySymbol(currency: string) {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={confirming ? "danger" : "ghost"}
      className={cn("mr-auto", !confirming && "text-critical hover:bg-critical-soft hover:text-critical")}
      disabled={pending}
      onClick={() => {
        if (!confirming) return setConfirming(true);
        startTransition(async () => {
          await deleteTransaction(id);
          onDeleted();
        });
      }}
    >
      <Trash2 /> {confirming ? "Confirm" : "Delete"}
    </Button>
  );
}

function TransactionForm({
  draft,
  categories,
  currency,
  onDone,
}: {
  draft: Draft;
  categories: Category[];
  currency: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTransaction, {});
  const [type, setType] = useState<TransactionType>(draft.type ?? "expense");
  const [status, setStatus] = useState(draft.status ?? "paid");
  const [categoryId, setCategoryId] = useState(draft.category_id ?? categories[0]?.id ?? "");
  const id = useId();
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-5">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="status" value={type === "income" ? "paid" : status} />

      <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["expense", "Expense", ArrowUpRight],
            ["income", "Income", ArrowDownLeft],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => setType(value)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all",
              type === value ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <Field label="Amount" htmlFor={`${id}-amount`} error={err.amount}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xl font-medium text-ink-3">
            {currencySymbol(currency)}
          </span>
          <Input
            id={`${id}-amount`}
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            autoFocus
            defaultValue={draft.amount ?? ""}
            placeholder="0"
            aria-invalid={!!err.amount}
            className="h-14 pl-10 text-2xl font-semibold tabular-nums"
          />
        </div>
      </Field>

      <Field label="Description" htmlFor={`${id}-desc`} error={err.description}>
        <Input
          id={`${id}-desc`}
          name="description"
          required
          maxLength={120}
          defaultValue={draft.description ?? ""}
          placeholder={type === "income" ? "Salary, freelance, gift…" : "Groceries, rent, data bundle…"}
          aria-invalid={!!err.description}
        />
      </Field>

      {type === "expense" && (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-2">Category</legend>
          <input type="hidden" name="category_id" value={categoryId} />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  categoryId === c.id
                    ? "border-ink bg-ink text-bg"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <span className="size-2 rounded-full" style={{ background: seriesColor(c.color_index) }} />
                {c.name}
              </button>
            ))}
          </div>
          {err.category_id && <p className="text-[12px] text-critical">{err.category_id}</p>}
        </fieldset>
      )}

      <div className="grid gap-3 min-[400px]:grid-cols-2">
        <Field label="Date" htmlFor={`${id}-date`} error={err.occurred_on}>
          <Input
            id={`${id}-date`}
            name="occurred_on"
            type="date"
            required
            defaultValue={draft.occurred_on ?? todayISO()}
          />
        </Field>
        {type === "expense" && (
          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium text-ink-2">Status</span>
            <div className="grid h-10 grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              {(["paid", "planned"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-lg text-[13px] font-medium capitalize transition-all",
                    status === s ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {draft.id && <DeleteButton id={draft.id} onDeleted={onDone} />}
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-w-28">
          {pending ? <Loader2 className="animate-spin" /> : draft.id ? "Save changes" : `Add ${type}`}
        </Button>
      </div>
    </form>
  );
}
