import { useMemo } from "react";
import type { Account, Recurrence, Transaction } from "@/types";
import { useFinance } from "@/store/finance-context";
import { ALL_COMPANIES, useWorkspace } from "@/store/workspace-context";

/**
 * Aplica o recorte de empresa escolhido no cabeçalho.
 *
 * Todas as telas partem daqui, garantindo que trocar a empresa no topo mude a
 * página inteira — indicadores, listas e saldos — sem cada uma refazer o filtro.
 */
export function useScopedData(): {
  transactions: Transaction[];
  accounts: Account[];
  recurrences: Recurrence[];
} {
  const { transactions, accounts, recurrences } = useFinance();
  const { companyScope } = useWorkspace();

  return useMemo(() => {
    if (companyScope === ALL_COMPANIES) return { transactions, accounts, recurrences };
    return {
      transactions: transactions.filter((item) => item.companyId === companyScope),
      accounts: accounts.filter((item) => item.companyId === companyScope),
      recurrences: recurrences.filter((item) => item.companyId === companyScope),
    };
  }, [transactions, accounts, recurrences, companyScope]);
}
