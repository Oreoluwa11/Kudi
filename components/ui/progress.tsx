import { cn } from "@/lib/utils";

/**
 * Budget meter: solid = spent, hatched = planned, faint tick = where spending
 * "should" be by today if spread evenly across the month.
 */
export function BudgetMeter({
  spent,
  planned = 0,
  target,
  color,
  marker,
  label,
  className,
}: {
  spent: number;
  planned?: number;
  target: number;
  color: string;
  /** 0..1 position of the "expected by today" tick, relative to target. */
  marker?: number;
  label: string;
  className?: string;
}) {
  const scale = Math.max(target, spent + planned, 1);
  const s = Math.min(spent / scale, 1);
  const p = Math.min(planned / scale, 1 - s);
  const over = target > 0 && spent + planned > target;
  const fill = over ? "var(--critical)" : color;
  const targetPos = target / scale;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(Math.round(target), 1)}
      aria-valuenow={Math.min(Math.round(spent), Math.max(Math.round(target), 1))}
      className={cn("relative h-2 w-full rounded-full bg-surface-2", className)}
    >
      <div className="absolute inset-0 flex gap-[2px] overflow-hidden rounded-full">
        {s > 0 && (
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${s * 100}%`, background: fill }}
          />
        )}
        {p > 0 && (
          <div
            className="h-full rounded-full opacity-70 transition-[width] duration-500"
            style={{
              width: `${p * 100}%`,
              background: `repeating-linear-gradient(135deg, ${fill} 0 3px, transparent 3px 6px)`,
            }}
          />
        )}
      </div>
      {over && targetPos > 0 && targetPos < 1 && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink"
          style={{ left: `${targetPos * 100}%` }}
          title="Budget limit"
        />
      )}
      {!over && marker !== undefined && marker > 0 && marker < 1 && target > 0 && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink-3/60"
          style={{ left: `${marker * targetPos * 100}%` }}
          title="Expected spend by today"
        />
      )}
    </div>
  );
}
