"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { LegendItem, niceTicks, Tooltip, useWidth } from "./shared";

type Point = { day: number; actual: number | null; pace: number };

const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 52 };
const ACTUAL = "var(--series-2)";
const PACE = "var(--ink-3)";

/** Cumulative spending this month against an even spread of income across the days. */
export function PaceChart({
  data,
  currency,
  monthName,
}: {
  data: Point[];
  currency: string;
  monthName: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const days = data.length;
  const ticks = niceTicks(Math.max(...data.map((d) => Math.max(d.pace, d.actual ?? 0)), 0));
  const max = ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 0);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (day: number) => PAD.left + ((day - 1) / Math.max(days - 1, 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const actual = data.filter((d) => d.actual !== null) as (Point & { actual: number })[];
  const line = (pts: { day: number; v: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const actualPath = line(actual.map((d) => ({ day: d.day, v: d.actual })));
  const pacePath = line(data.map((d) => ({ day: d.day, v: d.pace })));
  const last = actual[actual.length - 1];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - box.left) / box.width;
    setHover(Math.min(Math.max(Math.round(ratio * (days - 1)), 0), days - 1));
  };

  const xTicks = [1, Math.ceil(days / 2), days];

  return (
    <div>
      <div className="mb-3 flex gap-4">
        <LegendItem color={ACTUAL} label="Spent so far" />
        <LegendItem color={PACE} label="Even pace" dashed />
      </div>
      <div ref={ref} className="relative">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Cumulative spending through ${monthName}`}>
            <defs>
              <linearGradient id="pace-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={ACTUAL} stopOpacity="0.18" />
                <stop offset="100%" stopColor={ACTUAL} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--axis)" : "var(--grid)"}
                />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
                  {formatCurrency(t, currency, { compact: true })}
                </text>
              </g>
            ))}
            {xTicks.map((d) => (
              <text key={d} x={x(d)} y={H - 6} textAnchor="middle" className="fill-ink-3 text-[11px] tabular-nums">
                {d}
              </text>
            ))}

            <path d={pacePath} fill="none" stroke={PACE} strokeWidth={1.5} strokeDasharray="4 4" />
            {actual.length > 1 && (
              <path
                d={`${actualPath}L${x(last.day)},${y(0)}L${x(actual[0].day)},${y(0)}Z`}
                fill="url(#pace-fill)"
              />
            )}
            {actual.length > 0 && (
              <path d={actualPath} fill="none" stroke={ACTUAL} strokeWidth={2} strokeLinejoin="round" />
            )}
            {last && (
              <circle cx={x(last.day)} cy={y(last.actual)} r={4.5} fill={ACTUAL} stroke="var(--surface)" strokeWidth={2} />
            )}

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover + 1)} x2={x(hover + 1)} y1={PAD.top} y2={y(0)} stroke="var(--line-strong)" />
                {data[hover].actual !== null && (
                  <circle
                    cx={x(hover + 1)}
                    cy={y(data[hover].actual!)}
                    r={4}
                    fill={ACTUAL}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                )}
              </g>
            )}

            <rect
              x={PAD.left}
              y={0}
              width={innerW}
              height={H}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hover !== null && (
          <Tooltip
            x={x(hover + 1)}
            width={width}
            title={`${monthName.split(" ")[0]} ${hover + 1}`}
            rows={[
              ...(data[hover].actual !== null
                ? [{ label: "Spent so far", value: formatCurrency(data[hover].actual!, currency), color: ACTUAL }]
                : []),
              { label: "Even pace", value: formatCurrency(data[hover].pace, currency), color: PACE, dashed: true },
            ]}
          />
        )}
      </div>
    </div>
  );
}
