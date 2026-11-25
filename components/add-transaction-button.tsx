"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useTransactionDialog } from "@/components/transaction-dialog";
import type { Transaction } from "@/types/database";

type Draft = Partial<Pick<Transaction, "type" | "amount" | "description" | "category_id" | "occurred_on" | "status">>;

export function AddTransactionButton({ draft, ...props }: ButtonProps & { draft?: Draft }) {
  const { open } = useTransactionDialog();
  return <Button {...props} onClick={() => open(draft)} />;
}
