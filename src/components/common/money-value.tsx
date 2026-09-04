import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { TransactionType } from "@/types";

type Tone = "neutral" | "positive" | "negative" | "muted" | "auto";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<Size, string> = {
  xs: "text-[13px]",
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl tracking-tight",
  xl: "text-[2rem] leading-none tracking-tight sm:text-[2.5rem]",
};

const tones: Record<Exclude<Tone, "auto">, string> = {
  neutral: "text-foreground",
  positive: "text-success",
  negative: "text-danger",
  muted: "text-muted-foreground",
};

export interface MoneyValueProps {
  value: number;
  /** `auto` deriva o tom do sinal do valor. */
  tone?: Tone;
  size?: Size;
  /** Prefixa `+`/`−` — útil em listas mistas de entradas e saídas. */
  showSign?: boolean;
  /** Quando informado, o sinal segue o tipo do lançamento e não o valor. */
  type?: TransactionType;
  className?: string;
}

/**
 * Exibição monetária padronizada: sempre `R$ 0.000,00`, com numerais tabulares
 * para que colunas de valores fiquem alinhadas.
 */
export function MoneyValue({
  value,
  tone = "neutral",
  size = "md",
  showSign = false,
  type,
  className,
}: MoneyValueProps) {
  const effective = type ? (type === "entrada" ? Math.abs(value) : -Math.abs(value)) : value;
  const resolvedTone: Exclude<Tone, "auto"> =
    tone === "auto" ? (effective > 0 ? "positive" : effective < 0 ? "negative" : "muted") : tone;

  const sign = showSign ? (effective >= 0 ? "+ " : "− ") : effective < 0 ? "− " : "";

  return (
    <span className={cn("tabular font-semibold", sizes[size], tones[resolvedTone], className)}>
      {sign}
      {formatCurrency(Math.abs(effective))}
    </span>
  );
}
