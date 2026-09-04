import { useEffect, useState } from "react";
import type { Account, AccountType, ID } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance, type AccountDraft } from "@/store/finance-context";
import { ALL_COMPANIES, useWorkspace } from "@/store/workspace-context";
import { formatAmount, parseAmount } from "@/lib/format";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "caixa", label: "Caixa" },
];

export interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
  onSaved?: (account: Account, mode: "create" | "update") => void;
}

interface FormState {
  name: string;
  bankId: ID | "";
  branch: string;
  number: string;
  type: AccountType;
  companyId: ID | "";
  openingBalance: string;
  active: boolean;
}

const EMPTY: FormState = {
  name: "",
  bankId: "",
  branch: "",
  number: "",
  type: "corrente",
  companyId: "",
  openingBalance: "",
  active: true,
};

export function AccountFormDialog({ open, onOpenChange, account, onSaved }: AccountFormDialogProps) {
  const { companies, banks, createAccount, updateAccount } = useFinance();
  const { companyScope } = useWorkspace();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    if (account) {
      setForm({
        name: account.name,
        bankId: account.bankId,
        branch: account.branch,
        number: account.number,
        type: account.type,
        companyId: account.companyId,
        openingBalance: formatAmount(account.openingBalance),
        active: account.active,
      });
      return;
    }
    setForm({
      ...EMPTY,
      bankId: banks[0]?.id ?? "",
      companyId: companyScope !== ALL_COMPANIES ? companyScope : companies[0]?.id ?? "",
    });
  }, [open, account, companyScope, companies, banks]);

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Informe o nome da conta.";
    if (!form.number.trim()) next.number = "Informe o número da conta.";
    if (!form.bankId) next.bankId = "Selecione o banco.";
    if (!form.companyId) next.companyId = "Selecione a empresa.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const draft: AccountDraft = {
      name: form.name.trim(),
      bankId: form.bankId,
      branch: form.branch.trim(),
      number: form.number.trim(),
      type: form.type,
      companyId: form.companyId,
      openingBalance: parseAmount(form.openingBalance),
      active: form.active,
    };

    /* Fecha só com a confirmação do servidor — uma conta rejeitada por
       violar a chave do banco ou da empresa não pode sumir da tela como se
       tivesse sido salva. */
    setSaving(true);
    try {
      if (account) {
        await updateAccount(account.id, draft);
        onSaved?.({ ...account, ...draft }, "update");
      } else {
        onSaved?.(await createAccount(draft), "create");
      }
      onOpenChange(false);
    } catch (cause) {
      setErrors({
        name: cause instanceof Error ? cause.message : "Não foi possível salvar a conta.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? "Editar conta" : "Nova conta bancária"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Atualize os dados da conta. O saldo atual continua sendo calculado pelas movimentações."
              : "O saldo de abertura é o ponto de partida; as movimentações liquidadas ajustam o saldo atual."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="acc-name">Nome da conta</Label>
            <Input
              id="acc-name"
              value={form.name}
              onChange={(event) => patch("name", event.target.value)}
              placeholder="Conta principal Itaú"
              autoFocus
            />
            {errors.name && <p className="text-[12px] text-danger">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Select value={form.bankId} onValueChange={(value) => patch("bankId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {banks.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  Nenhum banco cadastrado — cadastre um na aba “Bancos”.
                </p>
              ) : (
                errors.bankId && <p className="text-[12px] text-danger">{errors.bankId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(value) => patch("type", value as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acc-branch">Agência</Label>
              <Input
                id="acc-branch"
                value={form.branch}
                onChange={(event) => patch("branch", event.target.value)}
                placeholder="1234"
                className="tabular"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-number">Número da conta</Label>
              <Input
                id="acc-number"
                value={form.number}
                onChange={(event) => patch("number", event.target.value)}
                placeholder="0056312345"
                className="tabular"
              />
              {errors.number && <p className="text-[12px] text-danger">{errors.number}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={form.companyId} onValueChange={(value) => patch("companyId", value)}>
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
              <Label htmlFor="acc-balance">Saldo de abertura</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="acc-balance"
                  inputMode="decimal"
                  value={form.openingBalance}
                  onChange={(event) => patch("openingBalance", event.target.value)}
                  onBlur={() =>
                    form.openingBalance && patch("openingBalance", formatAmount(parseAmount(form.openingBalance)))
                  }
                  placeholder="0,00"
                  className="pl-10 tabular"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <Label htmlFor="acc-active">Conta ativa</Label>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Contas inativas continuam no histórico, mas saem dos seletores.
              </p>
            </div>
            <Switch id="acc-active" checked={form.active} onCheckedChange={(value) => patch("active", value)} />
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
              {saving ? "Salvando…" : account ? "Salvar alterações" : "Salvar conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
