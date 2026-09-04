import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Texto secundário exibido depois do rótulo (ex.: número da conta). */
  hint?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /**
   * Rótulo de "nenhum filtro". Seleção vazia significa "tudo" — é o mesmo
   * resultado de marcar todas as opções, e poupa o usuário de fazê-lo.
   */
  allLabel: string;
  /** Substantivo usado no resumo: "3 contas". */
  countLabel?: string;
  icon?: LucideIcon;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  allLabel,
  countLabel,
  icon: Icon,
  className,
}: MultiSelectProps) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const resumo =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ?? allLabel
        : `${selected.length} ${countLabel ?? "selecionados"}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          // Mesmas classes do `SelectTrigger` para os filtros ficarem
          // indistinguíveis entre si, já que convivem lado a lado.
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground transition-all duration-200 ease-smooth",
          "hover:border-border focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10",
          "data-[state=open]:border-primary/50 data-[state=open]:ring-4 data-[state=open]:ring-primary/10",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/80" />}
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground/70")}>{resumo}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      </DropdownMenuTrigger>

      {/* Largura mínima igual à do gatilho, mas livre para crescer: fixá-la
          truncava nomes de conta a ponto de não dar para distingui-las. */}
      <DropdownMenuContent
        align="start"
        className="max-h-80 min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(22rem,calc(100vw-2rem))] overflow-y-auto"
      >
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            // Sem isso o menu fecha a cada clique, o que inviabiliza marcar
            // várias opções seguidas.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => toggle(option.value)}
          >
            <span className="truncate">
              {option.label}
              {option.hint && <span className="text-muted-foreground"> · {option.hint}</span>}
            </span>
          </DropdownMenuCheckboxItem>
        ))}

        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>Limpar seleção</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
