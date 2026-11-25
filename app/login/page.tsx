import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { DemoButton } from "@/components/demo-button";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col px-4">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-2xl font-semibold tracking-tight">Welcome to Kudi</h1>
          <p className="mt-1 mb-8 text-center text-sm text-ink-3">Your money, planned month by month.</p>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <AuthForm next={next} linkError={error === "link"} />
          </div>
          <div className="my-6 flex items-center gap-3 text-[12px] text-ink-3">
            <span className="h-px flex-1 bg-line" /> or just look around <span className="h-px flex-1 bg-line" />
          </div>
          <DemoButton size="md" />
        </div>
      </main>
    </div>
  );
}
