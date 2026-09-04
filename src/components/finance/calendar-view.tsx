import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { ISODate, Transaction } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyValue } from "@/components/common/money-value";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { useLookups } from "@/hooks/use-lookups";
import {
  addMonths,
  formatLongDate,
  isSameMonth,
  monthGrid,
  MONTHS,
  startOfMonth,
  toDate,
  WEEKDAYS_SHORT,
} from "@/lib/date";
import { findHoliday, isWeekend } from "@/lib/businessDays";
import { resolveStatus } from "@/lib/finance";
import { formatCompactCurrency } from "@/lib/format";
import { cn, sum } from "@/lib/utils";

export interface CalendarViewProps {
  /** Lançamentos do recorte atual, parcelas de séries incluídas. */
  transactions: Transaction[];
  reference: ISODate;
  onSelect: (row: Transaction) => void;
  className?: string;
}

interface DaySummary {
  inflow: number;
  outflow: number;
  items: Transaction[];
}

export function CalendarView({ transactions, reference, onSelect, className }: CalendarViewProps) {
  const lookups = useLookups();
  const [anchor, setAnchor] = useState<ISODate>(() => startOfMonth(reference));
  const [selected, setSelected] = useState<ISODate>(reference);

  const byDay = useMemo(() => {
    const map = new Map<ISODate, DaySummary>();
    for (const transaction of transactions) {
      const entry = map.get(transaction.dueDate) ?? { inflow: 0, outflow: 0, items: [] };
      if (transaction.type === "entrada") entry.inflow += transaction.amount;
      else entry.outflow += transaction.amount;
      entry.items.push(transaction);
      map.set(transaction.dueDate, entry);
    }
    return map;
  }, [transactions]);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const selectedItems = byDay.get(selected)?.items ?? [];

  const monthTotals = useMemo(() => {
    const inMonth = transactions.filter((item) => isSameMonth(item.dueDate, anchor));
    return {
      inflow: sum(inMonth.filter((item) => item.type === "entrada").map((item) => item.amount)),
      outflow: sum(inMonth.filter((item) => item.type === "saida").map((item) => item.amount)),
    };
  }, [transactions, anchor]);

  const monthDate = toDate(anchor);

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:px-5">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setAnchor(addMonths(anchor, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft />
            </Button>
            <h2 className="min-w-[10rem] text-center text-sm font-semibold">
              {MONTHS[monthDate.getMonth()]} de {monthDate.getFullYear()}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setAnchor(addMonths(anchor, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {formatCompactCurrency(monthTotals.inflow)}
            </span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              {formatCompactCurrency(monthTotals.outflow)}
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setAnchor(startOfMonth(reference));
                setSelected(reference);
              }}
            >
              Hoje
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
          {WEEKDAYS_SHORT.map((weekday) => (
            <span
              key={weekday}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const summary = byDay.get(day);
            const outside = !isSameMonth(day, anchor);
            const isToday = day === reference;
            const isSelected = day === selected;
            const holiday = findHoliday(day);

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                title={holiday?.name}
                className={cn(
                  "relative flex min-h-[4.5rem] flex-col gap-1 border-b border-r border-border/50 p-1.5 text-left transition-colors duration-150 sm:min-h-[6rem] sm:p-2",
                  index % 7 === 6 && "border-r-0",
                  index >= 35 && "border-b-0",
                  outside && "bg-muted/20 text-muted-foreground/60",
                  !outside && (isWeekend(day) || holiday) && "bg-muted/25",
                  isSelected ? "bg-primary-soft/70 ring-1 ring-inset ring-primary/25" : "hover:bg-muted/50",
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "tabular text-[12.5px] font-medium",
                      isToday &&
                        "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-primary-foreground",
                    )}
                  >
                    {toDate(day).getDate()}
                  </span>
                  {holiday && !outside && (
                    <span className="h-1 w-1 shrink-0 rounded-full bg-info" aria-hidden />
                  )}
                </span>

                {summary && (
                  <span className="mt-auto flex flex-col gap-0.5">
                    {summary.inflow > 0 && (
                      <span className="tabular truncate text-[11px] font-medium text-success">
                        + {formatCompactCurrency(summary.inflow).replace("R$ ", "")}
                      </span>
                    )}
                    {summary.outflow > 0 && (
                      <span className="tabular truncate text-[11px] font-medium text-danger">
                        − {formatCompactCurrency(summary.outflow).replace("R$ ", "")}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
          <h3 className="text-sm font-semibold">{formatLongDate(selected)}</h3>
          <span className="text-[12.5px] text-muted-foreground">
            {selectedItems.length} {selectedItems.length === 1 ? "lançamento" : "lançamentos"}
          </span>
        </header>

        {selectedItems.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum lançamento neste dia"
            description="Selecione outro dia no calendário para ver as movimentações."
            variant="inline"
          />
        ) : (
          <ul className="divide-y divide-border/50">
            {selectedItems.map((transaction) => (
              <li key={transaction.id}>
                <button
                  type="button"
                  onClick={() => onSelect(transaction)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "h-8 w-1 shrink-0 rounded-full",
                      transaction.type === "entrada" ? "bg-success" : "bg-danger",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{transaction.description}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {lookups.companyName(transaction.companyId)} · {lookups.accountName(transaction.accountId)}
                    </span>
                  </span>
                  <StatusBadge status={resolveStatus(transaction, reference)} appearance="dot" className="hidden sm:inline-flex" />
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
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
