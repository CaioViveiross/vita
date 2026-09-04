import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Pencil,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Recurrence, Transaction } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MoneyValue } from "@/components/common/money-value";
import { StatusBadge } from "@/components/common/status-badge";
import { useLookups } from "@/hooks/use-lookups";
import { formatDate, formatRelativeDay } from "@/lib/date";
import { isSettled, resolveStatus } from "@/lib/finance";
import { maskAccountNumber } from "@/lib/format";
import { describeDuration, describeSchedule } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export interface TransactionDetailsDialogProps {
  /** O lançamento aberto; `null` mantém o diálogo fechado. */
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: Transaction) => void;
  onSettle?: (transaction: Transaction) => void;
  onReopen?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  /** A série que originou a linha, quando ela existe — mostra o ciclo e a duração. */
  recurrence?: Recurrence | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function TransactionDetailsDialog({
  transaction,
  onOpenChange,
  onEdit,
  onSettle,
  onReopen,
  onDelete,
  recurrence,
}: TransactionDetailsDialogProps) {
  const lookups = useLookups();
  if (!transaction) return null;

  const status = resolveStatus(transaction);
  const account = transaction.accountId ? lookups.accountById.get(transaction.accountId) : undefined;
  const settled = isSettled(transaction);
  const isIncome = transaction.type === "entrada";
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <Dialog open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isIncome ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate">{transaction.description}</DialogTitle>
              <DialogDescription>
                {isIncome ? "Entrada" : "Saída"} · {formatDate(transaction.dueDate)} ·{" "}
                {formatRelativeDay(transaction.dueDate)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3.5">
          <MoneyValue value={transaction.amount} type={transaction.type} size="lg" tone="auto" showSign />
          <StatusBadge status={status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Empresa">{lookups.companyName(transaction.companyId)}</Field>
          <Field label="Conta">
            {account ? (
              <span>
                {account.name}
                <span className="ml-1.5 text-muted-foreground tabular">{maskAccountNumber(account.number)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Sem conta vinculada</span>
            )}
          </Field>
          <Field label="Categoria">{lookups.categoryName(transaction.categoryId)}</Field>
          <Field label={isIncome ? "Receita" : "Despesa"}>{lookups.expenseName(transaction.expenseId)}</Field>
          {transaction.counterparty && (
            <Field label={isIncome ? "Cliente" : "Fornecedor"}>{transaction.counterparty}</Field>
          )}
          {transaction.settledAt && (
            <Field label={isIncome ? "Recebido em" : "Pago em"}>{formatDate(transaction.settledAt)}</Field>
          )}
          {transaction.recurrenceId && (
            <Field label="Repetição">
              <span className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 shrink-0 text-info" />
                {recurrence ? describeSchedule(recurrence) : "Gerado por uma série"}
              </span>
              {recurrence && (
                <span className="block text-[12px] text-muted-foreground">{describeDuration(recurrence)}</span>
              )}
            </Field>
          )}
        </dl>

        {transaction.notes && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Observação</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{transaction.notes}</p>
            </div>
          </>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(transaction)} className="text-danger hover:bg-danger-soft hover:text-danger">
                <Trash2 /> Excluir
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(transaction)}>
                <Pencil /> Editar
              </Button>
            )}
            {settled
              ? onReopen && (
                  <Button variant="outline" size="sm" onClick={() => onReopen(transaction)}>
                    <RotateCcw /> Reabrir
                  </Button>
                )
              : onSettle && (
                  <Button size="sm" onClick={() => onSettle(transaction)}>
                    <Check /> Marcar como {isIncome ? "recebido" : "pago"}
                  </Button>
                )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
