import type { Frequency, Holiday, ISODate, NonBusinessDayRule, Recurrence } from "@/types";
import { addDays, addMonths, addYears, daysInMonth, formatDate, toDate, today, toISO } from "@/lib/date";
import {
  applyBusinessDayRule,
  isBusinessDay,
  NATIONAL_HOLIDAYS,
  nonBusinessReason,
  resolveDueDate,
  type AdjustedDate,
} from "@/lib/businessDays";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  anual: "Anual",
};

/** Como cada frequência conta a duração: "repetir por 5 meses". */
export const CYCLE_NOUNS: Record<Frequency, [singular: string, plural: string]> = {
  diaria: ["dia", "dias"],
  semanal: ["semana", "semanas"],
  quinzenal: ["quinzena", "quinzenas"],
  mensal: ["mês", "meses"],
  anual: ["ano", "anos"],
};

export function cycleNoun(frequency: Frequency, count: number): string {
  const [singular, plural] = CYCLE_NOUNS[frequency];
  return count === 1 ? singular : plural;
}

/**
 * O mínimo necessário para gerar datas.
 *
 * O formulário monta um `Schedule` enquanto o usuário digita — antes de existir
 * qualquer recorrência salva — e a `Recurrence` o satisfaz estruturalmente.
 */
export interface Schedule {
  frequency: Frequency;
  startDate: ISODate;
  endDate?: ISODate | null;
  dueDay: number;
}

/** Frequências em que o "dia do vencimento" faz sentido. */
export function usesDueDay(frequency: Frequency): boolean {
  return frequency === "mensal" || frequency === "anual";
}

/** Fixa o dia do mês, respeitando meses mais curtos (31 → 28/30). */
function withDueDay(iso: ISODate, dueDay: number): ISODate {
  const date = toDate(iso);
  const limit = daysInMonth(date.getFullYear(), date.getMonth());
  date.setDate(Math.min(dueDay, limit));
  return toISO(date);
}

/** Avança uma data em um ciclo da frequência informada. */
function advance(iso: ISODate, schedule: Schedule): ISODate {
  switch (schedule.frequency) {
    case "diaria":
      return addDays(iso, 1);
    case "semanal":
      return addDays(iso, 7);
    case "quinzenal":
      return addDays(iso, 15);
    case "mensal":
      return withDueDay(addMonths(iso, 1), schedule.dueDay);
    case "anual":
      return withDueDay(addYears(iso, 1), schedule.dueDay);
  }
}

/** Primeira data teórica da série, já ancorada no dia de vencimento. */
function firstOccurrence(schedule: Schedule): ISODate {
  if (!usesDueDay(schedule.frequency)) return schedule.startDate;
  const anchored = withDueDay(schedule.startDate, schedule.dueDay);
  return anchored >= schedule.startDate
    ? anchored
    : withDueDay(addMonths(schedule.startDate, 1), schedule.dueDay);
}

/** Uma parcela da série: a data teórica e a sua posição, contada desde o início. */
export interface PlannedDate {
  date: ISODate;
  /** Posição na série, começando em 1 — continua absoluta mesmo com `from`. */
  index: number;
}

/**
 * Datas teóricas da série — antes de qualquer regra de dia não útil.
 *
 * É sobre elas que o usuário decide: a data teórica é a chave estável de cada
 * parcela e continua a mesma depois de o vencimento ser antecipado ou adiado.
 *
 * `from` avança até o presente sem devolver o passado, mas sem perder a conta:
 * uma série que roda desde 2021 continua sabendo que a próxima é a 58ª parcela.
 */
export function plannedDates(schedule: Schedule, limit: number, from?: ISODate): PlannedDate[] {
  const dates: PlannedDate[] = [];
  let cursor = firstOccurrence(schedule);

  // Limite defensivo: séries diárias antigas não devem travar a interface.
  for (let index = 1; index < 5000 && dates.length < limit; index += 1) {
    if (schedule.endDate && cursor > schedule.endDate) break;
    if (!from || cursor >= from) dates.push({ date: cursor, index });
    cursor = advance(cursor, schedule);
  }

  return dates;
}

export function theoreticalDates(schedule: Schedule, limit: number, from?: ISODate): ISODate[] {
  return plannedDates(schedule, limit, from).map((item) => item.date);
}

/** Data da enésima parcela — converte "repetir 5 vezes" em uma data final. */
export function endDateAfter(schedule: Schedule, count: number): ISODate {
  const dates = theoreticalDates({ ...schedule, endDate: null }, Math.max(1, count));
  return dates[dates.length - 1];
}

/**
 * Regra que vale para uma parcela: a decisão tomada para aquela data, quando
 * existe, e a regra geral da recorrência para todas as outras.
 */
export function ruleFor(recurrence: Recurrence, original: ISODate): NonBusinessDayRule {
  return recurrence.adjustments?.[original] ?? recurrence.nonBusinessDayRule;
}

/* -------------------------------------------------------------------------- */
/* Vencimentos em dia não útil                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Uma parcela que cai em fim de semana ou feriado.
 *
 * O sistema não decide sozinho: devolve o conflito com as duas saídas já
 * calculadas e quem escolhe é o usuário.
 */
export interface NonBusinessOccurrence {
  /** Posição na série, começando em 1 — a "3ª parcela". */
  index: number;
  /** Data teórica; é ela que indexa a decisão. */
  date: ISODate;
  /** Por que não é dia útil: Domingo, Sábado, Natal… */
  reason: string;
  /** Onde o vencimento cairia ao antecipar (dia útil anterior). */
  antecipar: ISODate;
  /** Onde cairia ao postergar (próximo dia útil). */
  postergar: ISODate;
}

/**
 * Quantas parcelas são conferidas de uma vez.
 *
 * Uma série sem data final tem infinitos vencimentos e perguntar sobre todos é
 * impossível: conferimos este trecho, e as parcelas seguintes são sinalizadas
 * na lista de movimentações conforme se aproximam.
 */
export const CONFLICT_HORIZON = 24;

function toConflict(planned: PlannedDate, holidays: Holiday[]): NonBusinessOccurrence {
  return {
    index: planned.index,
    date: planned.date,
    reason: nonBusinessReason(planned.date, holidays) ?? "Dia não útil",
    antecipar: applyBusinessDayRule(planned.date, "antecipar", holidays),
    postergar: applyBusinessDayRule(planned.date, "postergar", holidays),
  };
}

/**
 * Parcelas do trecho verificado que caem em dia não útil.
 *
 * `from` limita a pergunta ao que ainda está por vir: ninguém quer decidir o
 * que fazer com um vencimento de dois anos atrás.
 */
export function findNonBusinessDays(
  schedule: Schedule,
  limit: number = CONFLICT_HORIZON,
  from?: ISODate,
  holidays: Holiday[] = NATIONAL_HOLIDAYS,
): NonBusinessOccurrence[] {
  return plannedDates(schedule, limit, from)
    .filter(({ date }) => !isBusinessDay(date, holidays))
    .map((planned) => toConflict(planned, holidays));
}

/* -------------------------------------------------------------------------- */
/* Ocorrências                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Gera as próximas ocorrências de uma recorrência a partir de uma data.
 * Cada item traz a data teórica e a efetiva, após a decisão daquela parcela.
 */
export function nextOccurrences(
  recurrence: Recurrence,
  count = 3,
  from: ISODate = today(),
  holidays: Holiday[] = NATIONAL_HOLIDAYS,
): AdjustedDate[] {
  if (recurrence.status !== "ativa") return [];

  const results: AdjustedDate[] = [];
  let cursor = firstOccurrence(recurrence);

  // Limite defensivo: séries diárias longas não devem travar a interface.
  for (let step = 0; step < 2000 && results.length < count; step += 1) {
    if (recurrence.endDate && cursor > recurrence.endDate) break;
    const resolved = resolveDueDate(cursor, ruleFor(recurrence, cursor), holidays);
    if (resolved.effective >= from) results.push(resolved);
    cursor = advance(cursor, recurrence);
  }

  return results;
}

/** Texto curto do ciclo: "Todo dia 10", "A cada 15 dias"… */
export function describeSchedule(recurrence: Recurrence): string {
  switch (recurrence.frequency) {
    case "diaria":
      return "Todos os dias";
    case "semanal":
      return `Toda ${["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][toDate(recurrence.startDate).getDay()]}`;
    case "quinzenal":
      return "A cada 15 dias";
    case "mensal":
      return `Todo dia ${recurrence.dueDay}`;
    case "anual":
      return `Todo ano no dia ${recurrence.dueDay}`;
  }
}

/** "5 meses", "até 10/01/2027", "sem data para terminar". */
export function describeDuration(recurrence: Recurrence): string {
  if (recurrence.occurrences) {
    return `${recurrence.occurrences} ${cycleNoun(recurrence.frequency, recurrence.occurrences)}`;
  }
  return recurrence.endDate ? `até ${formatDate(recurrence.endDate)}` : "sem data para terminar";
}
