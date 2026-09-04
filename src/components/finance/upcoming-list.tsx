import { CalendarClock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Transaction } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { MoneyValue } from "@/components/common/money-value";
import { useLookups } from "@/hooks/use-lookups";
import { formatDayMonth, formatRelativeDay } from "@/lib/date";
import { cn, sortBy } from "@/lib/utils";

export interface UpcomingListProps {
  /** Lançamentos futuros pendentes, já filtrados pela empresa selecionada. */
  transactions: Transaction[];
  onSelect: (transaction: Transaction) => void;
  limit?: number;
  className?: string;
}

export function UpcomingList({ transactions, onSelect, limit = 6, className }: UpcomingListProps) {
  const lookups = useLookups();
  const items = sortBy(transactions, (item) => item.dueDate).slice(0, limit);

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>Próximos lançamentos</CardTitle>
          <CardDescription>Pagamentos e recebimentos previstos.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="-mr-2 shrink-0">
          <Link to="/movimentacoes">
            Ver todos <ChevronRight />
          </Link>
        </Button>
      </CardHeader>

      <div className="flex-1 px-3 pb-3 sm:px-4 sm:pb-4">
        {items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sem lançamentos previstos"
            description="Nenhum pagamento ou recebimento futuro no período selecionado."
            variant="inline"
          />
        ) : (
          <ul className="space-y-0.5">
            {items.map((transaction) => {
              const { day, month } = formatDayMonth(transaction.dueDate);
              const isIncome = transaction.type === "entrada";

              return (
                <li key={transaction.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(transaction)}
                    className="flex w-full items-center gap-3.5 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60"
                  >
                    {/* Bloco de data: o olho encontra o dia antes do texto. */}
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/70">
                      <span className="tabular text-[15px] font-semibold leading-none">{day}</span>
                      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {month}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            isIncome ? "bg-success" : "bg-danger",
                          )}
                        />
                        <span className="truncate text-[13.5px] font-medium">{transaction.description}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                        {isIncome ? "Recebimento" : "Pagamento"} · {lookups.companyName(transaction.companyId)} ·{" "}
                        {formatRelativeDay(transaction.dueDate)}
                      </span>
                    </span>

                    <MoneyValue
                      value={transaction.amount}
                      type={transaction.type}
                      tone="auto"
                      showSign
                      size="sm"
                      className="shrink-0"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
