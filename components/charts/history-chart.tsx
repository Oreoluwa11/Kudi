"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { barPath, LegendItem, niceTicks, Tooltip, useWidth } from "./shared";

type Point = { key: string; income: number; spent: number };

const H = 220;
const PAD = { top: 12, right: 4, bottom: 26, left: 52 };
const INCOME = "var(--series-1)";
const SPENT = "var(--series-2)";

export function HistoryChart({
  data,
  currency,
  selectedKey,
}: {
  data: Point[];
  currency: string;
  selectedKey: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const ticks = niceTicks(Math.max(...data.flatMap((d) => [d.income, d.spent]), 0));
  const max = ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 0);
  const innerH = H - PAD.top - PAD.bottom;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(22, Math.max((band - 20) / 2, 4));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const label = (key: string) => parse(`${key}-01`, "yyyy-MM-dd", new Date());

  return (
    <div>
      <div className="mb-3 flex gap-4">
        <LegendItem color={INCOME} label="Income" />
        <LegendItem color={SPENT} label="Spent" />
      </div>
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={`Income and spending for the last ${data.length} months`}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--axis)" : "var(--grid)"}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-ink-3 text-[11px] tabular-nums"
                >
                  {formatCurrency(t, currency, { compact: true })}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const cx = PAD.left + band * i + band / 2;
              const active = hover === i;
              const dim = hover !== null && !active;
              return (
                <g key={d.key} opacity={dim ? 0.45 : 1} className="transition-opacity">
                  {active && (
                    <rect x={cx - band / 2 + 4} y={PAD.top} width={band - 8} height={innerH} rx={8} fill="var(--surface-2)" />
                  )}
                  <path d={barPath(cx - barW - 1, y(d.income), barW, y(0) - y(d.income))} fill={INCOME} />
                  <path d={barPath(cx + 1, y(d.spent), barW, y(0) - y(d.spent))} fill={SPENT} />
                  <text
                    x={cx}
                    y={H - 6}
                    textAnchor="middle"
                    className={
                      d.key === selectedKey ? "fill-ink text-[11px] font-semibold" : "fill-ink-3 text-[11px]"
                    }
                  >
                    {format(label(d.key), "MMM")}
                  </text>
                  {/* hit target: the whole column */}
                  <rect
                    x={cx - band / 2}
                    y={0}
                    width={band}
                    height={H}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onTouchStart={() => setHover(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && data[hover] && (
          <Tooltip
            x={PAD.left + band * hover + band / 2}
            width={width}
            title={format(label(data[hover].key), "MMMM yyyy")}
            rows={[
              { label: "Income", value: formatCurrency(data[hover].income, currency), color: INCOME },
              { label: "Spent", value: formatCurrency(data[hover].spent, currency), color: SPENT },
              {
                label: "Net",
                value: formatCurrency(data[hover].income - data[hover].spent, currency, { sign: true }),
              },
            ]}
          />
        )}
      </div>

      <table className="sr-only">
        <caption>Monthly income and spending</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Income</th>
            <th>Spent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{format(label(d.key), "MMMM yyyy")}</td>
              <td>{formatCurrency(d.income, currency)}</td>
              <td>{formatCurrency(d.spent, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
