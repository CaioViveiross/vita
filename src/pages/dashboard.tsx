import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Scale,
  Wallet,
} from "lucide-react";
import type { Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FinancialCard } from "@/components/common/financial-card";
import { MoneyValue } from "@/components/common/money-value";
import { AccountCard } from "@/components/finance/account-card";
import { FinancialChart } from "@/components/finance/financial-chart";
import { BreakdownPanel } from "@/components/finance/breakdown-panel";
import { TodayPanel } from "@/components/finance/today-panel";
import { UpcomingList } from "@/components/finance/upcoming-list";
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import { TransactionDetailsDialog } from "@/components/finance/transaction-details-dialog";
import { useFinance } from "@/store/finance-context";
import { useWorkspace } from "@/store/workspace-context";
import { useScopedData } from "@/hooks/use-scoped-transactions";
import { formatLongDate, isWithin, previousRange } from "@/lib/date";
import {
  buildAccountBalances,
  inRange,
  isOpen,
  isSettled,
  needsAction,
  signedAmount,
  totalize,
} from "@/lib/finance";
import { percentChange, sum } from "@/lib/utils";
import { useAuth } from "@/store/auth-context";

/** Saudação conforme o horário — o painel é aberto de manhã, mas nem sempre. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { companies, settleTransaction, reopenTransaction, deleteTransaction } = useFinance();
  const { profile } = useAuth();
  const { range, reference } = useWorkspace();
  const { transactions, accounts } = useScopedData();

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"entrada" | "saida">("saida");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const summary = useMemo(() => {
    const previous = previousRange(range);
    const balances = buildAccountBalances(accounts, companies, transactions, range);
    const totalBalance = sum(balances.map((item) => item.current));

    // O card mostra o que ainda está em aberto; a comparação usa o movimento
    // total dos dois períodos, para não confrontar bases diferentes.
    const forecast = totalize(inRange(transactions, range).filter(isOpen));
    const currentAll = totalize(inRange(transactions, range));
    const previousAll = totalize(inRange(transactions, previous));

    // Saldo de referência: o saldo de hoje desfazendo o que foi liquidado
    // durante a janela anterior — equivale ao saldo de N dias atrás.
    const settledBefore = transactions.filter(
      (item) => isSettled(item) && item.settledAt && isWithin(item.settledAt, previous),
    );
    const balanceStart = totalBalance - sum(settledBefore.map(signedAmount));

    const pending = transactions.filter((item) => needsAction(item, reference));
    const overdue = pending.filter((item) => item.dueDate < reference);

    return {
      balances,
      totalBalance,
      forecast,
      balanceChange: percentChange(totalBalance, balanceStart),
      inflowChange: percentChange(currentAll.inflow, previousAll.inflow),
      outflowChange: percentChange(currentAll.outflow, previousAll.outflow),
      pending,
      overdue,
      overdueAmount: sum(overdue.map((item) => item.amount)),
      todayIn: pending.filter((item) => item.type === "entrada").length,
      todayOut: pending.filter((item) => item.type === "saida").length,
    };
  }, [accounts, companies, transactions, range, reference]);

  const upcoming = useMemo(
    () => transactions.filter((item) => isOpen(item) && item.dueDate > reference),
    [transactions, reference],
  );

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

  const openNew = (type: "entrada" | "saida") => {
    setEditing(null);
    setFormType(type);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho de boas-vindas */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-[1.75rem]">
            {greeting()}
            {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Aqui está o resumo financeiro da sua operação ·{" "}
            {formatLongDate(reference)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openNew("entrada")}>
            <ArrowDownLeft className="text-success" /> Nova entrada
          </Button>
          <Button variant="outline" size="sm" onClick={() => openNew("saida")}>
            <ArrowUpRight className="text-danger" /> Nova saída
          </Button>
          <Button size="sm" onClick={() => navigate("/movimentacoes?status=atrasado")}>
            Ver pendências
          </Button>
        </div>
      </header>

      {/* Resumo do dia em uma frase — o primeiro item que a gerente lê. */}
      {(summary.pending.length > 0 || summary.overdue.length > 0) && (
        <Card className="flex flex-col gap-3 border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
          <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-soft text-danger">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <span>
                <strong className="font-semibold">{summary.todayOut}</strong>{" "}
                {summary.todayOut === 1 ? "pagamento pendente" : "pagamentos pendentes"} hoje
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-soft text-success">
                <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <span>
                <strong className="font-semibold">{summary.todayIn}</strong>{" "}
                {summary.todayIn === 1 ? "recebimento previsto" : "recebimentos previstos"} hoje
              </span>
            </span>
            {summary.overdue.length > 0 && (
              <span className="flex items-center gap-2 text-danger">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-soft">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <span>
                  <strong className="font-semibold">{summary.overdue.length}</strong> em atraso ·{" "}
                  <MoneyValue value={summary.overdueAmount} size="xs" tone="negative" />
                </span>
              </span>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate("/movimentacoes")} className="shrink-0 self-start sm:self-auto">
            Abrir movimentações <ChevronRight />
          </Button>
        </Card>
      )}

      {/* Indicadores. 4 colunas só a partir de `2xl`: com a sidebar e o
          painel de saldo abertos, `xl` ainda não sobra espaço suficiente e os
          valores maiores acabavam cortados atrás do painel. */}
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <FinancialCard
          label="Saldo total"
          value={summary.totalBalance}
          icon={Wallet}
          accent="primary"
          change={summary.balanceChange}
          hint={`${summary.balances.length} ${summary.balances.length === 1 ? "conta" : "contas"}`}
        />
        <FinancialCard
          label="Entradas previstas"
          value={summary.forecast.inflow}
          icon={ArrowDownLeft}
          accent="positive"
          change={summary.inflowChange}
          hint={`${summary.forecast.inflowCount} ${summary.forecast.inflowCount === 1 ? "lançamento" : "lançamentos"}`}
        />
        <FinancialCard
          label="Saídas previstas"
          value={summary.forecast.outflow}
          icon={ArrowUpRight}
          accent="negative"
          change={summary.outflowChange}
          hint={`${summary.forecast.outflowCount} ${summary.forecast.outflowCount === 1 ? "lançamento" : "lançamentos"}`}
        />
        <FinancialCard
          label="Resultado previsto"
          value={summary.forecast.result}
          icon={Scale}
          accent="neutral"
          signed
          hint="Entradas − saídas no período"
        />
      </section>

      {/* Ação do dia vem antes do gráfico: é o que exige decisão imediata. */}
      <TodayPanel
        transactions={summary.pending}
        reference={reference}
        onSettle={handleSettle}
        onSelect={setSelected}
      />

      <FinancialChart transactions={transactions} from={reference} />

      <BreakdownPanel transactions={transactions} range={range} previous={previousRange(range)} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Saldo das contas</h2>
              <p className="text-[13px] text-muted-foreground">Consolidado das contas ativas.</p>
            </div>
            <div className="text-right">
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">Consolidado</p>
              <MoneyValue value={summary.totalBalance} size="md" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {summary.balances.slice(0, 4).map((balance) => (
              <AccountCard key={balance.account.id} balance={balance} onClick={() => navigate("/contas")} />
            ))}
          </div>

          {summary.balances.length > 4 && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/contas")} className="w-full">
              Ver todas as {summary.balances.length} contas <ChevronRight />
            </Button>
          )}
        </section>

        <UpcomingList transactions={upcoming} onSelect={setSelected} limit={7} />
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        defaultType={formType}
        onSaved={(transaction, mode) =>
          toast.success(mode === "create" ? "Lançamento criado com sucesso." : "Lançamento atualizado.", {
            description: transaction.description,
          })
        }
      />

      <TransactionDetailsDialog
        transaction={selected}
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
          deleteTransaction(transaction.id);
          setSelected(null);
          toast.success("Lançamento excluído.");
        }}
      />
    </div>
  );
}
