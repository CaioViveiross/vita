/**
 * Tipos das linhas do Postgres — o formato exato que o Supabase devolve.
 *
 * Escritos à mão para espelhar `supabase/migrations/`, e não gerados: gerar
 * exige o CLI autenticado, o que travaria o desenvolvimento em quem tem acesso
 * ao projeto. Quando `supabase gen types` entrar no fluxo, este arquivo é
 * substituído pelo gerado e os mapeadores continuam valendo sem mudança.
 *
 * Estes tipos NÃO circulam pela aplicação. Eles param em `src/lib/mappers.ts`,
 * que os traduz para o modelo de domínio de `src/types/index.ts`. Os
 * componentes continuam falando camelCase e `Transaction`, sem saber que existe
 * um banco do outro lado.
 */

import type {
  AccountType,
  CategoryKind,
  Frequency,
  NonBusinessDayRule,
  PersistedStatus,
  RecurrenceStatus,
  TransactionType,
} from "@/types";

/** `timestamptz` serializado — ISO completo, não a data curta do domínio. */
type Timestamptz = string;
/** `date` do Postgres: já chega como `YYYY-MM-DD`. */
type DateString = string;

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: Timestamptz;
}

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  created_at: Timestamptz;
}

export interface MembershipRow {
  id: string;
  org_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: Timestamptz;
}

export interface CompanyRow {
  id: string;
  org_id: string;
  name: string;
  legal_name: string;
  tax_id: string;
  initials: string | null;
  color: string | null;
  active: boolean;
  created_at: Timestamptz;
}

export interface BankRow {
  id: string;
  org_id: string;
  name: string;
  code: string;
  color: string;
  created_at: Timestamptz;
}

export interface AccountRow {
  id: string;
  org_id: string;
  name: string;
  bank_id: string;
  company_id: string;
  branch: string;
  number: string;
  type: AccountType;
  /**
   * `numeric` chega como string no driver — precisão de dinheiro não
   * sobrevive a um `float` de JavaScript. A conversão para número acontece
   * uma única vez, no mapeador.
   */
  opening_balance: string | number;
  active: boolean;
  created_at: Timestamptz;
}

export interface CategoryRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  kind: CategoryKind;
  created_at: Timestamptz;
}

export interface ExpenseRow {
  id: string;
  org_id: string;
  category_id: string;
  name: string;
  description: string | null;
  created_at: Timestamptz;
}

export interface RecurrenceRow {
  id: string;
  org_id: string;
  name: string;
  type: TransactionType;
  amount: string | number;
  company_id: string;
  account_id: string | null;
  category_id: string | null;
  expense_id: string | null;
  frequency: Frequency;
  start_date: DateString;
  end_date: DateString | null;
  due_day: number;
  occurrences: number | null;
  non_business_day_rule: NonBusinessDayRule;
  adjustments: Record<string, NonBusinessDayRule>;
  status: RecurrenceStatus;
  notes: string | null;
  created_at: Timestamptz;
}

export interface TransactionRow {
  id: string;
  org_id: string;
  type: TransactionType;
  description: string;
  amount: string | number;
  due_date: DateString;
  settled_at: DateString | null;
  company_id: string;
  account_id: string | null;
  category_id: string | null;
  expense_id: string | null;
  /** Só os três persistidos: `atrasado` é derivado no cliente. */
  status: PersistedStatus;
  notes: string | null;
  counterparty: string | null;
  recurrence_id: string | null;
  installment: number | null;
  installment_count: number | null;
  created_at: Timestamptz;
}

export interface HolidayRow {
  id: string;
  /** Nulo nos feriados nacionais, compartilhados por todas as organizações. */
  org_id: string | null;
  date: DateString;
  name: string;
  scope: "nacional" | "regional";
}
