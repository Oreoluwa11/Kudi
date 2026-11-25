import {
  addMonths,
  endOfMonth,
  format,
  getDaysInMonth,
  isValid,
  parse,
} from "date-fns";

export type Month = {
  /** "2026-11" */
  key: string;
  /** "2026-11-01" */
  start: string;
  /** "2026-11-30" */
  end: string;
  date: Date;
  days: number;
};

const KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getMonth(key?: string | null): Month {
  let date =
    key && KEY_RE.test(key) ? parse(`${key}-01`, "yyyy-MM-dd", new Date()) : new Date();
  if (!isValid(date)) date = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return {
    key: format(start, "yyyy-MM"),
    start: format(start, "yyyy-MM-dd"),
    end: format(endOfMonth(start), "yyyy-MM-dd"),
    date: start,
    days: getDaysInMonth(start),
  };
}

export const shiftMonth = (m: Month, n: number) => getMonth(format(addMonths(m.date, n), "yyyy-MM"));
export const monthLabel = (m: Month) => format(m.date, "MMMM yyyy");
export const todayISO = () => format(new Date(), "yyyy-MM-dd");
