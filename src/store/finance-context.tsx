import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Account,
  Bank,
  Category,
  Company,
  Expense,
  Holiday,
  ID,
  ISODate,
  Recurrence,
  Transaction,
} from "@/types";
import { today } from "@/lib/date";
import { settledStatusFor } from "@/lib/finance";
import { useAuth } from "@/store/auth-context";
import * as api from "@/services/finance";

/**
 * Camada de dados da aplicação.
 *
 * Antes tudo vivia em memória, espelhado no `localStorage`. Agora cada ação
 * grava no Supabase — mas a superfície que os componentes consomem é a mesma,
 * porque era exatamente para esta troca que ela havia sido desenhada.
 *
 * O que mudou para quem chama: **as ações agora devolvem `Promise`**. O
 * resultado de uma escrita não existe mais no instante da chamada; ele chega
 * quando o servidor responde, e é a resposta do servidor — com o `id` e o
 * `created_at` reais — que entra no estado local.
 *
 * Por que a resposta e não o rascunho: o banco preenche `id`, aplica `default`
 * e valida `check`. Confiar no que foi enviado significaria mostrar na tela um
 * registro diferente do que ficou gravado — e só descobrir na próxima carga.
 */

export interface FinanceData {
  companies: Company[];
  banks: Bank[];
  accounts: Account[];
  categories: Category[];
  expenses: Expense[];
  transactions: Transaction[];
  recurrences: Recurrence[];
  /** Nacionais e os regionais da organização, já mesclados pelo servidor. */
  holidays: Holiday[];
}

const EMPTY: FinanceData = {
  companies: [],
  banks: [],
  accounts: [],
  categories: [],
  expenses: [],
  transactions: [],
  recurrences: [],
  holidays: [],
};

/** Campos gerados pelo banco não são exigidos na criação. */
type Draft<T extends { id: ID; createdAt: ISODate }> = Omit<T, "id" | "createdAt">;

export type TransactionDraft = Draft<Transaction>;
export type BankDraft = Draft<Bank>;
export type AccountDraft = Draft<Account>;
export type CompanyDraft = Draft<Company>;
export type CategoryDraft = Draft<Category>;
export type ExpenseDraft = Draft<Expense>;
export type RecurrenceDraft = Draft<Recurrence>;

interface FinanceContextValue extends FinanceData {
  /** `true` quando a primeira carga terminou — com dados ou com erro. */
  ready: boolean;
  /** `true` durante qualquer carga, inclusive as recargas após escrita. */
  loading: boolean;
  /** Mensagem da última falha de carga, já em português. `null` se está tudo bem. */
  error: string | null;

  /* Transações */
  createTransaction: (draft: TransactionDraft) => Promise<Transaction>;
  /**
   * Grava a série inteira de uma vez.
   *
   * Existe separado de `createTransaction` porque doze parcelas precisam entrar
   * numa transação só: metade de uma série gravada é pior que nenhuma.
   */
  createTransactions: (drafts: TransactionDraft[]) => Promise<Transaction[]>;
  updateTransaction: (id: ID, patch: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: ID) => Promise<void>;
  /** Marca como pago/recebido conforme o tipo. */
  settleTransaction: (id: ID) => Promise<Transaction | undefined>;
  /** Volta um lançamento liquidado para pendente. */
  reopenTransaction: (id: ID) => Promise<void>;
  /**
   * Aplica um patch a todas as parcelas ainda em aberto de uma série.
   *
   * Parcelas já liquidadas ficam de fora de propósito: o valor pago é um
   * fato, e reescrevê-lo falsificaria o saldo da conta.
   */
  updateSeries: (recurrenceId: ID, patch: Partial<Transaction>) => Promise<void>;

  /* Bancos */
  createBank: (draft: BankDraft) => Promise<Bank>;
  updateBank: (id: ID, patch: Partial<Bank>) => Promise<void>;
  deleteBank: (id: ID) => Promise<void>;

  /* Contas */
  createAccount: (draft: AccountDraft) => Promise<Account>;
  updateAccount: (id: ID, patch: Partial<Account>) => Promise<void>;
  deleteAccount: (id: ID) => Promise<void>;

  /* Empresas */
  createCompany: (draft: CompanyDraft) => Promise<Company>;
  updateCompany: (id: ID, patch: Partial<Company>) => Promise<void>;
  deleteCompany: (id: ID) => Promise<void>;

  /* Plano de contas */
  createCategory: (draft: CategoryDraft) => Promise<Category>;
  updateCategory: (id: ID, patch: Partial<Category>) => Promise<void>;
  deleteCategory: (id: ID) => Promise<void>;
  createExpense: (draft: ExpenseDraft) => Promise<Expense>;
  updateExpense: (id: ID, patch: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: ID) => Promise<void>;

  /**
   * Recorrências. A série é gravada como registro do que foi combinado
   * (ciclo, duração, decisões de dia não útil); as parcelas em si nascem
   * como lançamentos comuns, todas de uma vez.
   */
  createRecurrence: (draft: RecurrenceDraft) => Promise<Recurrence>;

  /** Recarrega tudo do servidor. */
  reload: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { activeOrgId, ready: authReady } = useAuth();

  const [data, setData] = useState<FinanceData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Guarda qual organização originou a carga em andamento. Trocar de
   * organização duas vezes em sequência dispara duas cargas, e a primeira pode
   * responder depois da segunda — sem esta checagem, os dados da organização
   * antiga sobrescreveriam os da nova na tela.
   */
  const requestedOrg = useRef<string | null>(null);

  const load = useCallback(async (orgId: string) => {
    requestedOrg.current = orgId;
    setLoading(true);
    setError(null);

    try {
      const snapshot = await api.fetchSnapshot(orgId);
      if (requestedOrg.current !== orgId) return;
      setData(snapshot);
    } catch (cause) {
      if (requestedOrg.current !== orgId) return;
      setData(EMPTY);
      setError(cause instanceof Error ? cause.message : "Falha ao carregar os dados.");
    } finally {
      if (requestedOrg.current === orgId) {
        setLoading(false);
        setReady(true);
      }
    }
  }, []);

  useEffect(() => {
    /* Esperar a sessão evita uma carga que o RLS recusaria por falta de token. */
    if (!authReady) return;

    if (!activeOrgId) {
      requestedOrg.current = null;
      setData(EMPTY);
      setReady(true);
      return;
    }

    void load(activeOrgId);
  }, [authReady, activeOrgId, load]);

  const reload = useCallback(async () => {
    if (activeOrgId) await load(activeOrgId);
  }, [activeOrgId, load]);

  /**
   * A organização ativa, ou um erro claro.
   *
   * Nenhuma escrita faz sentido sem ela, e deixar `orgId` opcional espalharia
   * um `if (!orgId) return` por 20 funções — cada um com sua própria ideia do
   * que fazer no caso impossível.
   */
  const requireOrg = useCallback((): string => {
    if (!activeOrgId) throw new Error("Selecione uma organização antes de gravar.");
    return activeOrgId;
  }, [activeOrgId]);

  /* Substitui um item da lista pela versão que o servidor devolveu. */
  const replaceIn = useCallback(
    <K extends keyof FinanceData>(key: K, item: FinanceData[K][number] & { id: ID }) => {
      setData((current) => ({
        ...current,
        [key]: (current[key] as { id: ID }[]).map((row) => (row.id === item.id ? item : row)),
      }));
    },
    [],
  );

  const removeFrom = useCallback(<K extends keyof FinanceData>(key: K, id: ID) => {
    setData((current) => ({
      ...current,
      [key]: (current[key] as { id: ID }[]).filter((row) => row.id !== id),
    }));
  }, []);

  /* ----------------------------- Transações ------------------------------ */

  const createTransaction = useCallback<FinanceContextValue["createTransaction"]>(
    async (draft) => {
      const created = await api.insertTransaction(requireOrg(), draft);
      setData((current) => ({ ...current, transactions: [created, ...current.transactions] }));
      return created;
    },
    [requireOrg],
  );

  const createTransactions = useCallback<FinanceContextValue["createTransactions"]>(
    async (drafts) => {
      const created = await api.insertTransactions(requireOrg(), drafts);
      setData((current) => ({ ...current, transactions: [...created, ...current.transactions] }));
      return created;
    },
    [requireOrg],
  );

  const updateTransaction = useCallback<FinanceContextValue["updateTransaction"]>(
    async (id, patch) => {
      replaceIn("transactions", await api.updateTransaction(id, patch));
    },
    [replaceIn],
  );

  const deleteTransaction = useCallback<FinanceContextValue["deleteTransaction"]>(
    async (id) => {
      await api.deleteTransaction(id);
      removeFrom("transactions", id);
    },
    [removeFrom],
  );

  const settleTransaction = useCallback<FinanceContextValue["settleTransaction"]>(
    async (id) => {
      /*
       * O tipo sai do estado local porque `settledStatusFor` precisa dele e
       * buscá-lo no servidor custaria uma ida a mais para saber algo que a
       * tela já tem na mão.
       */
      const target = data.transactions.find((item) => item.id === id);
      if (!target) return undefined;

      const settled = await api.updateTransaction(id, {
        status: settledStatusFor(target.type),
        settledAt: today(),
      });
      replaceIn("transactions", settled);
      return settled;
    },
    [data.transactions, replaceIn],
  );

  const reopenTransaction = useCallback<FinanceContextValue["reopenTransaction"]>(
    async (id) => {
      /* `settledAt: undefined` é traduzido para `null` pelo mapeador de patch:
         a chave está presente, então é limpeza, não omissão. */
      replaceIn(
        "transactions",
        await api.updateTransaction(id, { status: "pendente", settledAt: undefined }),
      );
    },
    [replaceIn],
  );

  const updateSeries = useCallback<FinanceContextValue["updateSeries"]>(
    async (recurrenceId, patch) => {
      const changed = await api.updateSeries(recurrenceId, patch);
      if (changed.length === 0) return;

      const byId = new Map(changed.map((item) => [item.id, item]));
      setData((current) => ({
        ...current,
        transactions: current.transactions.map((item) => byId.get(item.id) ?? item),
      }));
    },
    [],
  );

  /* -------------------------------- Bancos ------------------------------- */

  const createBank = useCallback<FinanceContextValue["createBank"]>(
    async (draft) => {
      const created = await api.insertBank(requireOrg(), draft);
      setData((current) => ({ ...current, banks: [...current.banks, created] }));
      return created;
    },
    [requireOrg],
  );

  const updateBank = useCallback<FinanceContextValue["updateBank"]>(
    async (id, patch) => {
      replaceIn("banks", await api.updateBank(id, patch));
    },
    [replaceIn],
  );

  /*
   * Banco com conta vinculada não é apagado: a chave estrangeira é `restrict` e
   * o Postgres recusa. O erro sobe traduzido para quem chamou decidir o que
   * dizer ao usuário.
   */
  const deleteBank = useCallback<FinanceContextValue["deleteBank"]>(
    async (id) => {
      await api.deleteBank(id);
      removeFrom("banks", id);
    },
    [removeFrom],
  );

  /* -------------------------------- Contas ------------------------------- */

  const createAccount = useCallback<FinanceContextValue["createAccount"]>(
    async (draft) => {
      const created = await api.insertAccount(requireOrg(), draft);
      setData((current) => ({ ...current, accounts: [...current.accounts, created] }));
      return created;
    },
    [requireOrg],
  );

  const updateAccount = useCallback<FinanceContextValue["updateAccount"]>(
    async (id, patch) => {
      replaceIn("accounts", await api.updateAccount(id, patch));
    },
    [replaceIn],
  );

  /*
   * As exclusões abaixo recarregam em vez de remendar o estado local.
   *
   * Apagar uma conta solta o `accountId` de todo lançamento que a citava;
   * apagar uma categoria leva os itens do plano junto e solta os lançamentos.
   * Esses efeitos acontecem dentro do Postgres, pelas chaves estrangeiras —
   * reproduzi-los aqui seria manter a mesma regra escrita em dois lugares,
   * para descobrir na primeira divergência que a tela mente sobre o banco.
   */
  const deleteAccount = useCallback<FinanceContextValue["deleteAccount"]>(
    async (id) => {
      await api.deleteAccount(id);
      await reload();
    },
    [reload],
  );

  /* ------------------------------- Empresas ------------------------------ */

  const createCompany = useCallback<FinanceContextValue["createCompany"]>(
    async (draft) => {
      const created = await api.insertCompany(requireOrg(), draft);
      setData((current) => ({ ...current, companies: [...current.companies, created] }));
      return created;
    },
    [requireOrg],
  );

  const updateCompany = useCallback<FinanceContextValue["updateCompany"]>(
    async (id, patch) => {
      replaceIn("companies", await api.updateCompany(id, patch));
    },
    [replaceIn],
  );

  const deleteCompany = useCallback<FinanceContextValue["deleteCompany"]>(
    async (id) => {
      await api.deleteCompany(id);
      await reload();
    },
    [reload],
  );

  /* ---------------------------- Plano de contas -------------------------- */

  const createCategory = useCallback<FinanceContextValue["createCategory"]>(
    async (draft) => {
      const created = await api.insertCategory(requireOrg(), draft);
      setData((current) => ({ ...current, categories: [...current.categories, created] }));
      return created;
    },
    [requireOrg],
  );

  const updateCategory = useCallback<FinanceContextValue["updateCategory"]>(
    async (id, patch) => {
      replaceIn("categories", await api.updateCategory(id, patch));
    },
    [replaceIn],
  );

  const deleteCategory = useCallback<FinanceContextValue["deleteCategory"]>(
    async (id) => {
      await api.deleteCategory(id);
      await reload();
    },
    [reload],
  );

  const createExpense = useCallback<FinanceContextValue["createExpense"]>(
    async (draft) => {
      const created = await api.insertExpense(requireOrg(), draft);
      setData((current) => ({ ...current, expenses: [...current.expenses, created] }));
      return created;
    },
    [requireOrg],
  );

  const updateExpense = useCallback<FinanceContextValue["updateExpense"]>(
    async (id, patch) => {
      replaceIn("expenses", await api.updateExpense(id, patch));
    },
    [replaceIn],
  );

  const deleteExpense = useCallback<FinanceContextValue["deleteExpense"]>(
    async (id) => {
      await api.deleteExpense(id);
      await reload();
    },
    [reload],
  );

  /* ----------------------------- Recorrências ---------------------------- */

  const createRecurrence = useCallback<FinanceContextValue["createRecurrence"]>(
    async (draft) => {
      const created = await api.insertRecurrence(requireOrg(), draft);
      setData((current) => ({ ...current, recurrences: [...current.recurrences, created] }));
      return created;
    },
    [requireOrg],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...data,
      ready,
      loading,
      error,
      createTransaction,
      createTransactions,
      updateTransaction,
      deleteTransaction,
      settleTransaction,
      reopenTransaction,
      updateSeries,
      createBank,
      updateBank,
      deleteBank,
      createAccount,
      updateAccount,
      deleteAccount,
      createCompany,
      updateCompany,
      deleteCompany,
      createCategory,
      updateCategory,
      deleteCategory,
      createExpense,
      updateExpense,
      deleteExpense,
      createRecurrence,
      reload,
    }),
    [
      data, ready, loading, error,
      createTransaction, createTransactions, updateTransaction, deleteTransaction,
      settleTransaction, reopenTransaction, updateSeries,
      createBank, updateBank, deleteBank,
      createAccount, updateAccount, deleteAccount,
      createCompany, updateCompany, deleteCompany,
      createCategory, updateCategory, deleteCategory,
      createExpense, updateExpense, deleteExpense,
      createRecurrence, reload,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance precisa estar dentro de <FinanceProvider>.");
  return context;
}
