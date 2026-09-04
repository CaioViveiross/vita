/**
 * Modelo de domínio do Vita.
 *
 * As entidades abaixo são desenhadas para espelhar 1:1 os recursos que a API
 * exporá no futuro (`/companies`, `/accounts`, `/categories`, `/transactions`,
 * `/recurrences`). Por isso usam identificadores opacos (`string`), datas em
 * ISO `YYYY-MM-DD` e valores numéricos em reais — nada de formatação embutida.
 */

export type ID = string;

/** Data no formato ISO curto: `YYYY-MM-DD`. */
export type ISODate = string;

/* -------------------------------------------------------------------------- */
/* Empresa                                                                     */
/* -------------------------------------------------------------------------- */

export interface Company {
  id: ID;
  /** Nome fantasia — usado em toda a interface. */
  name: string;
  legalName: string;
  taxId: string;
  /** Sigla de 2 letras usada nos avatares. Derivada do nome quando ausente. */
  initials?: string;
  color?: string;
  active: boolean;
  createdAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Banco                                                                       */
/* -------------------------------------------------------------------------- */

/** Instituição onde as contas são abertas — cadastrada antes das contas. */
export interface Bank {
  id: ID;
  name: string;
  /** Código FEBRABAN (ex.: "341"). Opcional: nem toda instituição tem. */
  code: string;
  /** Cor da identidade visual, aplicada a todas as contas do banco. */
  color: string;
  createdAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Conta bancária                                                              */
/* -------------------------------------------------------------------------- */

export type AccountType = "corrente" | "poupanca" | "investimento" | "caixa";

export interface Account {
  id: ID;
  name: string;
  /** Banco da conta. Nome, código e cor vivem no cadastro do banco. */
  bankId: ID;
  branch: string;
  /** Número completo; a UI exibe apenas os últimos dígitos. */
  number: string;
  type: AccountType;
  companyId: ID;
  /** Saldo de abertura. O saldo atual é derivado das movimentações liquidadas. */
  openingBalance: number;
  active: boolean;
  createdAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Plano de contas                                                             */
/* -------------------------------------------------------------------------- */

export type CategoryKind = "entrada" | "saida";

/** Seção do plano de contas (ex.: "Serviços Públicos"). */
export interface Category {
  id: ID;
  name: string;
  description: string;
  kind: CategoryKind;
  createdAt: ISODate;
}

/** Item vinculado a uma categoria (ex.: "Energia elétrica"). */
export interface Expense {
  id: ID;
  categoryId: ID;
  name: string;
  description?: string;
  createdAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Movimentação                                                                */
/* -------------------------------------------------------------------------- */

export type TransactionType = "entrada" | "saida";

/** Status efetivamente gravado no lançamento. */
export type PersistedStatus = "pendente" | "pago" | "recebido";

/**
 * Status exibido na interface.
 *
 * Além dos persistidos, inclui um estado derivado em tempo de execução e que
 * nunca chega ao banco — `atrasado`: pendente cuja data prevista já passou
 * (`resolveStatus`). Ele não é gravado porque muda sozinho: alterar o
 * vencimento devolve o lançamento a pendente, sem nenhuma escrita.
 */
export type TransactionStatus = PersistedStatus | "atrasado";

export interface Transaction {
  id: ID;
  type: TransactionType;
  description: string;
  amount: number;
  /** Data prevista de pagamento/recebimento. */
  dueDate: ISODate;
  /** Data em que foi efetivamente liquidada. */
  settledAt?: ISODate;
  companyId: ID;
  accountId: ID | null;
  categoryId: ID | null;
  expenseId: ID | null;
  status: PersistedStatus;
  notes?: string;
  /** Preenchido quando o lançamento nasceu de uma recorrência. */
  recurrenceId?: ID;
  /**
   * Posição na série, de 1 a `installmentCount`.
   *
   * Todas as parcelas são gravadas já na criação, e não projetadas: para
   * planejar, o que vem pela frente precisa contar nos totais como qualquer
   * outro pendente. Estes dois campos são o que permite exibir "2/5".
   */
  installment?: number;
  installmentCount?: number;
  counterparty?: string;
  createdAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Recorrência                                                                 */
/* -------------------------------------------------------------------------- */

export type Frequency = "diaria" | "semanal" | "quinzenal" | "mensal" | "anual";

/** Tratamento do vencimento que cai em fim de semana ou feriado. */
export type NonBusinessDayRule = "manter" | "antecipar" | "postergar";

export type RecurrenceStatus = "ativa" | "pausada";

export interface Recurrence {
  id: ID;
  name: string;
  type: TransactionType;
  amount: number;
  companyId: ID;
  accountId: ID | null;
  categoryId: ID | null;
  expenseId: ID | null;
  frequency: Frequency;
  startDate: ISODate;
  endDate?: ISODate | null;
  /** Dia do vencimento (1–31) — aplicável a frequências mensal e anual. */
  dueDay: number;
  /**
   * Quantas parcelas foram combinadas na criação (`5 meses`, `12 semanas`).
   * `null` para séries sem fim. É informativo: quem limita a série é `endDate`.
   */
  occurrences?: number | null;
  /**
   * Regra aplicada às ocorrências que ainda não foram decididas uma a uma.
   * O padrão é `manter`: nenhum vencimento muda de data sem o usuário mandar.
   */
  nonBusinessDayRule: NonBusinessDayRule;
  /**
   * Decisões tomadas caso a caso, indexadas pela **data teórica** da parcela.
   *
   * O sistema não escolhe sozinho o que fazer quando um vencimento cai em fim
   * de semana ou feriado: ele avisa e pergunta. A resposta de cada parcela mora
   * aqui, e as demais seguem `nonBusinessDayRule`.
   */
  adjustments?: Record<ISODate, NonBusinessDayRule>;
  status: RecurrenceStatus;
  notes?: string;
  createdAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Apoio                                                                       */
/* -------------------------------------------------------------------------- */

export interface Holiday {
  date: ISODate;
  name: string;
  /** `nacional` hoje; `regional` fica reservado para o calendário municipal. */
  scope: "nacional" | "regional";
}

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  initials: string;
}

/** Intervalo de datas usado pelos filtros de período. */
export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export type PeriodPreset = "hoje" | "7d" | "30d" | "90d" | "mes" | "custom";

/** Saldo derivado de uma conta, já com os valores calculados. */
export interface AccountBalance {
  account: Account;
  company: Company;
  /** Saldo de abertura + movimentações liquidadas. */
  current: number;
  /** Saldo projetado incluindo lançamentos pendentes do período. */
  projected: number;
}

export interface DashboardSummary {
  totalBalance: number;
  balanceChange: number;
  expectedIn: number;
  expectedInCount: number;
  expectedInChange: number;
  expectedOut: number;
  expectedOutCount: number;
  expectedOutChange: number;
  expectedResult: number;
  overdueCount: number;
  overdueAmount: number;
  todayInCount: number;
  todayOutCount: number;
}
