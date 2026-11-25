"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, parse } from "date-fns";
import { cn } from "@/lib/utils";

export function MonthSwitcher({ monthKey, currentKey }: { monthKey: string; currentKey: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const date = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());

  const href = (offset: number | "today") => {
    const next = new URLSearchParams(params);
    const key = offset === "today" ? currentKey : format(addMonths(date, offset), "yyyy-MM");
    if (key === currentKey) next.delete("m");
    else next.set("m", key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const isCurrent = monthKey === currentKey;
  const btn =
    "inline-flex size-8 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <Link href={href(-1)} className={btn} aria-label="Previous month" scroll={false}>
        <ChevronLeft className="size-4" />
      </Link>
      <span className="min-w-[8.5rem] text-center text-sm font-medium tabular-nums">
        {format(date, "MMMM yyyy")}
      </span>
      <Link href={href(1)} className={btn} aria-label="Next month" scroll={false}>
        <ChevronRight className="size-4" />
      </Link>
      {!isCurrent && (
        <Link
          href={href("today")}
          className={cn(btn, "w-auto px-2.5 text-[13px] font-medium text-brand hover:text-brand")}
          scroll={false}
        >
          Today
        </Link>
      )}
    </div>
  );
}
