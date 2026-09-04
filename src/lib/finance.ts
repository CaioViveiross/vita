import type {
  Account,
  AccountBalance,
  Company,
  DateRange,
  ISODate,
  PersistedStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/types";
import { isWithin, today } from "@/lib/date";
import { sum } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recebido: "Recebido",
  atrasado: "Atrasado",
};

export const TYPE_LABELS: Record<TransactionType, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

/** Status considerados liquidados — afetam o saldo real da conta. */
export const SETTLED_STATUSES: PersistedStatus[] = ["pago", "recebido"];

export function isSettled(transaction: Transaction): boolean {
  return SETTLED_STATUSES.includes(transaction.status);
}

export function isOpen(transaction: Transaction): boolean {
  return transaction.status === "pendente";
}

/**
 * Status efetivo exibido na interface.
 *
 * `atrasado` não é persistido: um lançamento pendente cuja data prevista já
 * passou é apresentado como atrasado, e volta a ser pendente se a data mudar.
 */
export function resolveStatus(row: Transaction, reference: ISODate = today()): TransactionStatus {
  if (row.status === "pendente" && row.dueDate < reference) return "atrasado";
  return row.status;
}

/** Status de liquidação correspondente ao tipo do lançamento. */
export function settledStatusFor(type: TransactionType): PersistedStatus {
  return type === "entrada" ? "recebido" : "pago";
}

/** Valor com sinal: entradas positivas, saídas negativas. */
export function signedAmount(row: Transaction): number {
  return row.type === "entrada" ? row.amount : -row.amount;
}

export function isOverdue(row: Transaction, reference: ISODate = today()): boolean {
  return resolveStatus(row, reference) === "atrasado";
}

export function isDueToday(transaction: Transaction, reference: ISODate = today()): boolean {
  return transaction.dueDate === reference && transaction.status === "pendente";
}

/** Pendências que exigem ação hoje: vencendo hoje ou já atrasadas. */
export function needsAction(transaction: Transaction, reference: ISODate = today()): boolean {
  return transaction.status === "pendente" && transaction.dueDate <= reference;
}

/* -------------------------------------------------------------------------- */
/* Saldos                                                                      */
/* -------------------------------------------------------------------------- */

/** Saldo real de uma conta: abertura + tudo o que já foi liquidado. */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  const settled = transactions.filter((item) => item.accountId === account.id && isSettled(item));
  return account.openingBalance + sum(settled.map(signedAmount));
}

/** Saldo projetado: saldo real + lançamentos pendentes dentro do intervalo. */
export function projectedBalance(account: Account, transactions: Transaction[], range: DateRange): number {
  const pending = transactions.filter(
    (item) => item.accountId === account.id && isOpen(item) && item.dueDate <= range.to,
  );
  return accountBalance(account, transactions) + sum(pending.map(signedAmount));
}

export function buildAccountBalances(
  accounts: Account[],
  companies: Company[],
  transactions: Transaction[],
  range: DateRange,
): AccountBalance[] {
  return accounts.map((account) => {
    const company = companies.find((item) => item.id === account.companyId);
    return {
      account,
      company: company ?? {
        id: account.companyId,
        name: "Empresa removida",
        legalName: "—",
        taxId: "—",
        active: false,
        createdAt: account.createdAt,
      },
      current: accountBalance(account, transactions),
      projected: projectedBalance(account, transactions, range),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Agregações                                                                  */
/* -------------------------------------------------------------------------- */

export interface Totals {
  inflow: number;
  outflow: number;
  result: number;
  inflowCount: number;
  outflowCount: number;
}

/** Soma o conjunto exibido na tela, para que os totais batam com as linhas. */
export function totalize(transactions: Transaction[]): Totals {
  const inflow = transactions.filter((item) => item.type === "entrada");
  const outflow = transactions.filter((item) => item.type === "saida");
  const inflowTotal = sum(inflow.map((item) => item.amount));
  const outflowTotal = sum(outflow.map((item) => item.amount));

  return {
    inflow: inflowTotal,
    outflow: outflowTotal,
    result: inflowTotal - outflowTotal,
    inflowCount: inflow.length,
    outflowCount: outflow.length,
  };
}

export function inRange<T extends Transaction>(transactions: T[], range: DateRange): T[] {
  return transactions.filter((item) => isWithin(item.dueDate, range));
}

/** Série diária de entradas, saídas e resultado acumulado. */
export interface FlowPoint {
  date: ISODate;
  entradas: number;
  saidas: number;
  resultado: number;
  acumulado: number;
}

export function buildFlowSeries(transactions: Transaction[], days: ISODate[]): FlowPoint[] {
  let running = 0;
  return days.map((date) => {
    const ofDay = transactions.filter((item) => item.dueDate === date);
    const entradas = sum(ofDay.filter((item) => item.type === "entrada").map((item) => item.amount));
    const saidas = sum(ofDay.filter((item) => item.type === "saida").map((item) => item.amount));
    running += entradas - saidas;
    return { date, entradas, saidas, resultado: entradas - saidas, acumulado: running };
  });
}

/** Agrupa por categoria — usado nos rankings de despesa. */
export function groupByCategory(transactions: Transaction[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of transactions) {
    if (!item.categoryId) continue;
    result.set(item.categoryId, (result.get(item.categoryId) ?? 0) + item.amount);
  }
  return result;
}

export interface BreakdownEntry {
  key: string;
  value: number;
  /** Mesmo agrupamento no período anterior, para comparar. */
  previous: number;
  count: number;
  /** Fatia do total do período atual, de 0 a 1. */
  share: number;
}

/**
 * Ranking genérico por qualquer dimensão (categoria, empresa, conta, banco…).
 *
 * Recebe os dois períodos porque o valor isolado diz pouco: R$ 40 mil em
 * fornecedores só significa algo comparado ao que foi no período anterior.
 * `keyOf` devolvendo `null` joga o lançamento num balde à parte em vez de
 * descartá-lo — descartar faria as fatias somarem menos que 100%.
 */
export function buildBreakdown(
  current: Transaction[],
  previous: Transaction[],
  keyOf: (item: Transaction) => string | null | undefined,
  fallbackKey = "—",
): BreakdownEntry[] {
  const accumulate = (items: Transaction[]) => {
    const totals = new Map<string, { value: number; count: number }>();
    for (const item of items) {
      const key = keyOf(item) ?? fallbackKey;
      const entry = totals.get(key) ?? { value: 0, count: 0 };
      totals.set(key, { value: entry.value + item.amount, count: entry.count + 1 });
    }
    return totals;
  };

  const now = accumulate(current);
  const before = accumulate(previous);
  const total = sum([...now.values()].map((entry) => entry.value));

  return [...now.entries()]
    .map(([key, entry]) => ({
      key,
      value: entry.value,
      count: entry.count,
      previous: before.get(key)?.value ?? 0,
      share: total > 0 ? entry.value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}
