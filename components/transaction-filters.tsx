"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import type { Category } from "@/types/database";

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };

  // Debounce the search box.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const id = setTimeout(() => update("q", q.trim()), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        {pending ? (
          <Loader2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-ink-3" />
        ) : (
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
        )}
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transactions"
          aria-label="Search transactions"
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select
          aria-label="Type"
          value={params.get("type") ?? ""}
          onChange={(e) => update("type", e.target.value)}
          className="sm:w-36"
        >
          <option value="">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </Select>
        <Select
          aria-label="Category"
          value={params.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value)}
          className="sm:w-44"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.archived_at ? " (archived)" : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
