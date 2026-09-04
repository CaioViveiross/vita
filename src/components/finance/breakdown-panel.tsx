import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Landmark, Minus } from "lucide-react";
import type { DateRange, Transaction, TransactionType } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyValue } from "@/components/common/money-value";
import { EmptyState } from "@/components/common/empty-state";
import { BankMark } from "@/components/finance/bank-mark";
import { useLookups } from "@/hooks/use-lookups";
import { buildBreakdown, inRange } from "@/lib/finance";
import { formatPercent } from "@/lib/format";
import { cn, percentChange } from "@/lib/utils";

type Dimension = "categoria" | "empresa" | "conta" | "banco";

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "categoria", label: "Categoria" },
  { value: "empresa", label: "Empresa" },
  { value: "conta", label: "Conta" },
  { value: "banco", label: "Banco" },
];

/** Quantas linhas cabem sem o cartão virar uma segunda tabela de lançamentos. */
const LIMIT = 6;

export interface BreakdownPanelProps {
  transactions: Transaction[];
  range: DateRange;
  previous: DateRange;
  className?: string;
}

export function BreakdownPanel({ transactions, range, previous, className }: BreakdownPanelProps) {
  const [dimension, setDimension] = useState<Dimension>("categoria");
  const [type, setType] = useState<TransactionType>("saida");
  const lookups = useLookups();

  const entries = useMemo(() => {
    const ofType = (items: Transaction[]) => items.filter((item) => item.type === type);
    const current = ofType(inRange(transactions, range));
    const before = ofType(inRange(transactions, previous));

    const keyOf = (item: Transaction) => {
      switch (dimension) {
        case "categoria":
          return item.categoryId;
        case "empresa":
          return item.companyId;
        case "conta":
          return item.accountId;
        case "banco":
          return item.accountId ? lookups.accountById.get(item.accountId)?.bankId : null;
      }
    };

    return buildBreakdown(current, before, keyOf, "sem-vinculo");
  }, [transactions, range, previous, type, dimension, lookups]);

  const rotulo = (key: string) => {
    if (key === "sem-vinculo") return "Sem vínculo";
    switch (dimension) {
      case "categoria":
        return lookups.categoryName(key);
      case "empresa":
        return lookups.companyName(key);
      case "conta":
        return lookups.accountName(key);
      case "banco":
        return lookups.bankName(key);
    }
  };

  const visible = entries.slice(0, LIMIT);
  const restante = entries.slice(LIMIT);
  const totalRestante = restante.reduce((acc, entry) => acc + entry.value, 0);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>{type === "saida" ? "Para onde vai o dinheiro" : "De onde vem o dinheiro"}</CardTitle>
          <CardDescription>
            Comparado ao período anterior de mesma duração.
          </CardDescription>
        </div>

        <Tabs value={type} onValueChange={(value) => setType(value as TransactionType)}>
          <TabsList>
            <TabsTrigger value="saida">Saídas</TabsTrigger>
            <TabsTrigger value="entrada">Entradas</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Tabs value={dimension} onValueChange={(value) => setDimension(value as Dimension)}>
          <TabsList className="mb-4">
            {DIMENSIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {visible.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Nada a comparar"
            description={`Nenhuma ${type === "saida" ? "saída" : "entrada"} no período selecionado.`}
            variant="inline"
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((entry) => {
              // Sem período anterior não há variação a mostrar: percentual
              // contra zero não significa nada, então a linha é marcada como
              // "novo" e fica sem seta.
              const novo = entry.previous === 0;
              const change = percentChange(entry.value, entry.previous);
              const flat = !novo && Math.abs(change) < 0.05;
              // Em saídas, crescer é ruim; em entradas, é bom.
              const good = type === "saida" ? change < 0 : change > 0;
              const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
              const bank = dimension === "banco" ? lookups.bankById.get(entry.key) : undefined;

              return (
                <li key={entry.key} className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    {bank && <BankMark name={bank.name} color={bank.color} size="sm" />}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium leading-tight">
                        {rotulo(entry.key)}
                      </span>
                      <span className="tabular text-[11.5px] text-muted-foreground">
                        {entry.count} {entry.count === 1 ? "lançamento" : "lançamentos"} ·{" "}
                        {/* `formatPercent` prefixa "+" em positivos, o que não
                            faz sentido para uma fatia do total. */}
                        {Math.round(entry.share * 100)}% do total
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <MoneyValue value={entry.value} size="sm" tone={type === "saida" ? "negative" : "positive"} />
                      <span
                        className={cn(
                          "tabular inline-flex items-center gap-0.5 text-[11.5px] font-medium",
                          novo || flat ? "text-muted-foreground" : good ? "text-success" : "text-danger",
                        )}
                      >
                        {!novo && <Icon className="h-3 w-3" strokeWidth={2.4} />}
                        {novo ? "sem base anterior" : flat ? "estável" : formatPercent(change)}
                      </span>
                    </span>
                  </div>

                  {/* A barra dá a proporção de relance — a leitura que o número
                      sozinho não entrega quando se compara seis linhas. */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500 ease-panel",
                        type === "saida" ? "bg-danger/70" : "bg-success/70",
                      )}
                      style={{ width: `${Math.max(entry.share * 100, 1.5)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {restante.length > 0 && (
          <p className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[12.5px] text-muted-foreground">
            <span>
              + {restante.length} {restante.length === 1 ? "outro" : "outros"}
            </span>
            <MoneyValue value={totalRestante} size="xs" tone="muted" />
          </p>
        )}
      </div>
    </Card>
  );
}
