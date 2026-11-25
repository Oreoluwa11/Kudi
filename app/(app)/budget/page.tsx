import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { BudgetEditor } from "@/components/budget-editor";
import { CurrencyPicker } from "@/components/currency-picker";
import { getCategories, getProfile, getTransactions } from "@/lib/data";
import { getMonth } from "@/lib/month";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage() {
  const [profile, categories, transactions] = await Promise.all([
    getProfile(),
    getCategories(),
    getTransactions(getMonth(), { type: "income" }),
  ]);
  const income = transactions.filter((t) => t.status === "paid").reduce((a, t) => a + t.amount, 0);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Budget</h1>
        <p className="mt-1 text-sm text-ink-3">Decide where every unit of income goes before you spend it.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] [&>*]:min-w-0">
        {/* key resets the editor after a save revalidates the categories */}
        <BudgetEditor
          key={categories.map((c) => `${c.id}${c.name}${c.target_pct}${c.color_index}${c.archived_at}`).join()}
          categories={categories}
          income={income}
          currency={profile.currency}
        />

        <Card className="h-fit">
          <CardHeader title="Currency" description="Used for every amount in the app." />
          <CardBody>
            <CurrencyPicker value={profile.currency} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
