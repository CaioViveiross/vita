import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ID, TransactionType } from "@/types";

/**
 * O saldo em observação.
 *
 * Quem lança entradas e saídas costuma estar com o extrato do banco aberto do
 * lado, conferindo linha a linha. O painel de saldo existe para isso: fica
 * ancorado na lateral e acompanha o que está sendo digitado.
 *
 * Este contexto é só o canal entre as duas pontas: o formulário publica o
 * lançamento em andamento e o painel lê. É estado de visualização — some com
 * a sessão, sem persistência.
 */

export const ALL_ACCOUNTS = "all" as const;
export type WatchedAccount = ID | typeof ALL_ACCOUNTS;

/** O lançamento sendo composto agora, antes de existir no armazenamento. */
export interface BalanceDraft {
  accountId: ID | null;
  type: TransactionType;
  amount: number;
  /**
   * `true` quando o lançamento já nasce liquidado.
   *
   * A distinção é o que faz o painel bater com o extrato: um lançamento
   * pendente não mexe no saldo do banco hoje, só no previsto.
   */
  settled: boolean;
}

interface BalanceWatchValue {
  /** Conta escolhida no painel. */
  watched: WatchedAccount;
  setWatched: (account: WatchedAccount) => void;
  /** Lançamento em digitação; `null` quando nenhum formulário está aberto. */
  draft: BalanceDraft | null;
  setDraft: (draft: BalanceDraft | null) => void;
}

const BalanceWatchContext = createContext<BalanceWatchValue | null>(null);

export function BalanceWatchProvider({ children }: { children: ReactNode }) {
  const [watched, setWatched] = useState<WatchedAccount>(ALL_ACCOUNTS);
  const [draft, setDraft] = useState<BalanceDraft | null>(null);

  const value = useMemo<BalanceWatchValue>(
    () => ({ watched, setWatched, draft, setDraft }),
    [watched, draft],
  );

  return <BalanceWatchContext.Provider value={value}>{children}</BalanceWatchContext.Provider>;
}

export function useBalanceWatch(): BalanceWatchValue {
  const context = useContext(BalanceWatchContext);
  if (!context) throw new Error("useBalanceWatch precisa estar dentro de <BalanceWatchProvider>.");
  return context;
}
