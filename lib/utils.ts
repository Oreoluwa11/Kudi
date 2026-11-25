import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  amount: number,
  currency = "NGN",
  opts: { compact?: boolean; sign?: boolean } = {},
) {
  const key = `${currency}-${opts.compact}-${opts.sign}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en", {
      style: "currency",
      currency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 0,
      signDisplay: opts.sign ? "exceptZero" : "auto",
    });
    formatters.set(key, f);
  }
  return f.format(amount);
}
