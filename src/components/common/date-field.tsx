import * as React from "react";
import { CalendarDays } from "lucide-react";
import type { ISODate } from "@/types";
import { cn } from "@/lib/utils";

export interface DateFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: ISODate;
  onChange: (value: ISODate) => void;
}

/**
 * Seletor de data.
 *
 * Usa o campo nativo do navegador — que já entrega o calendário localizado e o
 * teclado correto no celular — dentro da mesma moldura visual dos demais campos.
 */
export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, value, onChange, ...props }, ref) => (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-card py-2 pl-10 pr-3 text-sm text-foreground transition-all duration-200 ease-smooth",
          "focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-70",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
DateField.displayName = "DateField";
