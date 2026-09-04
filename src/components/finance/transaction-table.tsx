import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Transaction } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyValue } from "@/components/common/money-value";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { useLookups } from "@/hooks/use-lookups";
import { formatDate, formatRelativeDay } from "@/lib/date";
import { isSettled, resolveStatus } from "@/lib/finance";
import { cn, sortBy } from "@/lib/utils";

export type SortKey = "dueDate" | "description" | "amount" | "status";
export type SortDir = "asc" | "desc";

export interface TransactionTableProps {
  transactions: Transaction[];
  onSelect?: (row: Transaction) => void;
  onSettle?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "dueDate", label: "Data", className: "w-[7.5rem]" },
  { key: "description", label: "Descrição" },
  { key: "amount", label: "Valor", className: "w-[10rem] whitespace-nowrap text-right" },
  { key: "status", label: "Status", className: "w-[8rem]" },
];

/**
 * Posição da parcela na série ("2/5").
 *
 * Fica ao lado da descrição porque é ali que a pergunta aparece: olhando a
 * lista, o que se quer saber é se aquele aluguel é o primeiro ou o último.
 */
function InstallmentChip({ row }: { row: Transaction }) {
  if (!row.installment || !row.installmentCount) return null;
  return (
    <span className="tabular shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {row.installment}/{row.installmentCount}
    </span>
  );
}

/** Ícone e cor do tipo, reaproveitado pela tabela e pelos cards de mobile. */
function TypeMark({ row }: { row: Transaction }) {
  const isIncome = row.type === "entrada";
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        isIncome ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </span>
  );
}

function RowActions({
  transaction,
  onSettle,
  onEdit,
  onDelete,
}: Pick<TransactionTableProps, "onSettle" | "onEdit" | "onDelete"> & { transaction: Transaction }) {
  const settled = isSettled(transaction);
  const canSettle = !settled;

  return (
    <div className="flex items-center justify-end gap-1">
      {canSettle && onSettle && (
        <Button
          variant="ghost"
          size="xs"
          onClick={(event) => {
            event.stopPropagation();
            onSettle(transaction);
          }}
          className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
        >
          <Check className="text-success" />
          {transaction.type === "entrada" ? "Recebido" : "Pago"}
        </Button>
      )}

      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(event) => event.stopPropagation()}
              aria-label="Mais ações"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            {onEdit && (
              <DropdownMenuItem onSelect={() => onEdit(transaction)}>
                <Pencil /> Editar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => onDelete(transaction)}>
                  <Trash2 /> Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function TransactionTable({
  transactions,
  onSelect,
  onSettle,
  onEdit,
  onDelete,
  emptyTitle = "Nenhuma movimentação encontrada",
  emptyDescription = "Ajuste os filtros ou registre um novo lançamento.",
  emptyAction,
}: TransactionTableProps) {
  const lookups = useLookups();
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "amount" ? "desc" : "asc");
  };

  const sorted = sortBy(
    transactions,
    (item) => {
      switch (sortKey) {
        case "amount":
          return item.amount;
        case "description":
          return item.description.toLowerCase();
        case "status":
          return resolveStatus(item);
        default:
          return item.dueDate;
      }
    },
    sortDir,
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card">
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} action={emptyAction} variant="inline" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
      {/* Desktop: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[3.5rem]" />
              {COLUMNS.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground",
                      column.className?.includes("text-right") && "flex-row-reverse",
                    )}
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
              ))}
              <TableHead className="hidden lg:table-cell">Empresa</TableHead>
              <TableHead className="hidden xl:table-cell">Conta</TableHead>
              <TableHead className="hidden 2xl:table-cell">Categoria</TableHead>
              <TableHead className="w-[8.5rem] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => {
              const status = resolveStatus(row);
              return (
                <TableRow
                  key={row.id}
                  onClick={() => onSelect?.(row)}
                  className={cn(
                    onSelect && "cursor-pointer",
                  )}
                >
                  <TableCell className="pr-0">
                    <TypeMark row={row} />
                  </TableCell>
                  <TableCell>
                    <span className="block text-[13px] font-medium tabular">{formatDate(row.dueDate)}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {formatRelativeDay(row.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <span className="max-w-[13rem] truncate font-medium">{row.description}</span>
                      <InstallmentChip row={row} />
                    </span>
                    {row.counterparty && (
                      <span className="block max-w-[14.5rem] truncate text-[12px] text-muted-foreground">
                        {row.counterparty}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <MoneyValue value={row.amount} type={row.type} tone="auto" showSign size="sm" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} appearance="dot" />
                  </TableCell>
                  <TableCell className="hidden max-w-[8rem] truncate text-[13px] text-muted-foreground lg:table-cell">
                    {lookups.companyName(row.companyId)}
                  </TableCell>
                  <TableCell className="hidden max-w-[9.5rem] truncate text-[13px] text-muted-foreground xl:table-cell">
                    {lookups.accountName(row.accountId)}
                  </TableCell>
                  <TableCell className="hidden text-[13px] text-muted-foreground 2xl:table-cell">
                    {lookups.categoryName(row.categoryId)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(
                      <RowActions
                        transaction={row}
                        onSettle={onSettle}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cada lançamento vira um cartão tocável. */}
      <ul className="divide-y divide-border/50 md:hidden">
        {sorted.map((row) => {
          const status = resolveStatus(row);
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect?.(row)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60",
                )}
              >
                <TypeMark row={row} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{row.description}</span>
                    <InstallmentChip row={row} />
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {formatDate(row.dueDate)} · {lookups.companyName(row.companyId)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={status} appearance="dot" />
                  </div>
                </div>
                <MoneyValue
                  value={row.amount}
                  type={row.type}
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
    </div>
  );
}
