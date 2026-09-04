import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftRight, CalendarDays, CircleDot, List, Plus } from "lucide-react";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/types";
import { PageHeader } from "@/components/common/page-header";
import { FilterBar } from "@/components/common/filter-bar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { MoneyValue } from "@/components/common/money-value";
import { AccountMultiSelect, CategoryMultiSelect, ExpenseMultiSelect } from "@/components/common/selectors";
import { MultiSelect } from "@/components/common/multi-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionTable } from "@/components/finance/transaction-table";
import { CalendarView } from "@/components/finance/calendar-view";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import { TransactionDetailsDialog } from "@/components/finance/transaction-details-dialog";
import { useFinance } from "@/store/finance-context";
import { useWorkspace } from "@/store/workspace-context";
import { useScopedData } from "@/hooks/use-scoped-transactions";
import { STATUS_LABELS, resolveStatus, totalize, TYPE_LABELS } from "@/lib/finance";
import { normalize } from "@/lib/utils";

type ViewMode = "lista" | "calendario";

const STATUS_FILTERS: TransactionStatus[] = [
  "pendente",
  "pago",
  "recebido",
  "atrasado",
];

export function TransactionsPage() {
  const {
    expenses,
    settleTransaction,
    reopenTransaction,
    deleteTransaction,
  } = useFinance();
  const { reference } = useWorkspace();
  const { transactions, recurrences } = useScopedData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros acumulam opções: lista vazia significa "sem filtro", que é o
  // mesmo que marcar todas — e evita obrigar o usuário a marcar uma a uma.
  const [view, setView] = useState<ViewMode>("lista");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TransactionStatus[]>([]);
  const [type, setType] = useState<TransactionType[]>([]);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [expenseIds, setExpenseIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  // O atalho "Ver pendências" do Dashboard chega por query string.
  useEffect(() => {
    const param = searchParams.get("status");
    if (param && (STATUS_FILTERS as string[]).includes(param)) {
      setStatus([param as TransactionStatus]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const rows = transactions;

  const filtered = useMemo(() => {
    const term = normalize(search.trim());

    return rows.filter((item) => {
      if (status.length > 0 && !status.includes(resolveStatus(item, reference))) return false;
      if (type.length > 0 && !type.includes(item.type)) return false;
      if (accountIds.length > 0 && (!item.accountId || !accountIds.includes(item.accountId))) return false;
      if (categoryIds.length > 0 && (!item.categoryId || !categoryIds.includes(item.categoryId))) return false;
      if (expenseIds.length > 0 && (!item.expenseId || !expenseIds.includes(item.expenseId))) return false;
      if (!term) return true;
      return (
        normalize(item.description).includes(term) ||
        normalize(item.counterparty ?? "").includes(term) ||
        normalize(item.notes ?? "").includes(term)
      );
    });
  }, [rows, search, status, type, accountIds, categoryIds, expenseIds, reference]);

  const totals = useMemo(() => totalize(filtered), [filtered]);

  // Conta opções marcadas, não campos preenchidos: escolher três status é
  // mais filtro do que escolher um, e o "Limpar (n)" reflete isso.
  const activeFilters =
    status.length + type.length + accountIds.length + categoryIds.length + expenseIds.length + (search ? 1 : 0);

  /**
   * Trocar as categorias descarta as despesas que saíram do recorte. Sem isso
   * o filtro seguiria valendo escondido: a tabela ficaria vazia e a opção
   * responsável nem apareceria na lista para ser desmarcada.
   */
  const changeCategories = (values: string[]) => {
    setCategoryIds(values);
    if (values.length === 0) return;
    setExpenseIds((current) =>
      current.filter((id) => {
        const expense = expenses.find((item) => item.id === id);
        return expense ? values.includes(expense.categoryId) : false;
      }),
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatus([]);
    setType([]);
    setAccountIds([]);
    setCategoryIds([]);
    setExpenseIds([]);
  };

  const handleSettle = (transaction: Transaction) => {
    settleTransaction(transaction.id);
    setSelected(null);
    toast.success(
      transaction.type === "entrada" ? "Recebimento registrado com sucesso." : "Pagamento registrado com sucesso.",
      {
        description: transaction.description,
        action: { label: "Desfazer", onClick: () => reopenTransaction(transaction.id) },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações"
        description="Todos os lançamentos financeiros das suas empresas, incluindo os que se repetem."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Nova movimentação
          </Button>
        }
      />

      {/* Totais do recorte atual — muda junto com os filtros. */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Entradas", value: totals.inflow, tone: "positive" as const, count: totals.inflowCount },
          { label: "Saídas", value: totals.outflow, tone: "negative" as const, count: totals.outflowCount },
          { label: "Resultado", value: totals.result, tone: "auto" as const, count: filtered.length },
        ].map((item) => (
          <Card key={item.label} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-[12.5px] text-muted-foreground">{item.label}</p>
              <MoneyValue
                value={item.value}
                tone={item.tone}
                showSign={item.tone === "auto"}
                size="md"
                className="mt-0.5 block"
              />
            </div>
            <span className="text-[12.5px] tabular text-muted-foreground">{item.count}</span>
          </Card>
        ))}
      </section>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por descrição, cliente ou observação…"
        activeCount={activeFilters}
        onClear={clearFilters}
        trailing={
          <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="lista">
                <List className="h-3.5 w-3.5" /> Lista
              </TabsTrigger>
              <TabsTrigger value="calendario">
                <CalendarDays className="h-3.5 w-3.5" /> Calendário
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <MultiSelect
          options={[
            { value: "entrada", label: TYPE_LABELS.entrada },
            { value: "saida", label: TYPE_LABELS.saida },
          ]}
          selected={type}
          onChange={(values) => setType(values as TransactionType[])}
          allLabel="Todos os tipos"
          countLabel="tipos"
          icon={ArrowLeftRight}
          className="sm:w-[11rem]"
        />

        <MultiSelect
          options={STATUS_FILTERS.map((option) => ({ value: option, label: STATUS_LABELS[option] }))}
          selected={status}
          onChange={(values) => setStatus(values as TransactionStatus[])}
          allLabel="Todos os status"
          countLabel="status"
          icon={CircleDot}
          className="sm:w-[11.5rem]"
        />

        <AccountMultiSelect selected={accountIds} onChange={setAccountIds} className="sm:w-[13rem]" />
        <CategoryMultiSelect selected={categoryIds} onChange={changeCategories} className="sm:w-[14rem]" />
        <ExpenseMultiSelect
          selected={expenseIds}
          onChange={setExpenseIds}
          categoryIds={categoryIds}
          className="sm:w-[14rem]"
        />
      </FilterBar>

      {view === "lista" ? (
        <TransactionTable
          transactions={filtered}
          onSelect={setSelected}
          onSettle={handleSettle}
          onEdit={(transaction) => {
            setEditing(transaction);
            setFormOpen(true);
          }}
          onDelete={setPendingDelete}
          emptyDescription={
            activeFilters > 0
              ? "Nenhum lançamento corresponde aos filtros aplicados."
              : "Registre a primeira movimentação para começar."
          }
          emptyAction={
            activeFilters > 0 ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus /> Nova movimentação
              </Button>
            )
          }
        />
      ) : (
        <CalendarView transactions={filtered} reference={reference} onSelect={setSelected} />
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        onSaved={(transaction, mode, recurrence, parcelasAtualizadas) => {
          if (parcelasAtualizadas) {
            toast.success(`Série atualizada em ${parcelasAtualizadas} parcelas.`, {
              description: transaction.description,
            });
            return;
          }
          toast.success(mode === "create" ? "Lançamento criado com sucesso." : "Lançamento atualizado.", {
            description: recurrence
              ? `${transaction.description} · repetição criada`
              : transaction.description,
          });
        }}
      />

      <TransactionDetailsDialog
        transaction={selected}
        recurrence={
          selected?.recurrenceId
            ? recurrences.find((item) => item.id === selected.recurrenceId) ?? null
            : null
        }
        onOpenChange={(open) => !open && setSelected(null)}
        onSettle={handleSettle}
        onReopen={(transaction) => {
          reopenTransaction(transaction.id);
          setSelected(null);
          toast.info("Lançamento reaberto como pendente.");
        }}
        onEdit={(transaction) => {
          setSelected(null);
          setEditing(transaction);
          setFormOpen(true);
        }}
        onDelete={(transaction) => {
          setSelected(null);
          setPendingDelete(transaction);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir movimentação?"
        description={
          pendingDelete ? (
            <>
              O lançamento <strong className="font-medium text-foreground">{pendingDelete.description}</strong> será
              removido permanentemente e deixará de compor os indicadores.
            </>
          ) : null
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteTransaction(pendingDelete.id);
          toast.success("Lançamento excluído.");
          setPendingDelete(null);
        }}
      />

    </div>
  );
}
