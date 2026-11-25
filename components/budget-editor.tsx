"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { seriesColor } from "@/components/brand";
import { saveCategories, type CategoryInput } from "@/lib/actions/finance";
import { cn, formatCurrency } from "@/lib/utils";
import type { Category } from "@/types/database";

type Row = CategoryInput & { key: string };

const PRESETS: { label: string; rows: [string, number][] }[] = [
  { label: "50 / 30 / 20", rows: [["Needs", 50], ["Wants", 30], ["Savings", 20]] },
  { label: "70 / 20 / 10", rows: [["Living", 70], ["Savings", 20], ["Giving", 10]] },
];

export function BudgetEditor({
  categories,
  income,
  currency,
}: {
  categories: Category[];
  income: number;
  currency: string;
}) {
  const initial = useMemo<Row[]>(
    () =>
      categories
        .filter((c) => !c.archived_at)
        .map((c) => ({ key: c.id, id: c.id, name: c.name, target_pct: c.target_pct, color_index: c.color_index })),
    [categories],
  );
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  const total = Math.round(rows.reduce((a, r) => a + (Number(r.target_pct) || 0), 0) * 100) / 100;
  const dirty = JSON.stringify(rows.map(toInput)) !== JSON.stringify(initial.map(toInput));
  const valid = total === 100 && rows.every((r) => r.name.trim());

  const update = (key: string, patch: Partial<Row>) => {
    setMessage(null);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const nextColor = (taken: number[]) => [1, 2, 3, 4, 5, 6, 7, 8].find((c) => !taken.includes(c)) ?? 1;

  const add = () => {
    setMessage(null);
    setRows((rs) => [
      ...rs,
      {
        key: crypto.randomUUID(),
        name: "",
        target_pct: Math.max(0, Math.round((100 - total) * 100) / 100),
        color_index: nextColor(rs.map((r) => r.color_index)),
      },
    ]);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setMessage(null);
    setRows((rs) =>
      preset.rows.map(([name, pct], i) => {
        const existing = rs.find((r) => r.name.toLowerCase() === name.toLowerCase());
        return existing
          ? { ...existing, target_pct: pct }
          : { key: crypto.randomUUID(), name, target_pct: pct, color_index: i + 1 };
      }),
    );
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveCategories(rows.map(toInput));
      setMessage(res.error ? { tone: "error", text: res.error } : { tone: "ok", text: "Budget saved." });
    });

  return (
    <Card>
      <CardHeader
        title="Categories"
        description="Each category gets a share of whatever income you record that month."
        action={
          <div className="hidden gap-1 sm:flex">
            {PRESETS.map((p) => (
              <Button key={p.label} size="sm" variant="ghost" onClick={() => applyPreset(p)}>
                {p.label}
              </Button>
            ))}
          </div>
        }
      />
      <CardBody>
        <div className="-mt-1 mb-4 flex gap-1 sm:hidden">
          <span className="self-center text-[12px] text-ink-3">Presets:</span>
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="secondary" onClick={() => applyPreset(p)}>
              {p.label}
            </Button>
          ))}
        </div>
        {/* Allocation bar */}
        <div className="mb-2 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-surface-2" aria-hidden>
          {rows.map((r) => (
            <div
              key={r.key}
              className="h-full transition-[width] duration-300 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${Math.min(Number(r.target_pct) || 0, 100)}%`,
                background: seriesColor(r.color_index),
              }}
            />
          ))}
        </div>
        <div className="mb-5 flex items-center justify-between text-[13px]">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium tabular-nums",
              total === 100 ? "text-good" : "text-warn",
            )}
          >
            {total === 100 ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
            {total}% allocated
          </span>
          <span className="text-ink-3 tabular-nums">
            {total < 100 && `${Math.round((100 - total) * 100) / 100}% unassigned`}
            {total > 100 && `${Math.round((total - 100) * 100) / 100}% over`}
          </span>
        </div>

        <ul className="space-y-2">
          {rows.map((r) => (
            // Phones: [colour][name][remove] / [slider][%]. Wider: one row.
            <li
              key={r.key}
              className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2 rounded-xl border border-line p-2 sm:flex sm:gap-3"
            >
              <button
                type="button"
                aria-label={`Change colour for ${r.name || "category"}`}
                title="Change colour"
                onClick={() => update(r.key, { color_index: (r.color_index % 8) + 1 })}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-surface-2"
              >
                <span className="size-4 rounded-full ring-2 ring-surface" style={{ background: seriesColor(r.color_index) }} />
              </button>
              <Input
                value={r.name}
                maxLength={40}
                placeholder="Category name"
                aria-label="Category name"
                onChange={(e) => update(r.key, { name: e.target.value })}
                className="h-9 min-w-0 flex-1"
              />
              <RemoveButton
                label={r.name}
                disabled={rows.length === 1}
                onClick={() => {
                  setMessage(null);
                  setRows((rs) => rs.filter((x) => x.key !== r.key));
                }}
              />
              <div className="col-span-3 flex items-center gap-3 pl-2 sm:contents">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Number(r.target_pct) || 0}
                onChange={(e) => update(r.key, { target_pct: Number(e.target.value) })}
                aria-label={`${r.name || "Category"} share`}
                className="h-9 min-w-0 flex-1 sm:hidden md:block md:w-28 md:flex-none xl:w-36"
                style={{ accentColor: seriesColor(r.color_index) }}
              />
              <div className="relative w-20 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={r.target_pct}
                  aria-label={`${r.name || "Category"} percentage`}
                  onChange={(e) => update(r.key, { target_pct: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className="h-9 pr-7 text-right tabular-nums"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-3">%</span>
              </div>
              <span className="hidden w-24 shrink-0 text-right text-[13px] text-ink-3 tabular-nums lg:block">
                {income > 0 ? formatCurrency((income * (Number(r.target_pct) || 0)) / 100, currency) : "—"}
              </span>
              </div>
            </li>
          ))}
        </ul>

        <Button variant="ghost" size="sm" className="mt-3" onClick={add} disabled={rows.length >= 8}>
          <Plus /> Add category
        </Button>

        <p className="mt-4 text-[12px] text-ink-3">
          Removing a category archives it. Past transactions keep their category, and you can still filter by it.
        </p>

        <div className="mt-5 flex flex-col-reverse items-stretch gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
          {message && (
            <p
              role="status"
              className={cn("text-sm sm:mr-auto", message.tone === "error" ? "text-critical" : "text-good")}
            >
              {message.text}
            </p>
          )}
          {dirty && (
            <Button variant="ghost" onClick={() => setRows(initial)} disabled={pending}>
              Reset
            </Button>
          )}
          <Button onClick={save} disabled={!dirty || !valid || pending}>
            {pending ? "Saving…" : "Save budget"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Remove ${label || "category"}`}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-critical-soft hover:text-critical disabled:opacity-40 sm:order-last"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function toInput(row: Row): CategoryInput {
  return { id: row.id, name: row.name.trim(), target_pct: Number(row.target_pct) || 0, color_index: row.color_index };
}
