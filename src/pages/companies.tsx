import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
import type { Company } from "@/types";
import { PageHeader } from "@/components/common/page-header";
import { FilterBar } from "@/components/common/filter-bar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyCard } from "@/components/finance/company-card";
import { useFinance } from "@/store/finance-context";
import { accountBalance } from "@/lib/finance";
import { formatTaxId } from "@/lib/format";
import { initialsFrom, normalize, sum } from "@/lib/utils";

interface FormState {
  name: string;
  legalName: string;
  taxId: string;
  active: boolean;
}

const EMPTY: FormState = { name: "", legalName: "", taxId: "", active: true };

/** Cores atribuídas em rodízio às novas empresas, para diferenciá-las nos avatares. */
const PALETTE = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#0e7490"];

export function CompaniesPage() {
  const { companies, accounts, transactions, createCompany, updateCompany, deleteCompany } = useFinance();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? { name: editing.name, legalName: editing.legalName, taxId: editing.taxId, active: editing.active }
        : EMPTY,
    );
  }, [open, editing]);

  const visible = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return companies;
    return companies.filter(
      (company) =>
        normalize(company.name).includes(term) ||
        normalize(company.legalName).includes(term) ||
        company.taxId.includes(term),
    );
  }, [companies, search]);

  const statsFor = (company: Company) => {
    const own = accounts.filter((account) => account.companyId === company.id);
    return {
      balance: sum(own.map((account) => accountBalance(account, transactions))),
      accountCount: own.length,
      transactionCount: transactions.filter((item) => item.companyId === company.id).length,
    };
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Informe o nome fantasia.";
    if (!form.legalName.trim()) next.legalName = "Informe a razão social.";
    if (form.taxId.replace(/\D/g, "").length !== 14) next.taxId = "Informe um CNPJ com 14 dígitos.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      name: form.name.trim(),
      legalName: form.legalName.trim(),
      taxId: form.taxId,
      initials: initialsFrom(form.name),
      active: form.active,
    };

    if (editing) {
      updateCompany(editing.id, payload);
      toast.success("Empresa atualizada.", { description: payload.name });
    } else {
      createCompany({ ...payload, color: PALETTE[companies.length % PALETTE.length] });
      toast.success("Empresa cadastrada com sucesso.", { description: payload.name });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Empresas e filiais que compõem a operação. Cada uma pode ter várias contas bancárias."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Nova empresa
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, razão social ou CNPJ…"
        activeCount={search ? 1 : 0}
        onClear={() => setSearch("")}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma empresa encontrada"
          description={
            search ? "Nenhuma empresa corresponde à busca." : "Cadastre a primeira empresa para começar a operar."
          }
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> Nova empresa
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((company) => {
            const stats = statsFor(company);
            return (
              <CompanyCard
                key={company.id}
                company={company}
                balance={stats.balance}
                accountCount={stats.accountCount}
                transactionCount={stats.transactionCount}
                onEdit={() => {
                  setEditing(company);
                  setOpen(true);
                }}
                onDelete={() => setPendingDelete(company)}
              />
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>
              O nome fantasia é o que aparece nos seletores e relatórios do sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cmp-name">Nome fantasia</Label>
              <Input
                id="cmp-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Fábrica"
                autoFocus
              />
              {errors.name && <p className="text-[12px] text-danger">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cmp-legal">Razão social</Label>
              <Input
                id="cmp-legal"
                value={form.legalName}
                onChange={(event) => setForm({ ...form, legalName: event.target.value })}
                placeholder="Fábrica ABC LTDA"
              />
              {errors.legalName && <p className="text-[12px] text-danger">{errors.legalName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cmp-taxid">CNPJ</Label>
              <Input
                id="cmp-taxid"
                value={form.taxId}
                onChange={(event) => setForm({ ...form, taxId: formatTaxId(event.target.value) })}
                placeholder="00.000.000/0001-00"
                inputMode="numeric"
                className="tabular"
              />
              {errors.taxId && <p className="text-[12px] text-danger">{errors.taxId}</p>}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <Label htmlFor="cmp-active">Empresa ativa</Label>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Empresas inativas permanecem no histórico financeiro.
                </p>
              </div>
              <Switch
                id="cmp-active"
                checked={form.active}
                onCheckedChange={(value) => setForm({ ...form, active: value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editing ? "Salvar alterações" : "Salvar empresa"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(value) => !value && setPendingDelete(null)}
        title="Excluir empresa?"
        description={
          pendingDelete ? (
            <>
              A empresa <strong className="font-medium text-foreground">{pendingDelete.name}</strong> será removida. As
              contas e movimentações vinculadas permanecem no sistema, mas ficarão sem empresa.
            </>
          ) : null
        }
        confirmLabel="Excluir empresa"
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteCompany(pendingDelete.id);
          toast.success("Empresa excluída.");
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
