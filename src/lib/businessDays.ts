import type { Holiday, ISODate, NonBusinessDayRule } from "@/types";
import { addDays, toDate } from "@/lib/date";

/**
 * Calendário de feriados.
 *
 * Hoje é uma lista estática de feriados nacionais. A assinatura das funções
 * recebe o calendário como parâmetro justamente para que, no futuro, ele possa
 * vir da API já mesclado com os feriados regionais de cada empresa.
 */
export const NATIONAL_HOLIDAYS: Holiday[] = [
  { date: "2026-01-01", name: "Confraternização Universal", scope: "nacional" },
  { date: "2026-02-16", name: "Carnaval", scope: "nacional" },
  { date: "2026-02-17", name: "Carnaval", scope: "nacional" },
  { date: "2026-04-03", name: "Sexta-feira Santa", scope: "nacional" },
  { date: "2026-04-21", name: "Tiradentes", scope: "nacional" },
  { date: "2026-05-01", name: "Dia do Trabalho", scope: "nacional" },
  { date: "2026-06-04", name: "Corpus Christi", scope: "nacional" },
  { date: "2026-09-07", name: "Independência do Brasil", scope: "nacional" },
  { date: "2026-10-12", name: "Nossa Senhora Aparecida", scope: "nacional" },
  { date: "2026-11-02", name: "Finados", scope: "nacional" },
  { date: "2026-11-15", name: "Proclamação da República", scope: "nacional" },
  { date: "2026-11-20", name: "Consciência Negra", scope: "nacional" },
  { date: "2026-12-25", name: "Natal", scope: "nacional" },
  { date: "2027-01-01", name: "Confraternização Universal", scope: "nacional" },
  { date: "2027-02-08", name: "Carnaval", scope: "nacional" },
  { date: "2027-02-09", name: "Carnaval", scope: "nacional" },
  { date: "2027-03-26", name: "Sexta-feira Santa", scope: "nacional" },
  { date: "2027-04-21", name: "Tiradentes", scope: "nacional" },
  { date: "2027-05-01", name: "Dia do Trabalho", scope: "nacional" },
];

export function isWeekend(iso: ISODate): boolean {
  const weekday = toDate(iso).getDay();
  return weekday === 0 || weekday === 6;
}

export function findHoliday(iso: ISODate, holidays: Holiday[] = NATIONAL_HOLIDAYS): Holiday | undefined {
  return holidays.find((holiday) => holiday.date === iso);
}

export function isBusinessDay(iso: ISODate, holidays: Holiday[] = NATIONAL_HOLIDAYS): boolean {
  return !isWeekend(iso) && !findHoliday(iso, holidays);
}

/** Motivo pelo qual uma data não é útil — usado nas explicações da interface. */
export function nonBusinessReason(iso: ISODate, holidays: Holiday[] = NATIONAL_HOLIDAYS): string | null {
  const holiday = findHoliday(iso, holidays);
  if (holiday) return holiday.name;
  if (isWeekend(iso)) return toDate(iso).getDay() === 0 ? "Domingo" : "Sábado";
  return null;
}

/**
 * Aplica a regra de dia não útil sobre uma data prevista.
 * Retorna a data original quando ela já é um dia útil ou quando a regra é `manter`.
 */
export function applyBusinessDayRule(
  iso: ISODate,
  rule: NonBusinessDayRule,
  holidays: Holiday[] = NATIONAL_HOLIDAYS,
): ISODate {
  if (rule === "manter" || isBusinessDay(iso, holidays)) return iso;

  const step = rule === "antecipar" ? -1 : 1;
  let cursor = iso;
  // 10 passos cobrem com folga a maior sequência de feriados emendados.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    cursor = addDays(cursor, step);
    if (isBusinessDay(cursor, holidays)) return cursor;
  }
  return cursor;
}

/** Descreve o ajuste aplicado, para exibir junto da próxima ocorrência. */
export interface AdjustedDate {
  original: ISODate;
  effective: ISODate;
  adjusted: boolean;
  reason: string | null;
}

export function resolveDueDate(
  iso: ISODate,
  rule: NonBusinessDayRule,
  holidays: Holiday[] = NATIONAL_HOLIDAYS,
): AdjustedDate {
  const effective = applyBusinessDayRule(iso, rule, holidays);
  return {
    original: iso,
    effective,
    adjusted: effective !== iso,
    reason: nonBusinessReason(iso, holidays),
  };
}
