import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MoneyValue } from "@/components/common/money-value";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Accent = "neutral" | "positive" | "negative" | "primary";

const accents: Record<Accent, { icon: string; value: string }> = {
  neutral: { icon: "bg-muted text-muted-foreground", value: "text-foreground" },
  primary: { icon: "bg-primary-soft text-primary-deep", value: "text-foreground" },
  positive: { icon: "bg-success-soft text-success", value: "text-success" },
  negative: { icon: "bg-danger-soft text-danger", value: "text-danger" },
};

export interface FinancialCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: Accent;
  /** Variação percentual contra o período anterior. */
  change?: number;
  /** Texto de apoio abaixo do valor (ex.: "12 lançamentos"). */
  hint?: string;
  /** Quando `true`, o valor recebe sinal explícito — usado no resultado previsto. */
  signed?: boolean;
  footer?: ReactNode;
  className?: string;
}

/** Indicador de tendência: seta e percentual coloridos conforme a direção. */
function Trend({ change, invert }: { change: number; invert?: boolean }) {
  const flat = Math.abs(change) < 0.05;
  // Em despesas, subir é ruim: `invert` troca a leitura de cor.
  const good = invert ? change < 0 : change > 0;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11.5px] font-medium tabular",
        flat ? "bg-muted text-muted-foreground" : good ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.4} />
      {flat ? "estável" : formatPercent(change)}
    </span>
  );
}

export function FinancialCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  change,
  hint,
  signed = false,
  footer,
  className,
}: FinancialCardProps) {
  const styles = accents[accent];

  return (
    <Card className={cn("group p-5 hover:shadow-card sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-smooth group-hover:scale-105",
            styles.icon,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>

      <div className="mt-4">
        <MoneyValue
          value={value}
          size="lg"
          showSign={signed}
          tone={accent === "positive" ? "positive" : accent === "negative" ? "negative" : signed ? "auto" : "neutral"}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {typeof change === "number" && <Trend change={change} invert={accent === "negative"} />}
        {hint && <span className="text-[12.5px] text-muted-foreground">{hint}</span>}
      </div>

      {footer && <div className="mt-4 border-t border-border/60 pt-3">{footer}</div>}
    </Card>
  );
}
