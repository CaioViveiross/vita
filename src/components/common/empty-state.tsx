import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** `inline` remove a moldura — usado dentro de cards que já têm borda. */
  variant?: "framed" | "inline";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "framed",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        variant === "framed" && "rounded-2xl border border-dashed border-border bg-card/40",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
