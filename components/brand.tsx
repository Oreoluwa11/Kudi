import { cn } from "@/lib/utils";

export const seriesColor = (index: number) => `var(--series-${Math.min(Math.max(index, 1), 8)})`;

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path
        d="M11 8.5v15M11 17l8.5-8.5M14 14.5l6 9"
        stroke="var(--brand-ink)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22.5" cy="16" r="1.75" fill="var(--brand-ink)" opacity="0.55" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">Kudi</span>
    </span>
  );
}
