import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import type { Account, Bank, Transaction } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CollapseHandle } from "@/components/common/collapse-handle";
import { MoneyValue } from "@/components/common/money-value";
import { BankMark } from "@/components/finance/bank-mark";
import { useFinance } from "@/store/finance-context";
import { ALL_COMPANIES, useWorkspace } from "@/store/workspace-context";
import { ALL_ACCOUNTS, useBalanceWatch } from "@/store/balance-watch-context";
import { formatDate } from "@/lib/date";
import { accountBalance, isOpen, isSettled, projectedBalance } from "@/lib/finance";
import { formatCompactCurrency, formatCurrency, maskAccountNumber } from "@/lib/format";
import { cn, sortBy, sum } from "@/lib/utils";

/**
 * Painel de saldo.
 *
 * Ancorado na lateral direita como parte do layout — não flutua por cima do
 * conteúdo, não precisa medir colisão com nada. É a régua fixa contra a qual
 * o extrato do banco é conferido enquanto se lança entradas e saídas, com um
 * histórico recente para riscar item a item contra o extrato de papel.
 *
 * Continua visível com um formulário modal aberto — é assim que o saldo
 * acompanha o lançamento em digitação — mas fica inerte enquanto o modal
 * está aberto, como o resto da página por trás dele.
 *
 * Abaixo de `lg` não há largura para uma coluna fixa; o mesmo número aparece
 * então dentro do próprio formulário (ver `transaction-form-dialog.tsx`).
 */

const RECENT_LIMIT = 10;

interface Watched {
  label: string;
  hint: string;
  account: Account | null;
  /** Banco da conta observada — traz nome e cor para a marca. */
  bank: Bank | null;
  /** Contas somadas em `current`/`projected` — filtra o histórico recente. */
  scope: Account[];
  current: number;
  projected: number;
  pendingCount: number;
}

export interface BalancePanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function BalancePanel({ collapsed, onToggleCollapse }: BalancePanelProps) {
  const { accounts, transactions, banks } = useFinance();
  const { companyScope, range } = useWorkspace();
  const { watched, setWatched, draft } = useBalanceWatch();

  const visibleAccounts = useMemo(
    () =>
      companyScope === ALL_COMPANIES
        ? accounts
        : accounts.filter((account) => account.companyId === companyScope),
    [accounts, companyScope],
  );

  /**
   * A conta do lançamento em digitação manda no painel: é o saldo dela que
   * está prestes a mudar. Fora isso, vale a escolha feita aqui.
   */
  const followingDraft = Boolean(draft?.accountId);
  const selectedId = draft?.accountId ?? watched;

  const target = useMemo<Watched | null>(() => {
    const account = visibleAccounts.find((item) => item.id === selectedId) ?? null;
    const scope = account ? [account] : visibleAccounts;
    if (scope.length === 0) return null;

    const pendingCount = transactions.filter(
      (item) =>
        isOpen(item) &&
        item.dueDate <= range.to &&
        scope.some((candidate) => candidate.id === item.accountId),
    ).length;

    const bank = account ? banks.find((item) => item.id === account.bankId) ?? null : null;

    return {
      label: account ? account.name : "Todas as contas",
      hint: account
        ? `${bank?.name ?? "Sem banco"} · ${maskAccountNumber(account.number)}`
        : `${scope.length} ${scope.length === 1 ? "conta" : "contas"}`,
      account,
      bank,
      scope,
      current: sum(scope.map((item) => accountBalance(item, transactions))),
      projected: sum(scope.map((item) => projectedBalance(item, transactions, range))),
      pendingCount,
    };
  }, [visibleAccounts, selectedId, transactions, range, banks]);

  /**
   * Últimos lançamentos liquidados da conta observada — o que dá para riscar
   * item a item contra o extrato de papel, sem sair do painel.
   */
  const recent = useMemo<Transaction[]>(() => {
    if (!target) return [];
    const settled = transactions.filter(
      (item) => isSettled(item) && target.scope.some((account) => account.id === item.accountId),
    );
    return sortBy(settled, (item) => item.settledAt ?? item.dueDate, "desc").slice(0, RECENT_LIMIT);
  }, [target, transactions]);

  // A borda/fundo vão do topo ao rodapé da tela — como a sidebar esquerda —
  // mas por `fixed`, não como item de flex: a largura do header nunca
  // depende do painel, porque o header nem sabe que ele existe. Quem reserva
  // o espaço para o painel na coluna de conteúdo é o spacer abaixo, um
  // irmão "invisível" do mesmo tamanho.
  const spacerClass = cn(
    "hidden shrink-0 transition-[width] duration-300 ease-panel lg:block",
    collapsed ? "w-[4.75rem]" : "w-72",
  );
  const panelShellClass = cn(
    "fixed right-0 top-0 z-20 hidden h-screen flex-col border-l border-border/70 bg-card transition-[width] duration-300 ease-panel lg:flex",
    collapsed ? "w-[4.75rem]" : "w-72",
  );

  if (!target) {
    return (
      <>
        <div className={spacerClass} aria-hidden />
        <div className={panelShellClass} />
      </>
    );
  }

  /** O lançamento em digitação só conta quando é da conta observada. */
  const pending =
    draft && draft.amount > 0 && draft.accountId
      ? target.account
        ? draft.accountId === target.account.id
          ? draft
          : null
        : visibleAccounts.some((item) => item.id === draft.accountId)
          ? draft
          : null
      : null;

  const delta = pending ? (pending.type === "entrada" ? pending.amount : -pending.amount) : 0;
  // Um lançamento pendente não mexe no extrato de hoje — só no previsto.
  const nextCurrent = pending?.settled ? target.current + delta : target.current;

  return (
    <>
      <div className={spacerClass} aria-hidden />
      <div className={panelShellClass}>
      <CollapseHandle
        side="right"
        collapsed={collapsed}
        onToggle={onToggleCollapse}
        expandLabel="Expandir saldo"
        collapseLabel="Recolher saldo"
      />

      {/* Reserva a altura do header global: o painel encosta no topo da
          tela e se conecta a ele por fora (a borda continua até lá), mas
          nenhum conteúdo do painel fica escondido atrás do header. */}
      <div className="h-16 shrink-0" aria-hidden />

      {collapsed ? (
        // `key` força a remontagem ao alternar com a versão expandida, para
        // que o conteúdo (bem diferente de um lado para o outro) entre com
        // fade em vez de tentar morphar de um layout para o outro.
        <div key="collapsed" className="flex flex-1 flex-col items-center gap-3 py-4 animate-fade-in">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 transition-colors hover:bg-muted/60"
              >
                <Wallet className={cn("h-4 w-4", target.current < 0 ? "text-danger" : "text-primary")} />
                <span className="max-w-[3.5rem] text-center text-[10.5px] font-semibold leading-tight tabular">
                  {formatCompactCurrency(target.current).replace("R$ ", "")}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-medium">{target.label}</p>
              <p className="tabular">{formatCurrency(target.current)}</p>
            </TooltipContent>
          </Tooltip>

          {target.pendingCount > 0 && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span className="mt-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-warning-soft px-1.5 text-[10.5px] font-semibold text-warning">
                  {target.pendingCount}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left">
                {target.pendingCount} {target.pendingCount === 1 ? "lançamento pendente" : "lançamentos pendentes"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <div key="expanded" className="flex flex-1 flex-col overflow-y-auto animate-fade-in">
          <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-4">
            {target.account ? (
              <BankMark name={target.bank?.name ?? "—"} color={target.bank?.color} size="sm" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Landmark className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight">{target.label}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">{target.hint}</p>
            </div>
          </header>

          <div className="px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Saldo atual</p>
            <MoneyValue
              value={target.current}
              size="lg"
              tone={target.current < 0 ? "negative" : "neutral"}
              className="mt-1 block"
            />
          </div>

          {/* O lançamento em digitação, e o saldo que ele deixaria para trás. */}
          {pending && (
            <div className="animate-fade-in border-t border-border/60 bg-muted/40 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  {pending.type === "entrada" ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-success" strokeWidth={2.2} />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                  )}
                  Este lançamento
                </span>
                <MoneyValue value={pending.amount} type={pending.type} tone="auto" showSign size="sm" />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/50 pt-2">
                <span className="text-[12px] font-medium">
                  {pending.settled ? "Saldo ficaria em" : "Não muda o saldo hoje"}
                </span>
                {pending.settled ? (
                  <MoneyValue value={nextCurrent} size="sm" tone={nextCurrent < 0 ? "negative" : "neutral"} />
                ) : (
                  <span className="text-[11.5px] text-muted-foreground">entra no previsto</span>
                )}
              </div>
            </div>
          )}

          {/* Histórico recente — o que dá para riscar contra o extrato do
              banco sem sair do painel nem abrir a tabela de movimentações. */}
          <div className="border-t border-border/60 px-4 py-3.5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Últimos lançamentos
            </p>
            {recent.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Nenhum lançamento liquidado ainda.</p>
            ) : (
              <ul className="space-y-2.5">
                {recent.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium leading-tight">{item.description}</p>
                      <p className="tabular text-[11px] text-muted-foreground">
                        {formatDate(item.settledAt ?? item.dueDate)}
                      </p>
                    </div>
                    <MoneyValue
                      value={item.amount}
                      type={item.type}
                      tone="auto"
                      showSign
                      size="xs"
                      className="shrink-0 pt-px"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-auto border-t border-border/60 px-4 py-3.5">
            {followingDraft ? (
              <p className="text-[11.5px] leading-snug text-info">Seguindo a conta escolhida no lançamento.</p>
            ) : (
              <>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Observando
                </p>
                <Select value={watched} onValueChange={(value) => setWatched(value)}>
                  <SelectTrigger className="h-9 text-[12.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ACCOUNTS}>Todas as contas</SelectItem>
                    {visibleAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
