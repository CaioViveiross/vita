import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ISODate } from "@/types";
import { WEEKDAYS_SHORT, addMonths, formatDate, formatMonthYear, isSameMonth, monthGrid, startOfMonth } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface ScheduleCalendarProps {
  /** Vencimentos da série, já com os ajustes de dia não útil aplicados. */
  dates: ISODate[];
  className?: string;
}

/**
 * Calendário das parcelas de uma repetição.
 *
 * Uma lista de datas responde "quando", mas não "como elas se distribuem" —
 * é no calendário que se percebe que todo vencimento cai num sábado, ou que
 * dois deles caem na mesma semana. Mostra um mês por vez porque uma série de
 * 12 parcelas empilharia 12 grades dentro de um formulário.
 */
export function ScheduleCalendar({ dates, className }: ScheduleCalendarProps) {
  const marcadas = useMemo(() => new Set(dates), [dates]);
  const [mes, setMes] = useState<ISODate>(() => startOfMonth(dates[0] ?? new Date().toISOString().slice(0, 10)));

  const dias = useMemo(() => monthGrid(mes), [mes]);
  const noMes = useMemo(() => dates.filter((date) => isSameMonth(date, mes)).length, [dates, mes]);

  // Navegar além da série não tem utilidade e só dá a sensação de estar perdido.
  const primeiro = dates[0] ? startOfMonth(dates[0]) : mes;
  const ultimo = dates.length > 0 ? startOfMonth(dates[dates.length - 1]) : mes;
  const podeVoltar = mes > primeiro;
  const podeAvancar = mes < ultimo;

  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/30 p-3.5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMes(addMonths(mes, -1))}
          disabled={!podeVoltar}
          aria-label="Mês anterior"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="text-[12.5px] font-medium">
          {/* `capitalize` do CSS maiusculiza cada palavra ("Setembro De 2026");
              só a primeira letra da frase deve subir. */}
          <span className="inline-block first-letter:uppercase">{formatMonthYear(mes)}</span>
          {noMes > 0 && (
            <span className="ml-1.5 font-normal text-muted-foreground">
              · {noMes} {noMes === 1 ? "parcela" : "parcelas"}
            </span>
          )}
        </p>

        <button
          type="button"
          onClick={() => setMes(addMonths(mes, 1))}
          disabled={!podeAvancar}
          aria-label="Próximo mês"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS_SHORT.map((dia) => (
          <span key={dia} className="pb-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
            {dia}
          </span>
        ))}

        {dias.map((dia) => {
          const doMes = isSameMonth(dia, mes);
          // Só acende no mês a que o dia pertence: a grade mostra a virada do
          // mês seguinte, e marcar ali faria a mesma parcela aparecer duas
          // vezes ao navegar entre os meses.
          const marcado = doMes && marcadas.has(dia);

          return (
            <span
              key={dia}
              title={marcado ? formatDate(dia) : undefined}
              className={cn(
                "tabular flex h-7 items-center justify-center rounded-md text-[11.5px]",
                !doMes && "text-muted-foreground/35",
                doMes && !marcado && "text-muted-foreground",
                marcado && "bg-primary font-semibold text-primary-foreground",
              )}
            >
              {Number(dia.slice(8, 10))}
            </span>
          );
        })}
      </div>
    </div>
  );
}
