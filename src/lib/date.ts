import type { DateRange, ISODate, PeriodPreset } from "@/types";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT };

/**
 * Todas as datas trafegam como `YYYY-MM-DD` e são manipuladas em horário local
 * ao meio-dia, evitando que o fuso empurre o dia para trás ou para frente.
 */
export function toDate(iso: ISODate): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toISO(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = toDate(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const date = toDate(iso);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(targetDay, daysInMonth(date.getFullYear(), date.getMonth())));
  return toISO(date);
}

export function addYears(iso: ISODate, years: number): ISODate {
  const date = toDate(iso);
  date.setFullYear(date.getFullYear() + years);
  return toISO(date);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Diferença em dias inteiros: positivo quando `a` é posterior a `b`. */
export function diffInDays(a: ISODate, b: ISODate): number {
  const ms = toDate(a).getTime() - toDate(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return a < b;
}

export function isAfter(a: ISODate, b: ISODate): boolean {
  return a > b;
}

export function isSameDay(a: ISODate, b: ISODate): boolean {
  return a === b;
}

export function isWithin(iso: ISODate, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to;
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: ISODate): ISODate {
  const date = toDate(iso);
  return toISO(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}

/* -------------------------------------------------------------------------- */
/* Formatação                                                                  */
/* -------------------------------------------------------------------------- */

/** `28/08/2026` */
export function formatDate(iso: ISODate): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** `28/08` */
export function formatShortDate(iso: ISODate): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

/** `28 AGO` — usado na timeline de próximos lançamentos. */
export function formatDayMonth(iso: ISODate): { day: string; month: string } {
  const date = toDate(iso);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: MONTHS_SHORT[date.getMonth()].toUpperCase(),
  };
}

/**
 * `Sexta-feira, 28 de agosto`
 *
 * Já vem capitalizado: a classe `capitalize` do CSS afetaria também o "de".
 */
export function formatLongDate(iso: ISODate): string {
  const date = toDate(iso);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()].toLowerCase()}`;
}

export function formatMonthYear(iso: ISODate): string {
  const date = toDate(iso);
  return `${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/** `Hoje`, `Ontem`, `Amanhã`, `em 3 dias`, `há 5 dias`. */
export function formatRelativeDay(iso: ISODate, reference: ISODate = today()): string {
  const delta = diffInDays(iso, reference);
  if (delta === 0) return "Hoje";
  if (delta === 1) return "Amanhã";
  if (delta === -1) return "Ontem";
  if (delta > 1 && delta <= 30) return `em ${delta} dias`;
  if (delta < -1 && delta >= -30) return `há ${Math.abs(delta)} dias`;
  return formatDate(iso);
}

/* -------------------------------------------------------------------------- */
/* Períodos                                                                    */
/* -------------------------------------------------------------------------- */

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  hoje: "Hoje",
  "7d": "Próximos 7 dias",
  "30d": "Próximos 30 dias",
  "90d": "Próximos 90 dias",
  mes: "Este mês",
  custom: "Personalizado",
};

export function rangeFromPreset(preset: PeriodPreset, reference: ISODate = today()): DateRange {
  switch (preset) {
    case "hoje":
      return { from: reference, to: reference };
    case "7d":
      return { from: reference, to: addDays(reference, 6) };
    case "30d":
      return { from: reference, to: addDays(reference, 29) };
    case "90d":
      return { from: reference, to: addDays(reference, 89) };
    case "mes":
      return { from: startOfMonth(reference), to: endOfMonth(reference) };
    default:
      return { from: reference, to: addDays(reference, 29) };
  }
}

/** Período imediatamente anterior, de mesma duração — base das comparações. */
export function previousRange(range: DateRange): DateRange {
  const span = diffInDays(range.to, range.from) + 1;
  return { from: addDays(range.from, -span), to: addDays(range.to, -span) };
}

/** Lista de todos os dias do intervalo, inclusive. */
export function eachDay(range: DateRange): ISODate[] {
  const days: ISODate[] = [];
  let cursor = range.from;
  let guard = 0;
  while (cursor <= range.to && guard < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

/**
 * Grade de um mês para o calendário: sempre 6 semanas completas,
 * começando no domingo, com os dias vizinhos incluídos.
 */
export function monthGrid(iso: ISODate): ISODate[] {
  const first = toDate(startOfMonth(iso));
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toISO(date);
  });
}

export function isSameMonth(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}
