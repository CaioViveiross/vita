import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftToLine, ArrowRightToLine, CalendarX2, Info, Pin } from "lucide-react";
import type { ISODate, NonBusinessDayRule } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatLongDate } from "@/lib/date";
import { CONFLICT_HORIZON, type NonBusinessOccurrence } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

/**
 * O aviso de dia não útil.
 *
 * A regra não é escolhida de antemão para a série inteira: quando alguma
 * parcela cai em fim de semana ou feriado, o sistema **avisa qual é** e
 * pergunta o que fazer com aquele pagamento — antecipar, adiar ou deixar como
 * está. Cada resposta vale só para a sua parcela.
 */

export type Decisions = Record<ISODate, NonBusinessDayRule>;

export interface NonBusinessDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parcelas que caem em dia não útil, na ordem da série. */
  occurrences: NonBusinessOccurrence[];
  /** Decisões já tomadas — o diálogo abre com elas marcadas. */
  value?: Decisions;
  /** Nome do lançamento, para a pergunta não ficar abstrata. */
  description?: string;
  /** `true` quando a série é longa e só o trecho inicial foi verificado. */
  truncated?: boolean;
  onConfirm: (decisions: Decisions) => void;
  /** Rótulo do botão principal — muda entre criar e revisar. */
  confirmLabel?: string;
}

const CHOICES: {
  rule: NonBusinessDayRule;
  label: string;
  hint: string;
  icon: typeof Pin;
  dateOf: (occurrence: NonBusinessOccurrence) => ISODate;
}[] = [
  {
    rule: "antecipar",
    label: "Antecipar",
    hint: "dia útil anterior",
    icon: ArrowLeftToLine,
    dateOf: (occurrence) => occurrence.antecipar,
  },
  {
    rule: "postergar",
    label: "Adiar",
    hint: "próximo dia útil",
    icon: ArrowRightToLine,
    dateOf: (occurrence) => occurrence.postergar,
  },
  {
    rule: "manter",
    label: "Manter",
    hint: "fica no dia",
    icon: Pin,
    dateOf: (occurrence) => occurrence.date,
  },
];

export function NonBusinessDayDialog({
  open,
  onOpenChange,
  occurrences,
  value,
  description,
  truncated = false,
  onConfirm,
  confirmLabel = "Confirmar e salvar",
}: NonBusinessDayDialogProps) {
  const [decisions, setDecisions] = useState<Decisions>({});

  // Reabrir sempre parte das decisões já registradas: nada vem pré-escolhido
  // por conta do sistema.
  useEffect(() => {
    if (open) setDecisions(value ?? {});
  }, [open, value]);

  const pending = useMemo(
    () => occurrences.filter((occurrence) => !decisions[occurrence.date]),
    [occurrences, decisions],
  );

  const decide = (date: ISODate, rule: NonBusinessDayRule) =>
    setDecisions((current) => ({ ...current, [date]: rule }));

  const decideAll = (rule: NonBusinessDayRule) =>
    setDecisions(Object.fromEntries(occurrences.map((occurrence) => [occurrence.date, rule])));

  const single = occurrences.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <DialogTitle>
                {single ? "Um vencimento cai em dia não útil" : `${occurrences.length} vencimentos caem em dia não útil`}
              </DialogTitle>
              <DialogDescription>
                {description ? (
                  <>
                    <span className="font-medium text-foreground">{description}</span> —{" "}
                  </>
                ) : null}
                escolha o que fazer com {single ? "esse pagamento" : "cada um desses pagamentos"}. Nada é movido
                sem a sua decisão.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {occurrences.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5">
            <span className="text-[12.5px] text-muted-foreground">Aplicar a todos:</span>
            {CHOICES.map((choice) => (
              <Button
                key={choice.rule}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => decideAll(choice.rule)}
              >
                <choice.icon /> {choice.label}
              </Button>
            ))}
          </div>
        )}

        <ul className="-mx-1 max-h-[22rem] space-y-2.5 overflow-y-auto px-1">
          {occurrences.map((occurrence) => {
            const chosen = decisions[occurrence.date];
            return (
              <li
                key={occurrence.date}
                className={cn(
                  "rounded-xl border p-3.5 transition-colors duration-200 ease-smooth",
                  chosen ? "border-border/70 bg-card" : "border-warning/35 bg-warning-soft/40",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-[13.5px] font-medium">
                    <span className="tabular">{formatDate(occurrence.date)}</span>
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {formatLongDate(occurrence.date)}
                    </span>
                  </p>
                  <Badge variant={chosen ? "muted" : "warning"}>
                    <CalendarX2 className="h-3 w-3" />
                    {occurrence.reason}
                  </Badge>
                </div>

                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {occurrence.index}ª parcela da série
                </p>

                <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                  {CHOICES.map((choice) => {
                    const active = chosen === choice.rule;
                    const target = choice.dateOf(occurrence);
                    return (
                      <button
                        key={choice.rule}
                        type="button"
                        aria-pressed={active}
                        onClick={() => decide(occurrence.date, choice.rule)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-all duration-200 ease-smooth",
                          active
                            ? "border-primary/45 bg-primary-soft"
                            : "border-border bg-card hover:bg-muted/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center gap-1.5 text-[12.5px] font-medium",
                            active ? "text-primary-deep" : "text-foreground",
                          )}
                        >
                          <choice.icon className="h-3.5 w-3.5" />
                          {choice.label}
                        </span>
                        <span className="mt-0.5 block tabular text-[12px] text-muted-foreground">
                          {formatDate(target)}
                        </span>
                        <span className="block text-[11px] text-muted-foreground/80">{choice.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        {truncated && (
          <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            A repetição é longa: conferimos as {CONFLICT_HORIZON} primeiras parcelas. As seguintes permanecem na
            data original e são sinalizadas nas movimentações quando se aproximarem.
          </p>
        )}

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-[12px] text-muted-foreground">
            {pending.length === 0
              ? "Todas as parcelas foram decididas."
              : `${pending.length} ${pending.length === 1 ? "parcela aguarda" : "parcelas aguardam"} sua decisão.`}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="button" disabled={pending.length > 0} onClick={() => onConfirm(decisions)}>
              {confirmLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
