import { Landmark, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Account, Bank } from "@/types";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/empty-state";
import { BankMark } from "@/components/finance/bank-mark";

export interface BankListProps {
  banks: Bank[];
  /** Usado para contar as contas de cada banco e travar a exclusão. */
  accounts: Account[];
  onCreate: () => void;
  onEdit: (bank: Bank) => void;
  onDelete: (bank: Bank) => void;
}

export function BankList({ banks, accounts, onCreate, onEdit, onDelete }: BankListProps) {
  if (banks.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="Nenhum banco cadastrado"
        description="Cadastre o banco primeiro; depois abra nele quantas contas precisar."
        action={
          <Button onClick={onCreate}>
            <Plus /> Novo banco
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {banks.map((bank) => {
        const linked = accounts.filter((account) => account.bankId === bank.id).length;

        return (
          <Card key={bank.id} className="group flex items-center gap-3.5 p-5">
            <BankMark name={bank.name} color={bank.color} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{bank.name}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                {bank.code ? <span className="tabular">Código {bank.code}</span> : "Sem código"}
              </p>
            </div>

            <Badge variant="muted" className="shrink-0">
              {linked} {linked === 1 ? "conta" : "contas"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mr-1 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                  aria-label={`Ações de ${bank.name}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(bank)}>
                  <Pencil /> Editar banco
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Excluir um banco com contas deixaria `Account.bankId`
                    apontando para o vazio — em vez de esconder a ação, ela
                    fica visível e explica por que não dá. */}
                {linked > 0 ? (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem destructive disabled>
                          <Trash2 /> Excluir banco
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Há {linked} {linked === 1 ? "conta vinculada" : "contas vinculadas"} a este banco.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <DropdownMenuItem destructive onSelect={() => onDelete(bank)}>
                    <Trash2 /> Excluir banco
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        );
      })}
    </div>
  );
}
