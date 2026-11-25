import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BudgetMeter } from "@/components/ui/progress";
import { seriesColor } from "@/components/brand";
import type { CategorySummary } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";

export function CategoryBudgets({
  items,
  currency,
  progress,
  showPace,
}: {
  items: CategorySummary[];
  currency: string;
  progress: number;
  showPace: boolean;
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => {
        const color = seriesColor(c.category.color_index);
        return (
          <li key={c.category.id} className="py-3.5 first:pt-1 last:pb-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="truncate text-sm font-medium">{c.category.name}</span>
                <span className="text-[12px] text-ink-3 tabular-nums">
                  {c.category.archived_at ? "archived" : `${c.category.target_pct}%`}
                </span>
              </div>
              <StatusBadge item={c} currency={currency} showPace={showPace} />
            </div>
            <BudgetMeter
              spent={c.spent}
              planned={c.planned}
              target={c.target}
              color={color}
              marker={showPace ? progress : undefined}
              label={`${c.category.name}: ${formatCurrency(c.spent, currency)} of ${formatCurrency(c.target, currency)}`}
            />
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-ink-3 tabular-nums">
              <span>
                <span className="font-medium text-ink-2">{formatCurrency(c.spent, currency)}</span> spent
                {c.planned > 0 && <> · {formatCurrency(c.planned, currency)} planned</>}
              </span>
              <span>of {formatCurrency(c.target, currency)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusBadge({ item, currency, showPace }: { item: CategorySummary; currency: string; showPace: boolean }) {
  if (item.status === "over") {
    return (
      <Badge tone="critical">
        <AlertTriangle /> Over by {formatCurrency(-item.remaining, currency, { compact: true })}
      </Badge>
    );
  }
  if (item.status === "at-risk" && showPace) {
    return (
      <Badge tone="warn" title={`Projected month-end: ${formatCurrency(item.projected, currency)}`}>
        <TrendingUp /> On pace to overspend
      </Badge>
    );
  }
  if (item.target === 0) return null;
  if (item.status === "full") {
    return (
      <Badge tone="neutral">
        <CheckCircle2 /> Target reached
      </Badge>
    );
  }
  return (
    <Badge tone="good">
      <CheckCircle2 /> {formatCurrency(Math.max(item.remaining, 0), currency, { compact: true })} left
    </Badge>
  );
}
