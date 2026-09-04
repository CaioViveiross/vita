import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-[inset_0_1px_1px_rgba(16,34,28,0.02)] transition-all duration-200 ease-smooth",
      "placeholder:text-muted-foreground/70",
      "focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
      "disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-70",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
