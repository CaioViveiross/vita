import { Building2, MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react";
import type { Company } from "@/types";
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
import { cn, initialsFrom } from "@/lib/utils";

export interface CompanyCardProps {
  company: Company;
  /** Saldo consolidado das contas da empresa. */
  balance: number;
  accountCount: number;
  transactionCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function CompanyCard({
  company,
  balance,
  accountCount,
  transactionCount,
  onEdit,
  onDelete,
  className,
}: CompanyCardProps) {
  return (
    <Card className={cn("group p-5 transition-shadow duration-200 hover:shadow-card sm:p-6", className)}>
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-semibold"
          style={{
            backgroundColor: `${company.color ?? "#0f766e"}14`,
            color: company.color ?? "#0f766e",
          }}
        >
          {company.initials ?? initialsFrom(company.name)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{company.name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{company.legalName}</p>
          <p className="mt-1 tabular text-[12.5px] text-muted-foreground">{company.taxId}</p>
        </div>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-1 -mt-1 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                aria-label="Ações da empresa"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil /> Editar empresa
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={onDelete}>
                    <Trash2 /> Excluir empresa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-border/60 pt-4">
        <div>
          <p className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Saldo consolidado</p>
          <MoneyValue value={balance} size="lg" tone={balance < 0 ? "negative" : "neutral"} className="mt-1 block" />
        </div>
        {!company.active && <Badge variant="muted">Inativa</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          {accountCount} {accountCount === 1 ? "conta" : "contas"}
        </span>
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          {transactionCount} {transactionCount === 1 ? "movimentação" : "movimentações"}
        </span>
      </div>
    </Card>
  );
}
