import { AppShell } from "@/components/app-shell";
import { TransactionDialogProvider } from "@/components/transaction-dialog";
import { getCategories, getProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, categories] = await Promise.all([getProfile(), getCategories()]);

  return (
    <TransactionDialogProvider categories={categories} currency={profile.currency}>
      <AppShell name={profile.display_name} email={profile.email} isDemo={profile.isDemo}>
        {children}
      </AppShell>
    </TransactionDialogProvider>
  );
}
