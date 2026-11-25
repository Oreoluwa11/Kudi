"use client";

import { useOptimistic, useState, useTransition } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ArrowDownLeft, Check, Circle, Pencil, Trash2 } from "lucide-react";
import { seriesColor } from "@/components/brand";
import { useTransactionDialog } from "@/components/transaction-dialog";
import { deleteTransaction, setTransactionStatus } from "@/lib/actions/finance";
import { cn, formatCurrency } from "@/lib/utils";
import type { Category, Transaction } from "@/types/database";

type Action = { type: "delete"; id: string } | { type: "status"; id: string; status: Transaction["status"] };

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM");
}

export function TransactionList({
  transactions,
  categories,
  currency,
  grouped = true,
}: {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  grouped?: boolean;
}) {
  const [items, apply] = useOptimistic(transactions, (state, action: Action) =>
    action.type === "delete"
      ? state.filter((t) => t.id !== action.id)
      : state.map((t) => (t.id === action.id ? { ...t, status: action.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));

  const run = (action: Action) =>
    startTransition(async () => {
      setError(null);
      apply(action);
      try {
        if (action.type === "delete") await deleteTransaction(action.id);
        else await setTransactionStatus(action.id, action.status);
      } catch {
        setError("That change didn't save. Please try again.");
      }
    });

  const groups = grouped
    ? items.reduce<[string, Transaction[]][]>((acc, t) => {
        const last = acc[acc.length - 1];
        if (last && last[0] === t.occurred_on) last[1].push(t);
        else acc.push([t.occurred_on, [t]]);
        return acc;
      }, [])
    : [["", items] as [string, Transaction[]]];

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}
      {groups.map(([day, rows]) => (
        <section key={day || "all"} className={grouped ? "mb-5 last:mb-0" : undefined}>
          {grouped && (
            <h3 className="mb-1 px-1 text-[12px] font-medium tracking-wide text-ink-3 uppercase">{dayLabel(day)}</h3>
          )}
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <Row
                key={t.id}
                t={t}
                category={t.category_id ? byId.get(t.category_id) : undefined}
                currency={currency}
                showDate={!grouped}
                onStatus={(status) => run({ type: "status", id: t.id, status })}
                onDelete={() => run({ type: "delete", id: t.id })}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  t,
  category,
  currency,
  showDate,
  onStatus,
  onDelete,
}: {
  t: Transaction;
  category?: Category;
  currency: string;
  showDate: boolean;
  onStatus: (s: Transaction["status"]) => void;
  onDelete: () => void;
}) {
  const { open } = useTransactionDialog();
  const [confirming, setConfirming] = useState(false);
  const income = t.type === "income";
  const planned = t.status === "planned";

  return (
    <li className="group relative flex items-center gap-3 px-1 py-3">
      {/* Phones: the whole row opens the edit sheet (which has delete). */}
      <button
        type="button"
        onClick={() => open(t)}
        aria-label={`Edit ${t.description}`}
        className="absolute inset-0 rounded-xl active:bg-surface-2/60 sm:hidden"
      />
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: income
            ? "var(--good-soft)"
            : `color-mix(in oklab, ${seriesColor(category?.color_index ?? 1)} 14%, transparent)`,
        }}
        aria-hidden
      >
        {income ? (
          <ArrowDownLeft className="size-4 text-good" />
        ) : (
          <span className="size-2.5 rounded-full" style={{ background: seriesColor(category?.color_index ?? 1) }} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", planned && "text-ink-2")}>{t.description}</p>
        <p className="truncate text-[12px] text-ink-3">
          {income ? "Income" : (category?.name ?? "Uncategorised")}
          {showDate && <> · {format(parseISO(t.occurred_on), "d MMM")}</>}
          {planned && <span className="sm:hidden"> · Planned</span>}
        </p>
      </div>

      {!income && (
        <button
          type="button"
          onClick={() => onStatus(planned ? "paid" : "planned")}
          className={cn(
            "hidden h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-colors sm:inline-flex",
            planned
              ? "border border-dashed border-line-strong text-ink-3 hover:border-ink-3 hover:text-ink"
              : "bg-surface-2 text-ink-2 hover:bg-good-soft hover:text-good",
          )}
          title={planned ? "Mark as paid" : "Mark as planned"}
        >
          {planned ? <Circle className="size-3" /> : <Check className="size-3" />}
          {planned ? "Planned" : "Paid"}
        </button>
      )}

      <span
        className={cn(
          "shrink-0 text-right text-sm font-semibold tabular-nums sm:w-28",
          income ? "text-good" : planned ? "text-ink-3" : "text-ink",
        )}
      >
        {income ? "+" : "−"}
        {formatCurrency(t.amount, currency)}
      </span>

      <div className="hidden shrink-0 items-center gap-0.5 transition-opacity sm:flex sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 pointer-coarse:opacity-100">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={onDelete}
              className="h-7 rounded-lg bg-critical px-2 text-[12px] font-medium text-white"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-7 rounded-lg px-2 text-[12px] font-medium text-ink-3 hover:text-ink"
            >
              Keep
            </button>
          </>
        ) : (
          <>
            <IconButton label="Edit" onClick={() => open(t)}>
              <Pencil />
            </IconButton>
            <IconButton label="Delete" onClick={() => setConfirming(true)} danger>
              <Trash2 />
            </IconButton>
          </>
        )}
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors [&_svg]:size-4",
        danger ? "hover:bg-critical-soft hover:text-critical" : "hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
