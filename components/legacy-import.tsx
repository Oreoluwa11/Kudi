"use client";

import { useEffect, useState, useTransition } from "react";
import { DownloadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importLegacyData } from "@/lib/actions/finance";

const LEGACY_KEY = "bizflow-data";
const DISMISSED_KEY = "kudi-legacy-dismissed";

/** Offers to move data saved by the old localStorage-only version into the account. */
export function LegacyImport() {
  const [legacy, setLegacy] = useState<{ raw: unknown; count: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
      const saved = localStorage.getItem(LEGACY_KEY);
      if (!saved) return;
      const raw = JSON.parse(saved);
      const count = (Array.isArray(raw?.expenses) ? raw.expenses.length : 0) + (raw?.monthlyIncome > 0 ? 1 : 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
      if (count > 0) setLegacy({ raw, count });
    } catch {}
  }, []);

  if (!legacy && !result) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setLegacy(null);
    setResult(null);
  };

  const runImport = () =>
    startTransition(async () => {
      const res = await importLegacyData(legacy!.raw);
      if (res.error) {
        setResult(res.error);
        return;
      }
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {}
      setLegacy(null);
      setResult(`Imported ${res.imported} records from your old data.`);
    });

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 sm:flex-row sm:items-center">
      <DownloadCloud className="hidden size-5 shrink-0 text-brand-soft-ink sm:block" />
      <p className="flex-1 text-sm text-brand-soft-ink">
        {result ??
          `We found ${legacy!.count} records saved in this browser from the previous version of the app. Move them into your account?`}
      </p>
      <div className="flex gap-2">
        {legacy && (
          <Button size="sm" onClick={runImport} disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss">
          {legacy ? "Not now" : <X />}
        </Button>
      </div>
    </div>
  );
}
