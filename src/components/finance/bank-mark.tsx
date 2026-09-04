import { cn } from "@/lib/utils";

/**
 * Identidade visual dos bancos.
 *
 * Tons dessaturados de propósito: a cor aqui serve para reconhecimento rápido
 * da conta, sem competir com o verde que sinaliza estado financeiro.
 */

/** Paleta oferecida no cadastro do banco. */
export const BANK_MARK_COLORS = [
  "#a55b09",
  "#b3211a",
  "#a3103a",
  "#6b2fb0",
  "#8a6d0a",
  "#28368f",
  "#a8401d",
  "#0f766e",
  "#475569",
];

/** Iniciais do banco: "Banco do Brasil" → "BB", "Itaú Unibanco" → "IU". */
function bankInitials(bank: string): string {
  const words = bank
    .split(/\s+/)
    .filter((word) => word.length > 2 || /^[A-Z]/.test(word))
    .filter((word) => !["do", "de", "da", "dos", "das"].includes(word.toLowerCase()));
  if (words.length === 0) return bank.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export interface BankMarkProps {
  /** Nome do banco — as iniciais saem daqui. */
  name: string;
  /** Cor do cadastro do banco. Ausente (banco não encontrado), cai no neutro. */
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 rounded-lg text-[11px]",
  md: "h-10 w-10 rounded-xl text-[12.5px]",
  lg: "h-12 w-12 rounded-2xl text-sm",
};

export function BankMark({ name, color, size = "md", className }: BankMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold tracking-tight",
        sizes[size],
        !color && "bg-muted text-muted-foreground",
        className,
      )}
      style={color ? { backgroundColor: `color-mix(in srgb, ${color} 16%, white)`, color } : undefined}
      aria-hidden
    >
      {bankInitials(name)}
    </span>
  );
}
