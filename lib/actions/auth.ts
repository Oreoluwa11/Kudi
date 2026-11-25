"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string };

const credentials = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message, email };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ name: z.string().trim().max(60).optional() })
    .safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { display_name: parsed.data.name || null },
    },
  });
  if (error) return { error: error.message, email };

  // Email confirmation disabled in Supabase → we already have a session.
  if (data.session) redirect("/dashboard");
  return { message: `We sent a confirmation link to ${parsed.data.email}.`, email };
}

/** Signs the visitor into a private, throwaway account and fills it with sample data. */
export async function startDemo(): Promise<AuthState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    return {
      error: /anonymous/i.test(error.message)
        ? "The demo is switched off right now. Create an account instead; it only takes a moment."
        : error.message,
    };
  }

  const { error: seedError } = await supabase.rpc("seed_demo_data");
  if (seedError) {
    await supabase.auth.signOut();
    return { error: "Couldn't set up the demo. Please try again." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
