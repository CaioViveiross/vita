import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapseHandleProps {
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
  top?: number;
}

/**
 * Alça de recolher/expandir pendurada na borda do painel (metade para fora).
 * Por ser um único elemento com posição fixa relativa ao contêiner — que é
 * quem anima a própria largura — ela acompanha a transição em vez de saltar
 * de lugar, como aconteceria com dois botões trocando de posição conforme o
 * estado.
 */
export function CollapseHandle({ side, collapsed, onToggle, expandLabel, collapseLabel, top }: CollapseHandleProps) {
  const pointsAway = side === "left" ? collapsed : !collapsed;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? expandLabel : collapseLabel}
      style={top === undefined ? undefined : { top }}
      className={cn(
        "absolute z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-soft transition-all duration-200 ease-smooth hover:scale-110 hover:text-foreground hover:shadow-card active:scale-95",
        top === undefined && "top-1/2",
        side === "left" ? "-right-3" : "-left-3",
      )}
    >
      <ChevronLeft
        className={cn("h-3.5 w-3.5 transition-transform duration-250 ease-smooth", pointsAway && "rotate-180")}
        strokeWidth={2.2}
      />
    </button>
  );
}
