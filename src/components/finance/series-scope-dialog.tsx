import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SeriesScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quantas parcelas da série ainda estão em aberto. */
  pendentes: number;
  /** "Sim": aplica às parcelas em aberto da série. */
  onSeries: () => void;
  /** "Não": aplica só à parcela que está sendo editada. */
  onSingle: () => void;
}

/**
 * A pergunta de escopo ao salvar a edição de uma parcela.
 *
 * Não é um `ConfirmDialog`: ali o "Cancelar" apenas fecha, e aqui as duas
 * respostas são ações — "Não" também salva, só que uma parcela apenas.
 */
export function SeriesScopeDialog({ open, onOpenChange, pendentes, onSeries, onSingle }: SeriesScopeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deseja editar toda a série de pagamentos?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                As alterações podem valer só para esta parcela ou para as{" "}
                <strong className="font-medium text-foreground">
                  {pendentes} {pendentes === 1 ? "parcela em aberto" : "parcelas em aberto"}
                </strong>{" "}
                da série.
              </p>
              <p className="text-[12.5px]">
                O vencimento de cada parcela é sempre individual e não se propaga. Parcelas já pagas ou
                recebidas também ficam de fora: o valor liquidado é um fato, e reescrevê-lo mudaria o saldo
                da conta.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSingle}>Não, só esta parcela</AlertDialogCancel>
          <AlertDialogAction className={cn(buttonVariants())} onClick={onSeries}>
            Sim, toda a série
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
