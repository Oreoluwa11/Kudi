"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { updateCurrency } from "@/lib/actions/finance";

const CURRENCIES = ["NGN", "GHS", "KES", "ZAR", "USD", "GBP", "EUR", "CAD"];

export function CurrencyPicker({ value }: { value: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      aria-label="Currency"
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateCurrency(next);
        });
      }}
      className="w-full sm:w-40"
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}
