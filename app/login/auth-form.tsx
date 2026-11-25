"use client";

import { useActionState, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function AuthForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  if (mode === "signup" && signUpState.message) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
          <MailCheck className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-ink-3">{signUpState.message} Open it to finish creating your account.</p>
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "h-9 rounded-lg text-sm font-medium transition-all",
              mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={mode === "signin" ? signInAction : signUpAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        {mode === "signup" && (
          <Field label="Your name" htmlFor="name" hint="Optional, so we can say hi.">
            <Input id="name" name="name" autoComplete="given-name" maxLength={60} />
          </Field>
        )}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            key={`${mode}-email`}
          />
        </Field>
        <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </Field>

        {(state.error || linkError) && (
          <p role="alert" className="rounded-xl bg-critical-soft px-3 py-2 text-sm text-critical">
            {state.error ?? "That link has expired or was already used. Sign in or request a new one."}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
