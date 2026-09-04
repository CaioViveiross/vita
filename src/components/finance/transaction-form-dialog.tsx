import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  Repeat,
} from "lucide-react";
import type {
  Account,
  DateRange,
  Frequency,
  ID,
  ISODate,
  PersistedStatus,
  Recurrence,
  Transaction,
  TransactionType,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateField } from "@/components/common/date-field";
import { MoneyValue } from "@/components/common/money-value";
import { NonBusinessDayDialog, type Decisions } from "@/components/finance/non-business-day-dialog";
import { ScheduleCalendar } from "@/components/finance/schedule-calendar";
import { SeriesScopeDialog } from "@/components/finance/series-scope-dialog";
import { useFinance, type RecurrenceDraft, type TransactionDraft } from "@/store/finance-context";
import { ALL_COMPANIES, useWorkspace } from "@/store/workspace-context";
import { useBalanceWatch } from "@/store/balance-watch-context";
import { formatDate, today } from "@/lib/date";
import { formatAmount, parseAmount } from "@/lib/format";
import { accountBalance, STATUS_LABELS } from "@/lib/finance";
import {
  CONFLICT_HORIZON,
  cycleNoun,
  endDateAfter,
  findNonBusinessDays,
  FREQUENCY_LABELS,
  nextOccurrences,
  theoreticalDates,
  type Schedule,
} from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o formulário entra em modo de edição. */
  transaction?: Transaction | null;
  /** Tipo pré-selecionado — usado pelos atalhos "Nova entrada"/"Nova saída". */
  defaultType?: TransactionType;
  onSaved?: (
    transaction: Transaction,
    mode: "create" | "update",
    /** Preenchido quando o lançamento também criou uma regra de repetição. */
    recurrence?: Recurrence,
    /** Quantas parcelas da série a edição alcançou, quando foi em lote. */
    parcelasAtualizadas?: number,
  ) => void;
}

interface FormState {
  type: TransactionType;
  description: string;
  amount: string;
  dueDate: ISODate;
  companyId: ID | "";
  accountId: ID | "";
  categoryId: ID | "";
  expenseId: ID | "";
  status: PersistedStatus;
  counterparty: string;
  notes: string;
  /** A bandeira: este lançamento se repete? */
  repeats: boolean;
  frequency: Frequency;
  occurrences: string;
  /** Decisões de dia não útil, por data teórica da parcela. */
  adjustments: Decisions;
}

const STATUS_OPTIONS: Record<TransactionType, PersistedStatus[]> = {
  entrada: ["pendente", "recebido"],
  saida: ["pendente", "pago"],
};

const FREQUENCIES: Frequency[] = ["diaria", "semanal", "quinzenal", "mensal", "anual"];

function emptyForm(type: TransactionType, companyId: ID | ""): FormState {
  return {
    type,
    description: "",
    amount: "",
    dueDate: today(),
    companyId,
    accountId: "",
    categoryId: "",
    expenseId: "",
    status: "pendente",
    counterparty: "",
    notes: "",
    repeats: false,
    frequency: "mensal",
    occurrences: "12",
    adjustments: {},
  };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultType = "saida",
  onSaved,
}: TransactionFormDialogProps) {
  const {
    companies,
    accounts,
    transactions,
    categories,
    expenses,
    createTransaction,
    createTransactions,
    updateTransaction,
    updateSeries,
    createRecurrence,
  } = useFinance();
  const { companyScope, range } = useWorkspace();
  const { setDraft } = useBalanceWatch();
  const isEditing = Boolean(transaction);

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultType, ""));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  /** O alerta abriu ao tentar salvar: confirmar as datas conclui o salvamento. */
  const [reviewBeforeSave, setReviewBeforeSave] = useState(false);
  /** Editando uma parcela: aguardando a resposta sobre o escopo da alteração. */
  const [scopeOpen, setScopeOpen] = useState(false);
  /** Uma gravação em andamento: trava o botão e o reenvio. */
  const [saving, setSaving] = useState(false);

  // Reabrir o diálogo sempre recompõe o estado a partir das props.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setReviewOpen(false);
    setReviewBeforeSave(false);
    setSaving(false);
    if (transaction) {
      setForm({
        ...emptyForm(transaction.type, transaction.companyId),
        type: transaction.type,
        description: transaction.description,
        amount: formatAmount(transaction.amount),
        dueDate: transaction.dueDate,
        companyId: transaction.companyId,
        accountId: transaction.accountId ?? "",
        categoryId: transaction.categoryId ?? "",
        expenseId: transaction.expenseId ?? "",
        status: transaction.status,
        counterparty: transaction.counterparty ?? "",
        notes: transaction.notes ?? "",
        // A repetição pertence à série, não ao lançamento: editar uma parcela
        // nunca altera as outras.
        repeats: false,
      });
      return;
    }
    const scoped = companyScope !== ALL_COMPANIES ? companyScope : companies[0]?.id ?? "";
    setForm(emptyForm(defaultType, scoped));
  }, [open, transaction, defaultType, companyScope, companies]);

  /**
   * Enquanto o formulário está aberto, o balão de saldo acompanha o que está
   * sendo digitado — é com ele que a conferência contra o extrato acontece.
   */
  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }
    setDraft({
      accountId: form.accountId || null,
      type: form.type,
      amount: parseAmount(form.amount),
      settled: form.status === "pago" || form.status === "recebido",
    });
  }, [open, form.accountId, form.type, form.amount, form.status, setDraft]);

  // Desmontar o formulário sem fechá-lo (trocar de página) também limpa o balão.
  useEffect(() => () => setDraft(null), [setDraft]);

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => !form.companyId || account.companyId === form.companyId),
    [accounts, form.companyId],
  );

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.kind === form.type),
    [categories, form.type],
  );

  const visibleExpenses = useMemo(
    () => expenses.filter((expense) => expense.categoryId === form.categoryId),
    [expenses, form.categoryId],
  );

  /** Trocar o tipo invalida categoria e status, que são específicos por natureza. */
  const changeType = (type: TransactionType) => {
    setForm((current) => ({
      ...current,
      type,
      categoryId: "",
      expenseId: "",
      status: STATUS_OPTIONS[type].includes(current.status) ? current.status : "pendente",
    }));
  };

  /**
   * Parcelas da série que ainda podem ser alteradas em lote. Editar uma
   * parcela solta (ou a única em aberto) não precisa de pergunta nenhuma.
   */
  const parcelasPendentes = useMemo(() => {
    if (!transaction?.recurrenceId) return 0;
    return transactions.filter(
      (item) => item.recurrenceId === transaction.recurrenceId && item.status === "pendente",
    ).length;
  }, [transactions, transaction]);

  /* ---------------------------- Repetição ---------------------------- */

  const repeatCount = Number(form.occurrences);

  /**
   * O calendário da série, derivado do próprio lançamento: a data prevista é a
   * primeira parcela e também o dia do vencimento, sem perguntar duas vezes.
   */
  const schedule = useMemo<Schedule | null>(() => {
    if (!form.repeats || !form.dueDate) return null;
    const base = {
      frequency: form.frequency,
      startDate: form.dueDate,
      dueDay: Number(form.dueDate.slice(8, 10)),
    };
    // A duração é sempre por número de vezes: uma série sem fim definido
    // nunca dá para conferir no calendário, e "repetir até certa data" é a
    // mesma informação dita de um jeito que exige contas na cabeça.
    return { ...base, endDate: repeatCount >= 1 ? endDateAfter(base, repeatCount) : null };
  }, [form.repeats, form.dueDate, form.frequency, repeatCount]);

  /**
   * Parcelas que caem em fim de semana ou feriado.
   *
   * Nenhuma delas é movida por conta do sistema: são apenas apontadas, e cada
   * uma espera a decisão do usuário antes de o lançamento ser salvo.
   */
  const { conflicts, truncated } = useMemo(() => {
    if (!schedule) return { conflicts: [], truncated: false };
    return {
      conflicts: findNonBusinessDays(schedule, CONFLICT_HORIZON),
      truncated: theoreticalDates(schedule, CONFLICT_HORIZON + 1).length > CONFLICT_HORIZON,
    };
  }, [schedule]);

  const undecided = useMemo(
    () => conflicts.filter((occurrence) => !form.adjustments[occurrence.date]),
    [conflicts, form.adjustments],
  );

  /** Só as decisões que ainda correspondem a uma parcela da série atual. */
  const cleanAdjustments = (decisions: Decisions): Decisions =>
    Object.fromEntries(
      conflicts
        .filter((occurrence) => decisions[occurrence.date])
        .map((occurrence) => [occurrence.date, decisions[occurrence.date]]),
    );

  const buildRecurrence = (adjustments: Decisions): RecurrenceDraft | null => {
    if (!schedule) return null;
    return {
      name: form.description.trim() || "Lançamento recorrente",
      type: form.type,
      amount: parseAmount(form.amount),
      companyId: form.companyId || "",
      accountId: form.accountId || null,
      categoryId: form.categoryId || null,
      expenseId: form.expenseId || null,
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      endDate: schedule.endDate ?? null,
      dueDay: schedule.dueDay,
      occurrences: repeatCount,
      // A série não tem regra automática: o que não foi decidido fica no dia.
      nonBusinessDayRule: "manter",
      adjustments,
      status: "ativa",
      notes: form.notes.trim() || undefined,
    };
  };

  /** Prévia das próximas datas, já com as decisões tomadas aplicadas. */
  /**
   * Todos os vencimentos da série, já com os ajustes de dia não útil — é o que
   * alimenta o calendário. Diferente da prévia antiga, que mostrava só as três
   * próximas: com duração sempre em número de vezes, a série é finita e cabe
   * inteira na tela.
   */
  const agenda = useMemo<ISODate[]>(() => {
    const draft = buildRecurrence(cleanAdjustments(form.adjustments));
    if (!draft || repeatCount < 1) return [];
    const previewRecurrence: Recurrence = { ...draft, id: "preview", createdAt: today() };
    return nextOccurrences(previewRecurrence, repeatCount, form.dueDate).map((item) => item.effective);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, form.adjustments, form.description, form.amount, form.type, repeatCount, form.dueDate]);

  /* ------------------------------ Envio ------------------------------ */

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.description.trim()) next.description = "Informe uma descrição.";
    if (parseAmount(form.amount) <= 0) next.amount = "Informe um valor maior que zero.";
    if (!form.dueDate) next.dueDate = "Informe a data prevista.";
    if (!form.companyId) next.companyId = "Selecione a empresa.";
    if (form.repeats && (!Number.isInteger(repeatCount) || repeatCount < 2)) {
      next.occurrences = "Informe pelo menos 2 repetições.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = async (decisions: Decisions, escopo: "parcela" | "serie" = "parcela") => {
    if (saving) return;

    const adjustments = cleanAdjustments(decisions);
    const draftRecurrence = buildRecurrence(adjustments);

    const settled = form.status === "pago" || form.status === "recebido";
    const base = {
      type: form.type,
      description: form.description.trim(),
      amount: parseAmount(form.amount),
      companyId: form.companyId,
      accountId: form.accountId || null,
      categoryId: form.categoryId || null,
      expenseId: form.expenseId || null,
      counterparty: form.counterparty.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      // A repetição nasce antes para que as parcelas já apontem para ela.
      const recurrence =
        !transaction && draftRecurrence ? await createRecurrence(draftRecurrence) : undefined;

      if (transaction) {
        const draft: TransactionDraft = {
          ...base,
          dueDate: form.dueDate,
          settledAt: settled ? transaction.settledAt ?? today() : undefined,
          status: form.status,
          recurrenceId: transaction.recurrenceId,
          installment: transaction.installment,
          installmentCount: transaction.installmentCount,
        };
        await updateTransaction(transaction.id, draft);

        // Na série, só os dados compartilhados se propagam: vencimento, status
        // e posição pertencem a cada parcela.
        let alteradas: number | undefined;
        if (escopo === "serie" && transaction.recurrenceId) {
          await updateSeries(transaction.recurrenceId, base);
          alteradas = parcelasPendentes;
        }

        onSaved?.({ ...transaction, ...draft }, "update", undefined, alteradas);
        onOpenChange(false);
        return;
      }

      /**
       * Toda a série é gravada de uma vez, e não projetada sob demanda: para
       * planejar, as parcelas seguintes precisam contar nos totais como
       * qualquer outro pendente. Só a primeira herda o status escolhido — as
       * demais são futuras e nascem pendentes.
       *
       * As doze parcelas vão numa chamada só, e não numa por vez: o banco as
       * insere na mesma transação, então ou a série inteira existe ou nenhuma
       * parcela existe. Gravando uma a uma, uma falha no meio deixaria a série
       * partida — e o usuário sem saber quais parcelas foram criadas.
       */
      if (recurrence) {
        const parcelas = await createTransactions(
          agenda.map((dueDate, indice) => ({
            ...base,
            dueDate,
            status: indice === 0 ? form.status : ("pendente" as const),
            settledAt: indice === 0 && settled ? today() : undefined,
            recurrenceId: recurrence.id,
            installment: indice + 1,
            installmentCount: agenda.length,
          })),
        );
        onSaved?.(parcelas[0], "create", recurrence);
        onOpenChange(false);
        return;
      }

      onSaved?.(
        await createTransaction({
          ...base,
          dueDate: form.dueDate,
          status: form.status,
          settledAt: settled ? today() : undefined,
        }),
        "create",
      );
      onOpenChange(false);
    } catch (cause) {
      // O diálogo continua aberto com tudo preenchido: o que falhou foi a
      // gravação, e o usuário não deve redigitar o lançamento por causa disso.
      setErrors({
        description: cause instanceof Error ? cause.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Abre o alerta para conferência, sem que ele conclua o salvamento. */
  const openReview = () => {
    setReviewBeforeSave(false);
    setReviewOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !validate()) return;
    // O alerta é a última porta antes de salvar: nenhuma parcela em dia não
    // útil passa sem o usuário dizer o que fazer com ela.
    if (undecided.length > 0) {
      setReviewBeforeSave(true);
      setReviewOpen(true);
      return;
    }
    // Parcela de uma série: antes de gravar, é preciso saber se a alteração
    // vale só para ela ou para as demais.
    if (parcelasPendentes > 1) {
      setScopeOpen(true);
      return;
    }
    void persist(form.adjustments);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar movimentação" : "Nova movimentação"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Ajuste os dados do lançamento. As alterações refletem imediatamente nos indicadores."
                : "Registre uma entrada ou saída prevista. Você pode marcá-la como liquidada depois."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo — decide o vocabulário do restante do formulário. */}
            <div className="grid grid-cols-2 gap-2">
              {(["entrada", "saida"] as const).map((type) => {
                const active = form.type === type;
                const Icon = type === "entrada" ? ArrowDownLeft : ArrowUpRight;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeType(type)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ease-smooth",
                      active
                        ? type === "entrada"
                          ? "border-success/35 bg-success-soft text-success"
                          : "border-danger/35 bg-danger-soft text-danger"
                        : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/60",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                    {type === "entrada" ? "Entrada" : "Saída"}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trx-description">Descrição</Label>
              <Input
                id="trx-description"
                value={form.description}
                onChange={(event) => patch("description", event.target.value)}
                placeholder={form.type === "entrada" ? "Recebimento do cliente ABC" : "Pagamento fornecedor"}
                autoFocus
              />
              {errors.description && <p className="text-[12px] text-danger">{errors.description}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trx-amount">Valor</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="trx-amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) => patch("amount", event.target.value)}
                    onBlur={() => form.amount && patch("amount", formatAmount(parseAmount(form.amount)))}
                    placeholder="0,00"
                    className="pl-10 tabular"
                  />
                </div>
                {errors.amount && <p className="text-[12px] text-danger">{errors.amount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="trx-date">Data prevista</Label>
                <DateField id="trx-date" value={form.dueDate} onChange={(value) => patch("dueDate", value)} />
                {errors.dueDate && <p className="text-[12px] text-danger">{errors.dueDate}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={form.companyId}
                  onValueChange={(value) => {
                    patch("companyId", value);
                    // Conta pertence a uma empresa: trocar a empresa limpa a conta.
                    patch("accountId", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companyId && <p className="text-[12px] text-danger">{errors.companyId}</p>}
              </div>

              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={form.accountId} onValueChange={(value) => patch("accountId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* No desktop o saldo já está fixo na lateral (BalancePanel); esta
                tira só existe onde não há espaço para aquela coluna. */}
            <AccountBalanceStrip
              accountId={form.accountId}
              accounts={accounts}
              transactions={transactions}
              range={range}
              amount={parseAmount(form.amount)}
              type={form.type}
              settled={form.status === "pago" || form.status === "recebido"}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plano de contas</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => {
                    patch("categoryId", value);
                    patch("expenseId", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{form.type === "entrada" ? "Receita" : "Despesa"}</Label>
                <Select
                  value={form.expenseId}
                  onValueChange={(value) => patch("expenseId", value)}
                  disabled={!form.categoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.categoryId ? "Selecione" : "Escolha a categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleExpenses.map((expense) => (
                      <SelectItem key={expense.id} value={expense.id}>
                        {expense.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trx-counterparty">{form.type === "entrada" ? "Cliente" : "Fornecedor"}</Label>
                <Input
                  id="trx-counterparty"
                  value={form.counterparty}
                  onChange={(event) => patch("counterparty", event.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => patch("status", value as PersistedStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS[form.type].map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trx-notes">Observação</Label>
              <Textarea
                id="trx-notes"
                value={form.notes}
                onChange={(event) => patch("notes", event.target.value)}
                placeholder="Número da nota, condições de pagamento, combinados com o cliente…"
              />
            </div>

            {/* Repetição — não existe cadastro separado de recorrência: um
                lançamento que se repete é este mesmo, com a bandeira ligada. */}
            {isEditing ? (
              transaction?.recurrenceId && (
                <p className="flex items-start gap-2 rounded-xl bg-info-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-info">
                  <Repeat className="mt-px h-3.5 w-3.5 shrink-0" />
                  {transaction.installment && transaction.installmentCount
                    ? `Parcela ${transaction.installment} de ${transaction.installmentCount}. `
                    : "Este lançamento faz parte de uma série. "}
                  Ao salvar, você escolhe se a alteração vale só para esta parcela ou para as demais em
                  aberto.
                </p>
              )
            ) : (
              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <Label htmlFor="trx-repeats">Movimentação recorrente</Label>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        Repete este lançamento nos próximos períodos.
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="trx-repeats"
                    checked={form.repeats}
                    onCheckedChange={(value) => patch("repeats", value)}
                  />
                </div>

                {form.repeats && (
                  <div className="animate-fade-in space-y-4 border-t border-border/60 pt-3.5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="trx-frequency">Tipo de recorrência</Label>
                        <Select
                          value={form.frequency}
                          onValueChange={(value) => patch("frequency", value as Frequency)}
                        >
                          <SelectTrigger id="trx-frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((frequency) => (
                              <SelectItem key={frequency} value={frequency}>
                                {FREQUENCY_LABELS[frequency]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="trx-occurrences">Repetir por</Label>
                        <div className="flex items-center gap-2.5">
                          <Input
                            id="trx-occurrences"
                            inputMode="numeric"
                            value={form.occurrences}
                            onChange={(event) =>
                              patch("occurrences", event.target.value.replace(/\D/g, "").slice(0, 3))
                            }
                            className="w-20 tabular"
                          />
                          <span className="text-sm text-muted-foreground">
                            {cycleNoun(form.frequency, repeatCount || 2)}
                          </span>
                        </div>
                        {errors.occurrences && <p className="text-[12px] text-danger">{errors.occurrences}</p>}
                      </div>
                    </div>

                    {agenda.length > 0 && (
                      <div className="space-y-2">
                        <p className="flex items-center justify-between gap-3 text-[12.5px]">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CalendarCheck2 className="h-3.5 w-3.5 text-primary" />
                            {agenda.length} {agenda.length === 1 ? "parcela" : "parcelas"}
                          </span>
                          <span className="text-muted-foreground">
                            última em{" "}
                            <span className="tabular font-medium text-foreground">
                              {formatDate(agenda[agenda.length - 1])}
                            </span>
                          </span>
                        </p>
                        <ScheduleCalendar dates={agenda} />
                      </div>
                    )}

                    {/* O alerta de dia não útil. Aparece assim que o calendário
                        da série é conhecido — antes de tentar salvar. */}
                    {conflicts.length > 0 &&
                      (undecided.length > 0 ? (
                        <div className="flex flex-col gap-2.5 rounded-xl border border-warning/35 bg-warning-soft/50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warning" />
                            <span>
                              {undecided.length === 1
                                ? "1 vencimento cai em dia não útil"
                                : `${undecided.length} vencimentos caem em dia não útil`}{" "}
                              (
                              <span className="tabular">
                                {undecided
                                  .slice(0, 3)
                                  .map((item) => formatDate(item.date))
                                  .join(", ")}
                              </span>
                              {undecided.length > 3 && "…"}). Diga o que fazer com{" "}
                              {undecided.length === 1 ? "ele" : "eles"}.
                            </span>
                          </p>
                          <Button type="button" variant="outline" size="sm" onClick={() => openReview()}>
                            Revisar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 rounded-xl bg-muted/50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-success" />
                            {conflicts.length === 1
                              ? "1 vencimento em dia não útil, já resolvido."
                              : `${conflicts.length} vencimentos em dia não útil, já resolvidos.`}
                          </p>
                          <Button type="button" variant="ghost" size="sm" onClick={() => openReview()}>
                            Rever decisões
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="sticky -bottom-6 -mx-6 mt-1 border-t border-border/60 bg-card px-6 pb-1 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Salvar lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SeriesScopeDialog
        open={scopeOpen}
        onOpenChange={setScopeOpen}
        pendentes={parcelasPendentes}
        onSeries={() => {
          setScopeOpen(false);
          void persist(form.adjustments, "serie");
        }}
        onSingle={() => {
          setScopeOpen(false);
          void persist(form.adjustments, "parcela");
        }}
      />

      <NonBusinessDayDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        occurrences={conflicts}
        value={form.adjustments}
        description={form.description.trim() || undefined}
        truncated={truncated}
        confirmLabel={reviewBeforeSave ? "Confirmar e salvar lançamento" : "Confirmar datas"}
        onConfirm={(decisions) => {
          setForm((current) => ({ ...current, adjustments: decisions }));
          setReviewOpen(false);
          // Veio do botão de salvar: decidir as datas termina o que foi pedido.
          if (reviewBeforeSave) void persist(decisions);
          setReviewBeforeSave(false);
        }}
      />
    </>
  );
}

/**
 * O saldo dentro do próprio formulário.
 *
 * Existe só para as telas em que o `BalancePanel` não cabe (`lg:hidden`): o
 * conteúdo mora dentro do modal, então não há diálogo nenhum para brigar com
 * satélite ou z-index — é só mais uma seção do formulário.
 */
function AccountBalanceStrip({
  accountId,
  accounts,
  transactions,
  range,
  amount,
  type,
  settled,
}: {
  accountId: ID | "";
  accounts: Account[];
  transactions: Transaction[];
  range: DateRange;
  amount: number;
  type: TransactionType;
  settled: boolean;
}) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) return null;

  const current = accountBalance(account, transactions);
  const delta = type === "entrada" ? amount : -amount;
  const nextCurrent = settled ? current + delta : current;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] text-muted-foreground">
          Saldo atual · {account.name}
        </span>
        <MoneyValue value={current} size="sm" tone={current < 0 ? "negative" : "neutral"} className="shrink-0" />
      </div>
      {amount > 0 && (
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border/50 pt-1.5">
          <span className="text-[12px] font-medium">
            {settled ? "Saldo ficaria em" : "Não muda o saldo hoje"}
          </span>
          {settled ? (
            <MoneyValue value={nextCurrent} size="sm" tone={nextCurrent < 0 ? "negative" : "neutral"} />
          ) : (
            <span className="text-[11.5px] text-muted-foreground">
              previsto {formatDate(range.to)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
