import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TransactionStatus } from "@/types";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/finance";
import { cn } from "@/lib/utils";

interface StatusStyle {
  variant: BadgeProps["variant"];
  icon: LucideIcon;
  dot: string;
}

/** Vocabulário visual único dos estados financeiros, usado em toda a aplicação. */
export const STATUS_STYLES: Record<TransactionStatus, StatusStyle> = {
  pendente: { variant: "warning", icon: Clock, dot: "bg-warning" },
  pago: { variant: "success", icon: CheckCircle2, dot: "bg-success" },
  recebido: { variant: "success", icon: CheckCircle2, dot: "bg-success" },
  atrasado: { variant: "danger", icon: AlertTriangle, dot: "bg-danger" },
};

export interface StatusBadgeProps {
  status: TransactionStatus;
  /** `dot` é mais discreto e cabe melhor dentro de tabelas densas. */
  appearance?: "icon" | "dot";
  className?: string;
}

export function StatusBadge({ status, appearance = "icon", className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;

  return (
    <Badge variant={style.variant} className={cn("whitespace-nowrap", className)}>
      {appearance === "icon" ? (
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      )}
      {STATUS_LABELS[status]}
    </Badge>
  );
}
