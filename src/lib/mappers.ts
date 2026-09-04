/**
 * Tradução entre as linhas do Postgres e o modelo de domínio.
 *
 * Este é o único arquivo que conhece os dois vocabulários. Acima dele tudo é
 * `Transaction` e `dueDate`; abaixo, tudo é `transactions` e `due_date`.
 * Concentrar a tradução aqui é o que permitiu trocar `localStorage` por
 * Supabase sem reescrever um componente sequer.
 *
 * Três conversões que se repetem e explicam a maior parte do código abaixo:
 *
 * - `numeric` chega como **string**. O driver não a converte porque um
 *   `number` de JavaScript não representa todo `numeric(14,2)` — e dinheiro
 *   arredondado sozinho é bug de contabilidade, não de formatação.
 * - `timestamptz` chega como ISO completo, mas o domínio usa `ISODate`
 *   (`YYYY-MM-DD`). Os dez primeiros caracteres bastam.
 * - `null` do banco vira `undefined` no domínio nos campos opcionais, e o
 *   caminho de volta reconstrói o `null`. São vocabulários diferentes para a
 *   mesma ausência, e misturá-los faria `exactOptionalPropertyTypes` e o
 *   próprio Postgres discordarem sobre o que é "vazio".
 */

import type {
  Account,
  Bank,
  Category,
  Company,
  Expense,
  Holiday,
  ISODate,
  Recurrence,
  Transaction,
  UserProfile,
} from "@/types";
import type {
  AccountRow,
  BankRow,
  CategoryRow,
  CompanyRow,
  ExpenseRow,
  HolidayRow,
  ProfileRow,
  RecurrenceRow,
  TransactionRow,
} from "@/types/database";

/* -------------------------------------------------------------------------- */
/* Primitivos                                                                  */
/* -------------------------------------------------------------------------- */

/** `numeric` (string) → número. */
function money(value: string | number): number {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

/** `timestamptz` → `ISODate`. */
function isoDate(value: string): ISODate {
  return value.slice(0, 10);
}

/** `null` do banco → `undefined` do domínio. */
function opt<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

/** `undefined`/vazio do domínio → `null` do banco. */
function nullable<T>(value: T | undefined | null): T | null {
  return value === undefined || value === "" ? null : value;
}

/* -------------------------------------------------------------------------- */
/* Linha → domínio                                                             */
/* -------------------------------------------------------------------------- */

export function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    taxId: row.tax_id,
    initials: opt(row.initials),
    color: opt(row.color),
    active: row.active,
    createdAt: isoDate(row.created_at),
  };
}

export function toBank(row: BankRow): Bank {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    color: row.color,
    createdAt: isoDate(row.created_at),
  };
}

export function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    bankId: row.bank_id,
    branch: row.branch,
    number: row.number,
    type: row.type,
    companyId: row.company_id,
    openingBalance: money(row.opening_balance),
    active: row.active,
    createdAt: isoDate(row.created_at),
  };
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind,
    createdAt: isoDate(row.created_at),
  };
}

export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: opt(row.description),
    createdAt: isoDate(row.created_at),
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amount: money(row.amount),
    dueDate: row.due_date,
    settledAt: opt(row.settled_at),
    companyId: row.company_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    expenseId: row.expense_id,
    status: row.status,
    notes: opt(row.notes),
    recurrenceId: opt(row.recurrence_id),
    installment: opt(row.installment),
    installmentCount: opt(row.installment_count),
    counterparty: opt(row.counterparty),
    createdAt: isoDate(row.created_at),
  };
}

export function toRecurrence(row: RecurrenceRow): Recurrence {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: money(row.amount),
    companyId: row.company_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    expenseId: row.expense_id,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    dueDay: row.due_day,
    occurrences: row.occurrences,
    nonBusinessDayRule: row.non_business_day_rule,
    adjustments: row.adjustments ?? {},
    status: row.status,
    notes: opt(row.notes),
    createdAt: isoDate(row.created_at),
  };
}

export function toHoliday(row: HolidayRow): Holiday {
  return { date: row.date, name: row.name, scope: row.scope };
}

export function toUserProfile(row: ProfileRow): UserProfile {
  return { name: row.name, role: row.role, email: row.email, initials: row.initials };
}

/* -------------------------------------------------------------------------- */
/* Domínio → linha                                                             */
/* -------------------------------------------------------------------------- */

/*
 * Os `Insert` omitem `id` e `created_at`: são gerados pelo banco (`default
 * gen_random_uuid()` e `now()`), e mandá-los do cliente daria ao navegador o
 * poder de escolher a chave primária e datar o passado.
 *
 * `org_id` é sempre explícito. Poderia sair de um `default` com `auth.uid()`,
 * mas o usuário pode pertencer a várias organizações — só quem chama sabe em
 * qual delas está trabalhando.
 */

type Insert<T> = Omit<T, "id" | "created_at">;

export function companyToRow(
  company: Omit<Company, "id" | "createdAt">,
  orgId: string,
): Insert<CompanyRow> {
  return {
    org_id: orgId,
    name: company.name,
    legal_name: company.legalName,
    tax_id: company.taxId,
    initials: nullable(company.initials),
    color: nullable(company.color),
    active: company.active,
  };
}

export function bankToRow(bank: Omit<Bank, "id" | "createdAt">, orgId: string): Insert<BankRow> {
  return {
    org_id: orgId,
    name: bank.name,
    code: bank.code,
    color: bank.color,
  };
}

export function accountToRow(
  account: Omit<Account, "id" | "createdAt">,
  orgId: string,
): Insert<AccountRow> {
  return {
    org_id: orgId,
    name: account.name,
    bank_id: account.bankId,
    company_id: account.companyId,
    branch: account.branch,
    number: account.number,
    type: account.type,
    opening_balance: account.openingBalance,
    active: account.active,
  };
}

export function categoryToRow(
  category: Omit<Category, "id" | "createdAt">,
  orgId: string,
): Insert<CategoryRow> {
  return {
    org_id: orgId,
    name: category.name,
    description: category.description,
    kind: category.kind,
  };
}

export function expenseToRow(
  expense: Omit<Expense, "id" | "createdAt">,
  orgId: string,
): Insert<ExpenseRow> {
  return {
    org_id: orgId,
    category_id: expense.categoryId,
    name: expense.name,
    description: nullable(expense.description),
  };
}

export function transactionToRow(
  transaction: Omit<Transaction, "id" | "createdAt">,
  orgId: string,
): Insert<TransactionRow> {
  return {
    org_id: orgId,
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    due_date: transaction.dueDate,
    settled_at: nullable(transaction.settledAt),
    company_id: transaction.companyId,
    account_id: transaction.accountId,
    category_id: transaction.categoryId,
    expense_id: transaction.expenseId,
    status: transaction.status,
    notes: nullable(transaction.notes),
    counterparty: nullable(transaction.counterparty),
    recurrence_id: nullable(transaction.recurrenceId),
    installment: nullable(transaction.installment),
    installment_count: nullable(transaction.installmentCount),
  };
}

export function recurrenceToRow(
  recurrence: Omit<Recurrence, "id" | "createdAt">,
  orgId: string,
): Insert<RecurrenceRow> {
  return {
    org_id: orgId,
    name: recurrence.name,
    type: recurrence.type,
    amount: recurrence.amount,
    company_id: recurrence.companyId,
    account_id: recurrence.accountId,
    category_id: recurrence.categoryId,
    expense_id: recurrence.expenseId,
    frequency: recurrence.frequency,
    start_date: recurrence.startDate,
    end_date: nullable(recurrence.endDate),
    due_day: recurrence.dueDay,
    occurrences: nullable(recurrence.occurrences),
    non_business_day_rule: recurrence.nonBusinessDayRule,
    adjustments: recurrence.adjustments ?? {},
    status: recurrence.status,
    notes: nullable(recurrence.notes),
  };
}

/* -------------------------------------------------------------------------- */
/* Patches parciais                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Converte um `Partial<T>` do domínio no `Partial` da linha correspondente.
 *
 * O detalhe que faz esta função existir: um `UPDATE` precisa distinguir "não
 * mexa neste campo" de "apague este campo". As duas coisas chegam como
 * `undefined` num objeto parcial, então a decisão é tomada pela PRESENÇA da
 * chave (`in`), não pelo valor. É o que faz `reopenTransaction`, que manda
 * `settledAt: undefined`, realmente gravar `null` em vez de não gravar nada.
 */
function patchOf<TDomain extends object, TRow>(
  patch: TDomain,
  mapping: { [K in keyof TDomain]?: [keyof TRow, (value: TDomain[K]) => unknown] },
): Partial<TRow> {
  const row: Partial<TRow> = {};

  for (const key of Object.keys(patch) as (keyof TDomain)[]) {
    const entry = mapping[key];
    if (!entry) continue;
    const [column, convert] = entry;
    row[column] = convert(patch[key]) as TRow[keyof TRow];
  }

  return row;
}

export function transactionPatchToRow(patch: Partial<Transaction>): Partial<TransactionRow> {
  return patchOf<Partial<Transaction>, TransactionRow>(patch, {
    type: ["type", (v) => v],
    description: ["description", (v) => v],
    amount: ["amount", (v) => v],
    dueDate: ["due_date", (v) => v],
    settledAt: ["settled_at", nullable],
    companyId: ["company_id", (v) => v],
    accountId: ["account_id", (v) => v ?? null],
    categoryId: ["category_id", (v) => v ?? null],
    expenseId: ["expense_id", (v) => v ?? null],
    status: ["status", (v) => v],
    notes: ["notes", nullable],
    counterparty: ["counterparty", nullable],
    recurrenceId: ["recurrence_id", nullable],
    installment: ["installment", nullable],
    installmentCount: ["installment_count", nullable],
  });
}

export function companyPatchToRow(patch: Partial<Company>): Partial<CompanyRow> {
  return patchOf<Partial<Company>, CompanyRow>(patch, {
    name: ["name", (v) => v],
    legalName: ["legal_name", (v) => v],
    taxId: ["tax_id", (v) => v],
    initials: ["initials", nullable],
    color: ["color", nullable],
    active: ["active", (v) => v],
  });
}

export function bankPatchToRow(patch: Partial<Bank>): Partial<BankRow> {
  return patchOf<Partial<Bank>, BankRow>(patch, {
    name: ["name", (v) => v],
    code: ["code", (v) => v],
    color: ["color", (v) => v],
  });
}

export function accountPatchToRow(patch: Partial<Account>): Partial<AccountRow> {
  return patchOf<Partial<Account>, AccountRow>(patch, {
    name: ["name", (v) => v],
    bankId: ["bank_id", (v) => v],
    companyId: ["company_id", (v) => v],
    branch: ["branch", (v) => v],
    number: ["number", (v) => v],
    type: ["type", (v) => v],
    openingBalance: ["opening_balance", (v) => v],
    active: ["active", (v) => v],
  });
}

export function categoryPatchToRow(patch: Partial<Category>): Partial<CategoryRow> {
  return patchOf<Partial<Category>, CategoryRow>(patch, {
    name: ["name", (v) => v],
    description: ["description", (v) => v],
    kind: ["kind", (v) => v],
  });
}

export function expensePatchToRow(patch: Partial<Expense>): Partial<ExpenseRow> {
  return patchOf<Partial<Expense>, ExpenseRow>(patch, {
    categoryId: ["category_id", (v) => v],
    name: ["name", (v) => v],
    description: ["description", nullable],
  });
}
