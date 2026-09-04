import { MoreHorizontal, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { AccountBalance } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyValue } from "@/components/common/money-value";
import { BankMark } from "@/components/finance/bank-mark";
import { useLookups } from "@/hooks/use-lookups";
import { formatCurrency, maskAccountNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  investimento: "Investimento",
  caixa: "Caixa",
} as const;

export interface AccountCardProps {
  balance: AccountBalance;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  /** Exibe agência, tipo e projeção — usado na página de Contas. */
  detailed?: boolean;
  className?: string;
}

export function AccountCard({ balance, onEdit, onDelete, onClick, detailed = false, className }: AccountCardProps) {
  const { account, company, current, projected } = balance;
  const { bankById } = useLookups();
  const bank = bankById.get(account.bankId);
  const delta = projected - current;
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <Card
      className={cn(
        "group relative p-5 transition-all duration-200 ease-smooth",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card",
        !account.active && "opacity-60",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <BankMark name={bank?.name ?? "—"} color={bank?.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{account.name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
            {bank?.name ?? "Sem banco"} · <span className="tabular">{maskAccountNumber(account.number)}</span>
          </p>
        </div>

        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-1 -mt-1 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                onClick={(event) => event.stopPropagation()}
                aria-label="Ações da conta"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              {onEdit && (
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil /> Editar conta
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={onDelete}>
                    <Trash2 /> Excluir conta
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-5">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Saldo atual</p>
        <MoneyValue value={current} size="lg" tone={current < 0 ? "negative" : "neutral"} className="mt-1 block" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{company.name}</Badge>
        {detailed && <Badge variant="muted">{TYPE_LABELS[account.type]}</Badge>}
        {!account.active && <Badge variant="muted">Inativa</Badge>}
      </div>

      {detailed && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-[12.5px]">
          <div>
            <dt className="text-muted-foreground">Agência</dt>
            <dd className="tabular font-medium">{account.branch}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Saldo de abertura</dt>
            <dd className="tabular font-medium">{formatCurrency(account.openingBalance)}</dd>
          </div>
        </dl>
      )}

      {Math.abs(delta) > 0.005 && (
        <p className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-[12.5px] text-muted-foreground">
          {delta >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-danger" />
          )}
          Projeção do período:{" "}
          <span className={cn("tabular font-medium", delta >= 0 ? "text-success" : "text-danger")}>
            {formatCurrency(projected)}
          </span>
        </p>
      )}
    </Card>
  );
}
