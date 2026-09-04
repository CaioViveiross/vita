import { ArrowDownLeft, ArrowUpRight, Check, PartyPopper } from "lucide-react";
import type { Transaction, TransactionType } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyValue } from "@/components/common/money-value";
import { EmptyState } from "@/components/common/empty-state";
import { useLookups } from "@/hooks/use-lookups";
import { diffInDays } from "@/lib/date";
import { isOverdue } from "@/lib/finance";
import { cn, sum } from "@/lib/utils";

export interface TodayPanelProps {
  /** Pendências com vencimento até hoje, já filtradas pela empresa selecionada. */
  transactions: Transaction[];
  reference: string;
  onSettle: (transaction: Transaction) => void;
  onSelect: (transaction: Transaction) => void;
  className?: string;
}

function ActionRow({
  transaction,
  reference,
  onSettle,
  onSelect,
}: {
  transaction: Transaction;
  reference: string;
  onSettle: (transaction: Transaction) => void;
  onSelect: (transaction: Transaction) => void;
}) {
  const lookups = useLookups();
  const overdue = isOverdue(transaction, reference);
  const lateDays = overdue ? Math.abs(diffInDays(transaction.dueDate, reference)) : 0;
  const isIncome = transaction.type === "entrada";

  return (
    <li
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3.5 transition-all duration-200 ease-smooth hover:border-border hover:shadow-soft sm:flex-row sm:items-center",
        overdue && "border-danger/25 bg-danger-soft/40",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(transaction)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isIncome ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {isIncome ? (
            <ArrowDownLeft className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-sm font-medium">{transaction.description}</span>
            {overdue && (
              <Badge variant="danger" className="shrink-0">
                {lateDays === 1 ? "1 dia" : `${lateDays} dias`} em atraso
              </Badge>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {lookups.companyName(transaction.companyId)} · {lookups.accountName(transaction.accountId)} ·{" "}
            {lookups.categoryName(transaction.categoryId)}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <MoneyValue value={transaction.amount} type={transaction.type} tone="auto" showSign size="sm" />
        <Button
          size="xs"
          variant={isIncome ? "success" : "outline"}
          onClick={() => onSettle(transaction)}
          className="shrink-0"
        >
          <Check />
          {isIncome ? "Recebido" : "Pago"}
        </Button>
      </div>
    </li>
  );
}

function Column({
  type,
  transactions,
  reference,
  onSettle,
  onSelect,
}: {
  type: TransactionType;
  transactions: Transaction[];
  reference: string;
  onSettle: (transaction: Transaction) => void;
  onSelect: (transaction: Transaction) => void;
}) {
  const items = transactions.filter((item) => item.type === type);
  const total = sum(items.map((item) => item.amount));
  const isIncome = type === "entrada";

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold">
          <span className={cn("h-2 w-2 rounded-full", isIncome ? "bg-success" : "bg-danger")} />
          {isIncome ? "A receber" : "A pagar"}
          <span className="text-muted-foreground">({items.length})</span>
        </h3>
        <MoneyValue value={total} size="sm" tone={isIncome ? "positive" : "negative"} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
          {isIncome ? "Nenhum recebimento pendente." : "Nenhum pagamento pendente."}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((transaction) => (
            <ActionRow
              key={transaction.id}
              transaction={transaction}
              reference={reference}
              onSettle={onSettle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function TodayPanel({ transactions, reference, onSettle, onSelect, className }: TodayPanelProps) {
  const overdueCount = transactions.filter((item) => isOverdue(item, reference)).length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>O que preciso fazer hoje?</CardTitle>
          <CardDescription>
            {transactions.length === 0
              ? "Nada em aberto para hoje."
              : `${transactions.length} ${transactions.length === 1 ? "lançamento aguarda" : "lançamentos aguardam"} sua ação.`}
          </CardDescription>
        </div>
        {overdueCount > 0 && (
          <Badge variant="danger">
            {overdueCount} {overdueCount === 1 ? "item atrasado" : "itens atrasados"}
          </Badge>
        )}
      </CardHeader>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {transactions.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Tudo em dia"
            description="Não há pagamentos nem recebimentos aguardando ação hoje."
            variant="inline"
          />
        ) : (
          // Colunas lado a lado só a partir de `2xl`: com a sidebar e o painel
          // de saldo abertos, `lg`/`xl` ainda cortam as linhas contra a borda
          // do card (mesmo caso do grid de indicadores em dashboard.tsx).
          <div className="flex flex-col gap-6 2xl:flex-row 2xl:gap-8">
            <Column
              type="entrada"
              transactions={transactions}
              reference={reference}
              onSettle={onSettle}
              onSelect={onSelect}
            />
            <div className="hidden w-px shrink-0 bg-border/70 2xl:block" />
            <Column
              type="saida"
              transactions={transactions}
              reference={reference}
              onSettle={onSettle}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
