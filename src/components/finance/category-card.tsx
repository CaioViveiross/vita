import { useState } from "react";
import { ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Category, Expense } from "@/types";
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
import { cn } from "@/lib/utils";

export interface CategoryCardProps {
  category: Category;
  expenses: Expense[];
  /** Total movimentado na categoria dentro do período selecionado. */
  total: number;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onCreateExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  className?: string;
}

export function CategoryCard({
  category,
  expenses,
  total,
  onEditCategory,
  onDeleteCategory,
  onCreateExpense,
  onEditExpense,
  onDeleteExpense,
  className,
}: CategoryCardProps) {
  const [open, setOpen] = useState(true);
  const isIncome = category.kind === "entrada";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-start gap-3.5 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold leading-tight">{category.name}</h3>
            <Badge variant={isIncome ? "success" : "muted"}>{isIncome ? "Entrada" : "Saída"}</Badge>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{category.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Ações da categoria">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEditCategory}>
                <Pencil /> Editar categoria
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onCreateExpense}>
                <Plus /> Nova {isIncome ? "receita" : "despesa"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={onDeleteCategory}>
                <Trash2 /> Excluir categoria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={open}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200 ease-smooth", open && "rotate-90")} />
          {expenses.length} {expenses.length === 1 ? "item" : "itens"}
        </button>
        <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          No período
          <MoneyValue value={total} size="sm" tone={total === 0 ? "muted" : isIncome ? "positive" : "neutral"} />
        </span>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-border/60 bg-muted/25 px-5 py-3">
          {expenses.length === 0 ? (
            <p className="py-3 text-center text-[12.5px] text-muted-foreground">
              Nenhum item cadastrado nesta categoria.
            </p>
          ) : (
            <ul className="relative space-y-0.5">
              {expenses.map((expense) => (
                <li key={expense.id} className="group relative flex items-center gap-3 rounded-lg py-1.5 pl-5 pr-1">
                  {/* Conector da árvore categoria → item. */}
                  <span className="absolute left-1 top-0 h-full w-px bg-border" aria-hidden />
                  <span className="absolute left-1 top-1/2 h-px w-2.5 bg-border" aria-hidden />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]">{expense.name}</span>
                    {expense.description && (
                      <span className="block truncate text-[12px] text-muted-foreground">{expense.description}</span>
                    )}
                  </span>

                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEditExpense(expense)} aria-label="Editar item">
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDeleteExpense(expense)}
                      aria-label="Excluir item"
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Button variant="ghost" size="sm" onClick={onCreateExpense} className="mt-2 w-full justify-start">
            <Plus /> Adicionar {isIncome ? "receita" : "despesa"}
          </Button>
        </div>
      )}
    </Card>
  );
}
