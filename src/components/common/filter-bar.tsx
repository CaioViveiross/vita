import type { ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Selects e demais controles específicos de cada página. */
  children?: ReactNode;
  /** Quantidade de filtros ativos — habilita o botão de limpar. */
  activeCount?: number;
  onClear?: () => void;
  className?: string;
  /** Ações à direita (ex.: alternar tabela/calendário). */
  trailing?: ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  children,
  activeCount = 0,
  onClear,
  className,
  trailing,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-soft", className)}>
      {/* Busca e filtros em linhas separadas: disputando a mesma linha, os
          selects de largura fixa não cabiam e quebravam de qualquer jeito —
          pior, de forma imprevisível conforme o painel de saldo abria. Assim
          os filtros têm a largura inteira do cartão para se distribuir. */}
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="border-transparent bg-muted/60 pl-10 focus-visible:bg-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
      </div>

      {children && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">{children}</div>

          {activeCount > 0 && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} className="shrink-0 sm:ml-auto">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Limpar ({activeCount})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
