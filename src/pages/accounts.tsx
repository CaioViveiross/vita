import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Landmark, Plus, Wallet } from "lucide-react";
import type { Account, Bank } from "@/types";
import { PageHeader } from "@/components/common/page-header";
import { FilterBar } from "@/components/common/filter-bar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { MoneyValue } from "@/components/common/money-value";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountCard } from "@/components/finance/account-card";
import { AccountFormDialog } from "@/components/finance/account-form-dialog";
import { BankFormDialog } from "@/components/finance/bank-form-dialog";
import { BankList } from "@/components/finance/bank-list";
import { useFinance } from "@/store/finance-context";
import { useWorkspace } from "@/store/workspace-context";
import { useScopedData } from "@/hooks/use-scoped-transactions";
import { useLookups } from "@/hooks/use-lookups";
import { buildAccountBalances } from "@/lib/finance";
import { normalize, sum } from "@/lib/utils";

type ViewMode = "contas" | "bancos";

export function AccountsPage() {
  const { companies, banks, transactions, deleteAccount, deleteBank } = useFinance();
  const { range } = useWorkspace();
  const { accounts } = useScopedData();
  const { bankById } = useLookups();

  const [view, setView] = useState<ViewMode>("contas");
  const [search, setSearch] = useState("");
  const [bankId, setBankId] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [pendingBankDelete, setPendingBankDelete] = useState<Bank | null>(null);

  /** Bancos que realmente têm conta — alimentam o filtro da aba de contas. */
  const banksInUse = useMemo(() => {
    const ids = new Set(accounts.map((account) => account.bankId));
    return banks.filter((bank) => ids.has(bank.id));
  }, [accounts, banks]);

  const balances = useMemo(() => {
    const term = normalize(search.trim());
    const visible = accounts.filter((account) => {
      if (bankId !== "all" && account.bankId !== bankId) return false;
      if (!term) return true;
      return (
        normalize(account.name).includes(term) ||
        normalize(bankById.get(account.bankId)?.name ?? "").includes(term) ||
        account.number.includes(term)
      );
    });
    return buildAccountBalances(visible, companies, transactions, range);
  }, [accounts, companies, transactions, range, search, bankId, bankById]);

  const consolidated = sum(balances.map((item) => item.current));
  const projected = sum(balances.map((item) => item.projected));
  const activeFilters = (bankId !== "all" ? 1 : 0) + (search ? 1 : 0);

  const showingBanks = view === "bancos";

  const openNewBank = () => {
    setEditingBank(null);
    setBankFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas"
        description="Contas bancárias das suas empresas e o saldo consolidado."
        actions={
          showingBanks ? (
            <Button onClick={openNewBank}>
              <Plus /> Novo banco
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Nova conta
            </Button>
          )
        }
      />

      {/* O banco é o passo anterior à conta, então mora aqui do lado — e não
          num item próprio do menu, que ficaria pesado para um cadastro que se
          faz uma vez e quase não se revisita. */}
      <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="contas">
            <Wallet className="h-3.5 w-3.5" /> Contas
          </TabsTrigger>
          <TabsTrigger value="bancos">
            <Landmark className="h-3.5 w-3.5" /> Bancos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {showingBanks ? (
        <>
          <BankList
            banks={banks}
            accounts={accounts}
            onCreate={openNewBank}
            onEdit={(bank) => {
              setEditingBank(bank);
              setBankFormOpen(true);
            }}
            onDelete={setPendingBankDelete}
          />

          <BankFormDialog
            open={bankFormOpen}
            onOpenChange={setBankFormOpen}
            bank={editingBank}
            onSaved={(bank, mode) =>
              toast.success(mode === "create" ? "Banco cadastrado com sucesso." : "Banco atualizado.", {
                description: bank.name,
              })
            }
          />

          <ConfirmDialog
            open={Boolean(pendingBankDelete)}
            onOpenChange={(open) => !open && setPendingBankDelete(null)}
            title="Excluir banco?"
            description={
              pendingBankDelete ? (
                <>
                  O banco <strong className="font-medium text-foreground">{pendingBankDelete.name}</strong> será
                  removido do cadastro.
                </>
              ) : null
            }
            confirmLabel="Excluir banco"
            onConfirm={() => {
              if (!pendingBankDelete) return;
              deleteBank(pendingBankDelete.id);
              toast.success("Banco excluído.");
              setPendingBankDelete(null);
            }}
          />
        </>
      ) : (
        <>
      {/* Empilha até `xl`: com a sidebar e o painel de saldo abertos, o
          conteúdo perde muito espaço já em `lg`, e a linha lado a lado
          transbordava o cartão (o valor projetado ficava atrás do painel). */}
      <Card className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between xl:px-6">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium uppercase tracking-wide text-muted-foreground">Saldo consolidado</p>
          <MoneyValue value={consolidated} size="xl" className="mt-1.5 block" />
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {balances.length} {balances.length === 1 ? "conta" : "contas"} no recorte atual
          </p>
        </div>

        <div className="min-w-0 rounded-xl bg-muted/50 px-4 py-3 xl:text-right">
          <p className="text-[12.5px] text-muted-foreground">Projeção do período</p>
          <MoneyValue
            value={projected}
            size="md"
            tone={projected < consolidated ? "negative" : "positive"}
            className="mt-0.5 block"
          />
          <p className="mt-0.5 text-[12px] text-muted-foreground">Considerando os lançamentos pendentes</p>
        </div>
      </Card>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, banco ou número…"
        activeCount={activeFilters}
        onClear={() => {
          setSearch("");
          setBankId("all");
        }}
      >
        <Select value={bankId} onValueChange={setBankId}>
          <SelectTrigger className="h-10 sm:w-[13rem]">
            <SelectValue placeholder="Banco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os bancos</SelectItem>
            {banksInUse.map((bank) => (
              <SelectItem key={bank.id} value={bank.id}>
                {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {balances.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta encontrada"
          description={
            activeFilters > 0
              ? "Ajuste a busca ou o filtro de banco para ver outras contas."
              : "Cadastre a primeira conta bancária para acompanhar os saldos."
          }
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Nova conta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {balances.map((balance) => (
            <AccountCard
              key={balance.account.id}
              balance={balance}
              detailed
              onEdit={() => {
                setEditing(balance.account);
                setFormOpen(true);
              }}
              onDelete={() => setPendingDelete(balance.account)}
            />
          ))}
        </div>
      )}

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        onSaved={(account, mode) =>
          toast.success(mode === "create" ? "Conta cadastrada com sucesso." : "Conta atualizada.", {
            description: account.name,
          })
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir conta?"
        description={
          pendingDelete ? (
            <>
              A conta <strong className="font-medium text-foreground">{pendingDelete.name}</strong> será removida. As
              movimentações vinculadas são preservadas, mas ficarão sem conta.
            </>
          ) : null
        }
        confirmLabel="Excluir conta"
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteAccount(pendingDelete.id);
          toast.success("Conta excluída.");
          setPendingDelete(null);
        }}
      />
        </>
      )}
    </div>
  );
}
