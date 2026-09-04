import { useEffect, useState } from "react";
import type { Bank } from "@/types";
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
import { BankMark, BANK_MARK_COLORS } from "@/components/finance/bank-mark";
import { useFinance, type BankDraft } from "@/store/finance-context";
import { cn } from "@/lib/utils";

export interface BankFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bank?: Bank | null;
  onSaved?: (bank: Bank, mode: "create" | "update") => void;
}

interface FormState {
  name: string;
  code: string;
  color: string;
}

const EMPTY: FormState = { name: "", code: "", color: BANK_MARK_COLORS[0] };

export function BankFormDialog({ open, onOpenChange, bank, onSaved }: BankFormDialogProps) {
  const { createBank, updateBank } = useFinance();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setForm(bank ? { name: bank.name, code: bank.code, color: bank.color } : EMPTY);
  }, [open, bank]);

  /*
   * O diálogo só fecha depois que o servidor confirma. Fechar antes daria a
   * impressão de sucesso mesmo quando a gravação falha, e o usuário perderia o
   * que digitou sem ter para onde voltar.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      setError("Informe o nome do banco.");
      return;
    }

    const draft: BankDraft = {
      name: form.name.trim(),
      code: form.code.trim(),
      color: form.color,
    };

    setSaving(true);
    setError(null);

    try {
      if (bank) {
        await updateBank(bank.id, draft);
        onSaved?.({ ...bank, ...draft }, "update");
      } else {
        onSaved?.(await createBank(draft), "create");
      }
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o banco.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bank ? "Editar banco" : "Novo banco"}</DialogTitle>
          <DialogDescription>
            O banco é o passo anterior à conta: cadastre a instituição aqui e depois abra quantas contas
            precisar nela. A cor escolhida identifica todas as contas desse banco.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Nome</Label>
              <Input
                id="bank-name"
                value={form.name}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value });
                  setError(null);
                }}
                placeholder="Itaú Unibanco"
                autoFocus
              />
              {error && <p className="text-[12px] text-danger">{error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-code">Código</Label>
              <Input
                id="bank-code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="341"
                className="tabular"
              />
              <p className="text-[11.5px] text-muted-foreground">Opcional</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor de identificação</Label>
            <div className="flex flex-wrap items-center gap-2">
              <BankMark name={form.name || "Banco"} color={form.color} />
              {BANK_MARK_COLORS.map((swatch) => {
                const active = form.color === swatch;
                return (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setForm({ ...form, color: swatch })}
                    aria-label={`Cor ${swatch}`}
                    aria-pressed={active}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200 ease-smooth",
                      active ? "border-foreground/70" : "border-transparent hover:border-border",
                    )}
                  >
                    <span className="h-full w-full rounded-full" style={{ backgroundColor: swatch }} />
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : bank ? "Salvar alterações" : "Salvar banco"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
