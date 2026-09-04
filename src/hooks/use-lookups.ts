import { useMemo } from "react";
import type { Account, Bank, Category, Company, Expense, ID } from "@/types";
import { useFinance } from "@/store/finance-context";

/**
 * Índices por id para resolver rótulos em tabelas e cards sem varrer arrays
 * a cada linha renderizada.
 */
export interface Lookups {
  companyById: Map<ID, Company>;
  bankById: Map<ID, Bank>;
  accountById: Map<ID, Account>;
  categoryById: Map<ID, Category>;
  expenseById: Map<ID, Expense>;
  companyName: (id: ID | null | undefined) => string;
  bankName: (id: ID | null | undefined) => string;
  accountName: (id: ID | null | undefined) => string;
  categoryName: (id: ID | null | undefined) => string;
  expenseName: (id: ID | null | undefined) => string;
}

function indexBy<T extends { id: ID }>(items: T[]): Map<ID, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export function useLookups(): Lookups {
  const { companies, banks, accounts, categories, expenses } = useFinance();

  return useMemo(() => {
    const companyById = indexBy(companies);
    const bankById = indexBy(banks);
    const accountById = indexBy(accounts);
    const categoryById = indexBy(categories);
    const expenseById = indexBy(expenses);

    return {
      companyById,
      bankById,
      accountById,
      categoryById,
      expenseById,
      companyName: (id) => (id ? companyById.get(id)?.name ?? "—" : "—"),
      bankName: (id) => (id ? bankById.get(id)?.name ?? "—" : "—"),
      accountName: (id) => (id ? accountById.get(id)?.name ?? "—" : "Sem conta"),
      categoryName: (id) => (id ? categoryById.get(id)?.name ?? "—" : "Sem categoria"),
      expenseName: (id) => (id ? expenseById.get(id)?.name ?? "—" : "—"),
    };
  }, [companies, banks, accounts, categories, expenses]);
}
