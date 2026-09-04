/**
 * Acesso ao banco.
 *
 * Só este módulo fala com o Supabase. O contexto React acima consome estas
 * funções e nunca monta uma consulta; os componentes nem sabem que elas
 * existem. A separação é o que permite testar as regras de leitura sem montar
 * um componente, e trocar o provedor sem tocar na interface.
 *
 * Toda função recebe `orgId` explícito. O RLS já barraria o acesso a outra
 * organização, mas depender só dele deixaria a consulta varrer índices para
 * depois descartar tudo — o filtro no `where` é correção e desempenho.
 */

import type {
  Account,
  Bank,
  Category,
  Company,
  Expense,
  Holiday,
  ID,
  Recurrence,
  Transaction,
} from "@/types";
import type {
  AccountRow,
  BankRow,
  CategoryRow,
  CompanyRow,
  ExpenseRow,
  HolidayRow,
  RecurrenceRow,
  TransactionRow,
} from "@/types/database";
import { describeError, supabase } from "@/lib/supabase";
import {
  accountPatchToRow,
  accountToRow,
  bankPatchToRow,
  bankToRow,
  categoryPatchToRow,
  categoryToRow,
  companyPatchToRow,
  companyToRow,
  expensePatchToRow,
  expenseToRow,
  recurrenceToRow,
  toAccount,
  toBank,
  toCategory,
  toCompany,
  toExpense,
  toHoliday,
  toRecurrence,
  toTransaction,
  transactionPatchToRow,
  transactionToRow,
} from "@/lib/mappers";

/** Campos gerados pelo banco não são exigidos de quem cria. */
type Draft<T extends { id: ID; createdAt: string }> = Omit<T, "id" | "createdAt">;

export interface FinanceSnapshot {
  companies: Company[];
  banks: Bank[];
  accounts: Account[];
  categories: Category[];
  expenses: Expense[];
  transactions: Transaction[];
  recurrences: Recurrence[];
  holidays: Holiday[];
}

/**
 * Erro já em português, pronto para o `toast`.
 *
 * O Supabase devolve `{ data, error }` em vez de lançar. Concentrar a checagem
 * aqui evita que cada chamada repita o mesmo `if (error)` — e evita o caso pior,
 * que é alguém esquecer de repetir e tratar um erro como sucesso silencioso.
 */
function unwrap<T>(result: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (result.error) throw new Error(describeError(result.error));
  if (result.data === null) throw new Error("A consulta não retornou dados.");
  return result.data;
}

/* -------------------------------------------------------------------------- */
/* Leitura                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Carrega a organização inteira de uma vez.
 *
 * As oito consultas vão em paralelo porque não dependem umas das outras — em
 * série, a tela esperaria a soma dos tempos em vez do maior deles.
 *
 * Carregar tudo é uma decisão consciente e casada com o que a aplicação faz:
 * saldos, projeções e rankings somam o conjunto completo, não uma página dele.
 * Paginar aqui só empurraria a soma para o servidor sem economizar tráfego.
 * O ponto de virada é o volume de `transactions`; quando chegar, o caminho é
 * uma view agregada no Postgres, e só ela muda — esta assinatura continua.
 */
export async function fetchSnapshot(orgId: string): Promise<FinanceSnapshot> {
  const [companies, banks, accounts, categories, expenses, transactions, recurrences, holidays] =
    await Promise.all([
      supabase.from("companies").select("*").eq("org_id", orgId).order("name"),
      supabase.from("banks").select("*").eq("org_id", orgId).order("name"),
      supabase.from("accounts").select("*").eq("org_id", orgId).order("name"),
      supabase.from("categories").select("*").eq("org_id", orgId).order("name"),
      supabase.from("expenses").select("*").eq("org_id", orgId).order("name"),
      /* Mais recentes primeiro: é a ordem que a tabela de movimentações exibe. */
      supabase.from("transactions").select("*").eq("org_id", orgId).order("due_date", { ascending: false }),
      supabase.from("recurrences").select("*").eq("org_id", orgId).order("name"),
      /* Nacionais (`org_id` nulo) e os regionais desta organização, juntos. */
      supabase.from("holidays").select("*").or(`org_id.is.null,org_id.eq.${orgId}`).order("date"),
    ]);

  return {
    companies: unwrap<CompanyRow[]>(companies).map(toCompany),
    banks: unwrap<BankRow[]>(banks).map(toBank),
    accounts: unwrap<AccountRow[]>(accounts).map(toAccount),
    categories: unwrap<CategoryRow[]>(categories).map(toCategory),
    expenses: unwrap<ExpenseRow[]>(expenses).map(toExpense),
    transactions: unwrap<TransactionRow[]>(transactions).map(toTransaction),
    recurrences: unwrap<RecurrenceRow[]>(recurrences).map(toRecurrence),
    holidays: unwrap<HolidayRow[]>(holidays).map(toHoliday),
  };
}

/* -------------------------------------------------------------------------- */
/* Movimentações                                                               */
/* -------------------------------------------------------------------------- */

export async function insertTransaction(
  orgId: string,
  draft: Draft<Transaction>,
): Promise<Transaction> {
  const row = unwrap<TransactionRow>(
    await supabase.from("transactions").insert(transactionToRow(draft, orgId)).select().single(),
  );
  return toTransaction(row);
}

/**
 * Grava a série inteira numa chamada só.
 *
 * Doze parcelas viram doze `INSERT` numa única transação do Postgres: ou todas
 * entram, ou nenhuma. Em doze chamadas separadas, uma falha no meio deixaria
 * meia série gravada — e o usuário sem saber quais parcelas existem.
 */
export async function insertTransactions(
  orgId: string,
  drafts: Draft<Transaction>[],
): Promise<Transaction[]> {
  if (drafts.length === 0) return [];

  const rows = unwrap<TransactionRow[]>(
    await supabase
      .from("transactions")
      .insert(drafts.map((draft) => transactionToRow(draft, orgId)))
      .select(),
  );
  return rows.map(toTransaction);
}

export async function updateTransaction(id: ID, patch: Partial<Transaction>): Promise<Transaction> {
  const row = unwrap<TransactionRow>(
    await supabase
      .from("transactions")
      .update(transactionPatchToRow(patch))
      .eq("id", id)
      .select()
      .single(),
  );
  return toTransaction(row);
}

export async function deleteTransaction(id: ID): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(describeError(error));
}

/**
 * Aplica um patch a todas as parcelas EM ABERTO de uma série.
 *
 * O filtro por `pendente` não é detalhe: parcela liquidada registra o que de
 * fato saiu da conta, e reescrever esse valor falsificaria o saldo. O `UPDATE`
 * com `where` faz a seleção no banco, sem trazer as linhas para escolher no
 * cliente e devolvê-las.
 */
export async function updateSeries(
  recurrenceId: ID,
  patch: Partial<Transaction>,
): Promise<Transaction[]> {
  const rows = unwrap<TransactionRow[]>(
    await supabase
      .from("transactions")
      .update(transactionPatchToRow(patch))
      .eq("recurrence_id", recurrenceId)
      .eq("status", "pendente")
      .select(),
  );
  return rows.map(toTransaction);
}

/* -------------------------------------------------------------------------- */
/* Bancos                                                                      */
/* -------------------------------------------------------------------------- */

export async function insertBank(orgId: string, draft: Draft<Bank>): Promise<Bank> {
  return toBank(
    unwrap<BankRow>(await supabase.from("banks").insert(bankToRow(draft, orgId)).select().single()),
  );
}

export async function updateBank(id: ID, patch: Partial<Bank>): Promise<Bank> {
  return toBank(
    unwrap<BankRow>(
      await supabase.from("banks").update(bankPatchToRow(patch)).eq("id", id).select().single(),
    ),
  );
}

/**
 * A recusa vem do banco de dados, não de uma checagem aqui.
 *
 * A chave estrangeira de `accounts.bank_id` é `on delete restrict`: o Postgres
 * devolve `23503`, que `describeError` traduz para "está em uso". Validar antes
 * no cliente seria uma corrida perdida — entre a checagem e o `DELETE`, outro
 * usuário da mesma organização pode ter criado a conta.
 */
export async function deleteBank(id: ID): Promise<void> {
  const { error } = await supabase.from("banks").delete().eq("id", id);
  if (error) throw new Error(describeError(error));
}

/* -------------------------------------------------------------------------- */
/* Contas                                                                      */
/* -------------------------------------------------------------------------- */

export async function insertAccount(orgId: string, draft: Draft<Account>): Promise<Account> {
  return toAccount(
    unwrap<AccountRow>(
      await supabase.from("accounts").insert(accountToRow(draft, orgId)).select().single(),
    ),
  );
}

export async function updateAccount(id: ID, patch: Partial<Account>): Promise<Account> {
  return toAccount(
    unwrap<AccountRow>(
      await supabase.from("accounts").update(accountPatchToRow(patch)).eq("id", id).select().single(),
    ),
  );
}

/**
 * Os lançamentos sobrevivem à conta: `on delete set null (account_id)` na FK
 * apenas desfaz o vínculo. O histórico financeiro não desaparece porque alguém
 * encerrou uma conta no banco.
 */
export async function deleteAccount(id: ID): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(describeError(error));
}

/* -------------------------------------------------------------------------- */
/* Empresas                                                                    */
/* -------------------------------------------------------------------------- */

export async function insertCompany(orgId: string, draft: Draft<Company>): Promise<Company> {
  return toCompany(
    unwrap<CompanyRow>(
      await supabase.from("companies").insert(companyToRow(draft, orgId)).select().single(),
    ),
  );
}

export async function updateCompany(id: ID, patch: Partial<Company>): Promise<Company> {
  return toCompany(
    unwrap<CompanyRow>(
      await supabase.from("companies").update(companyPatchToRow(patch)).eq("id", id).select().single(),
    ),
  );
}

/** Em cascata: contas, lançamentos e recorrências da empresa vão junto. */
export async function deleteCompany(id: ID): Promise<void> {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(describeError(error));
}

/* -------------------------------------------------------------------------- */
/* Plano de contas                                                             */
/* -------------------------------------------------------------------------- */

export async function insertCategory(orgId: string, draft: Draft<Category>): Promise<Category> {
  return toCategory(
    unwrap<CategoryRow>(
      await supabase.from("categories").insert(categoryToRow(draft, orgId)).select().single(),
    ),
  );
}

export async function updateCategory(id: ID, patch: Partial<Category>): Promise<Category> {
  return toCategory(
    unwrap<CategoryRow>(
      await supabase.from("categories").update(categoryPatchToRow(patch)).eq("id", id).select().single(),
    ),
  );
}

/** Leva os itens junto (cascata) e solta os lançamentos que a referenciavam. */
export async function deleteCategory(id: ID): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(describeError(error));
}

export async function insertExpense(orgId: string, draft: Draft<Expense>): Promise<Expense> {
  return toExpense(
    unwrap<ExpenseRow>(
      await supabase.from("expenses").insert(expenseToRow(draft, orgId)).select().single(),
    ),
  );
}

export async function updateExpense(id: ID, patch: Partial<Expense>): Promise<Expense> {
  return toExpense(
    unwrap<ExpenseRow>(
      await supabase.from("expenses").update(expensePatchToRow(patch)).eq("id", id).select().single(),
    ),
  );
}

export async function deleteExpense(id: ID): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(describeError(error));
}

/* -------------------------------------------------------------------------- */
/* Recorrências                                                                */
/* -------------------------------------------------------------------------- */

export async function insertRecurrence(
  orgId: string,
  draft: Draft<Recurrence>,
): Promise<Recurrence> {
  return toRecurrence(
    unwrap<RecurrenceRow>(
      await supabase.from("recurrences").insert(recurrenceToRow(draft, orgId)).select().single(),
    ),
  );
}
