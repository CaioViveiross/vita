import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[88px] w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth",
      "placeholder:text-muted-foreground/70",
      "focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10",
      "disabled:cursor-not-allowed disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
