"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { startDemo, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function DemoButton({
  variant = "secondary",
  size = "lg",
  className,
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  className?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(startDemo, {});

  return (
    <form action={action} className={cn("flex flex-col gap-2", className)}>
      <button type="submit" disabled={pending} className={buttonClasses(variant, size, "w-full")}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Setting up your demo…
          </>
        ) : (
          <>
            <Sparkles /> Try the live demo
          </>
        )}
      </button>
      {state.error && (
        <p role="alert" className="text-[13px] text-critical">
          {state.error}
        </p>
      )}
    </form>
  );
}
