import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Building2, Mail, ShieldCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyValue } from "@/components/common/money-value";
import { StatusBadge } from "@/components/common/status-badge";
import { useFinance } from "@/store/finance-context";
import { useWorkspace } from "@/store/workspace-context";
import { useLookups } from "@/hooks/use-lookups";
import { formatDate } from "@/lib/date";
import { isSettled, resolveStatus } from "@/lib/finance";
import { initialsFrom, sortBy } from "@/lib/utils";
import { useAuth } from "@/store/auth-context";

/** Papel na organização, em português. */
const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Acesso total",
  viewer: "Somente leitura",
};

export function ProfilePage() {
  const { companies, accounts, transactions } = useFinance();
  const { reference } = useWorkspace();
  const lookups = useLookups();
  const { profile, activeMembership, updateProfile } = useAuth();

  /*
   * O formulário é controlado e semeado pelo perfil carregado. Com
   * `defaultValue`, os campos ficariam vazios no primeiro render — o perfil
   * chega depois da sessão — e nunca mais se atualizariam.
   */
  const [form, setForm] = useState({ name: "", role: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ name: profile.name, role: profile.role });
  }, [profile]);

  const sujo = Boolean(profile) && (form.name !== profile?.name || form.role !== profile?.role);

  const salvar = async () => {
    if (saving || !sujo) return;
    if (!form.name.trim()) {
      toast.error("Informe o seu nome.");
      return;
    }

    setSaving(true);
    try {
      /* As iniciais acompanham o nome: são derivadas dele em toda a interface,
         e deixá-las fixas faria o avatar contradizer o nome ao lado. */
      await updateProfile({
        name: form.name.trim(),
        role: form.role.trim(),
        initials: initialsFrom(form.name.trim()),
      });
      toast.success("Perfil atualizado.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  /** Últimas liquidações — o registro do que a gerente marcou como pago ou recebido. */
  const recent = useMemo(
    () =>
      sortBy(
        transactions.filter(isSettled),
        (item) => item.settledAt ?? item.dueDate,
        "desc",
      ).slice(0, 6),
    [transactions],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" description="Seus dados de acesso e a atividade recente na operação." />

      {/* `items-start`: o card da esquerda é filho direto do grid, então sem
          isso ele estica até a altura da coluna da direita — que é bem mais
          alta — e sobra um vazio enorme abaixo do botão de salvar. */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          {/* O bloco de identidade vai no `CardHeader`, e não dentro do
              `CardContent`: o content nasce com `pt-0` — ele pressupõe um
              header acima — e sem esse header o conteúdo encosta no topo. */}
          <CardHeader className="flex-row items-center gap-4 space-y-0">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary-deep">
              {profile?.initials ?? "–"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-tight">{profile?.name || "Sem nome"}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {profile?.role || activeMembership?.org.name || ""}
              </p>
              {/* O papel vem da associação: quem é `viewer` não tem acesso
                  total, e afirmar que tem seria mentir sobre o que o RLS
                  deixa fazer. */}
              <Badge variant={activeMembership?.role === "viewer" ? "muted" : "success"} className="mt-2">
                <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABELS[activeMembership?.role ?? "member"]}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome</Label>
                <Input
                  id="profile-name"
                  value={form.name}
                  onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="profile-email"
                    value={profile?.email ?? ""}
                    className="pl-10"
                    disabled
                    title="O e-mail é a credencial de acesso e muda pelo fluxo de autenticação."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-role">Função</Label>
                <Input
                  id="profile-role"
                  value={form.role}
                  onChange={(event) => setForm((c) => ({ ...c, role: event.target.value }))}
                  placeholder="Gerência financeira"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                disabled={!sujo || saving}
                onClick={() => setForm({ name: profile?.name ?? "", role: profile?.role ?? "" })}
              >
                Cancelar
              </Button>
              <Button disabled={!sujo || saving} onClick={() => void salvar()}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acesso</CardTitle>
              <CardDescription>Empresas e contas sob sua responsabilidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Empresas
                  </p>
                  <p className="tabular mt-0.5 text-xl font-semibold">{companies.length}</p>
                </div>
                <div className="rounded-xl bg-muted/50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" /> Contas
                  </p>
                  <p className="tabular mt-0.5 text-xl font-semibold">{accounts.length}</p>
                </div>
              </div>

              <ul className="space-y-1.5">
                {companies.map((company) => (
                  <li
                    key={company.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium">{company.name}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">{company.legalName}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {accounts.filter((account) => account.companyId === company.id).length} contas
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1">
                <CardTitle>Atividade recente</CardTitle>
                <CardDescription>Últimos lançamentos liquidados.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="-mr-2 shrink-0">
                <Link to="/movimentacoes">
                  Ver tudo <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {recent.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  Nenhum lançamento liquidado ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {recent.map((transaction) => (
                    <li key={transaction.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{transaction.description}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">
                          {lookups.companyName(transaction.companyId)} ·{" "}
                          {formatDate(transaction.settledAt ?? transaction.dueDate)}
                        </span>
                      </span>
                      <StatusBadge
                        status={resolveStatus(transaction, reference)}
                        appearance="dot"
                        className="hidden sm:inline-flex"
                      />
                      <MoneyValue
                        value={transaction.amount}
                        type={transaction.type}
                        tone="auto"
                        showSign
                        size="sm"
                        className="shrink-0"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
