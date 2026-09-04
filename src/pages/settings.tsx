import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  KeyRound,
  LogOut,
  Mail,
  Palette,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanySelector, PeriodSelector } from "@/components/common/selectors";
import { useWorkspace } from "@/store/workspace-context";
import { useTheme, type ThemePreference } from "@/store/theme-context";
import { useAuth } from "@/store/auth-context";
import type { MembershipRole } from "@/types/database";
import * as org from "@/services/organization";
import { formatDate } from "@/lib/date";

/* -------------------------------------------------------------------------- */
/* Vocabulário                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Os papéis em português, com a explicação do que cada um pode.
 *
 * O texto não é decoração: quem escolhe o papel de outra pessoa precisa saber
 * o que está concedendo, e "admin" sozinho não diz. Estas descrições espelham
 * exatamente as três funções que o RLS usa — `is_org_member`, `has_org_write`
 * e `is_org_admin`.
 */
const ROLES: { value: MembershipRole; label: string; hint: string }[] = [
  { value: "owner", label: "Proprietário", hint: "Controle total, incluindo excluir a organização." },
  { value: "admin", label: "Administrador", hint: "Lança e gerencia quem tem acesso." },
  { value: "member", label: "Membro", hint: "Lança e edita movimentações." },
  { value: "viewer", label: "Somente leitura", hint: "Acompanha os números, sem lançar." },
];

const ROLE_LABEL: Record<MembershipRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Somente leitura",
};

const ROLE_TONE: Record<MembershipRole, "default" | "info" | "muted" | "outline"> = {
  owner: "default",
  admin: "info",
  member: "muted",
  viewer: "outline",
};

/* -------------------------------------------------------------------------- */
/* Blocos                                                                      */
/* -------------------------------------------------------------------------- */

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 py-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 pr-4">
        <Label className="text-[13.5px]">{label}</Label>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 sm:w-[15rem]">{children}</div>
    </div>
  );
}

/** Campo somente leitura: existe para ser consultado e copiado, não editado. */
function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px]">{label}</Label>
      <p className="tabular truncate rounded-lg bg-muted/50 px-3 py-2 text-[13px]">{value}</p>
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Página                                                                      */
/* -------------------------------------------------------------------------- */

export function SettingsPage() {
  const { companyScope, setCompanyScope, period, setPeriod } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const { profile, session, activeMembership, activeOrgId, signOut, refresh } = useAuth();

  const papel = activeMembership?.role ?? "viewer";
  const podeAdministrar = papel === "owner" || papel === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Preferências, organização, acessos e sua conta."
      />

      <Tabs defaultValue="preferencias" className="space-y-6">
        {/* Rolagem horizontal no celular: quatro abas não cabem em 360px, e
            espremê-las cortaria os rótulos. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="preferencias">
              <Palette className="h-3.5 w-3.5" /> Preferências
            </TabsTrigger>
            <TabsTrigger value="organizacao">
              <Building2 className="h-3.5 w-3.5" /> Organização
            </TabsTrigger>
            <TabsTrigger value="membros">
              <Users className="h-3.5 w-3.5" /> Membros
            </TabsTrigger>
            <TabsTrigger value="conta">
              <UserRound className="h-3.5 w-3.5" /> Conta
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------- Preferências ------------------------- */}

        <TabsContent value="preferencias">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Preferências de visualização</CardTitle>
              <CardDescription>
                Valem para este navegador e são aplicadas toda vez que você abre o sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <SettingRow label="Tema" description="Aparência clara ou escura da interface.">
                <Select value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Empresa padrão"
                description="Recorte aplicado ao dashboard e às listagens ao abrir o sistema."
              >
                <CompanySelector value={companyScope} onChange={setCompanyScope} />
              </SettingRow>

              <SettingRow
                label="Período padrão"
                description="Janela usada nos indicadores e nas listagens."
              >
                <PeriodSelector value={period} onChange={setPeriod} />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------- Organização -------------------------- */}

        <TabsContent value="organizacao">
          <OrganizationTab
            podeAdministrar={podeAdministrar}
            ehProprietario={papel === "owner"}
            onChanged={refresh}
          />
        </TabsContent>

        {/* --------------------------- Membros ---------------------------- */}

        <TabsContent value="membros">
          <MembersTab
            orgId={activeOrgId}
            meuUserId={session?.user?.id ?? null}
            podeAdministrar={podeAdministrar}
            onLeft={refresh}
          />
        </TabsContent>

        {/* ---------------------------- Conta ----------------------------- */}

        <TabsContent value="conta">
          <AccountTab
            nome={profile?.name ?? ""}
            email={profile?.email ?? session?.user?.email ?? ""}
            papel={papel}
            onSignOut={signOut}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Organização                                                                 */
/* -------------------------------------------------------------------------- */

function OrganizationTab({
  podeAdministrar,
  ehProprietario,
  onChanged,
}: {
  podeAdministrar: boolean;
  ehProprietario: boolean;
  onChanged: () => Promise<void>;
}) {
  const { activeMembership, activeOrgId } = useAuth();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);

  useEffect(() => {
    setNome(activeMembership?.org.name ?? "");
  }, [activeMembership]);

  const sujo = Boolean(activeMembership) && nome.trim() !== activeMembership?.org.name;

  const salvar = async () => {
    if (!activeOrgId || salvando || !sujo) return;
    if (!nome.trim()) {
      toast.error("A organização precisa de um nome.");
      return;
    }

    setSalvando(true);
    try {
      await org.updateOrganization(activeOrgId, { name: nome.trim() });
      /* Recarrega as associações: o nome aparece no seletor do topo e no
         rodapé da sidebar, que leem daqui. */
      await onChanged();
      toast.success("Organização atualizada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!activeOrgId) return;
    try {
      await org.deleteOrganization(activeOrgId);
      await onChanged();
      toast.success("Organização excluída.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível excluir.");
    }
  };

  if (!activeMembership) return null;

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Dados da organização</CardTitle>
          <CardDescription>
            A organização reúne suas empresas, contas e lançamentos, e é por ela que o acesso de
            outras pessoas é concedido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="org-nome">Nome</Label>
            <Input
              id="org-nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              disabled={!podeAdministrar}
            />
            {!podeAdministrar && (
              <p className="text-[11.5px] text-muted-foreground">
                Apenas proprietário e administrador podem renomear.
              </p>
            )}
          </div>

          <ReadOnlyField
            label="Identificador"
            value={activeMembership.org.slug}
            hint="Gerado a partir do nome na criação e fixo desde então."
          />

          {podeAdministrar && (
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                disabled={!sujo || salvando}
                onClick={() => setNome(activeMembership.org.name)}
              >
                Cancelar
              </Button>
              <Button disabled={!sujo || salvando} onClick={() => void salvar()}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Seu acesso</CardTitle>
            <CardDescription>O que você pode fazer nesta organização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Papel</span>
              <Badge variant={ROLE_TONE[activeMembership.role]}>
                {ROLE_LABEL[activeMembership.role]}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Criada em</span>
              <span className="tabular font-medium">
                {formatDate(activeMembership.org.created_at.slice(0, 10))}
              </span>
            </div>
            <p className="border-t border-border/60 pt-3 text-[12px] leading-relaxed text-muted-foreground">
              {ROLES.find((item) => item.value === activeMembership.role)?.hint}
            </p>
          </CardContent>
        </Card>

        {/*
          A exclusão só aparece para o proprietário. Mostrá-la desabilitada aos
          demais anunciaria uma ação que eles nunca poderão tomar — e o RLS
          recusaria de qualquer forma.
        */}
        {ehProprietario && (
          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-danger">
                <ShieldAlert className="h-4 w-4" /> Zona de perigo
              </CardTitle>
              <CardDescription>Ações sem volta.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Excluir a organização apaga junto todas as empresas, contas, plano de contas,
                movimentações e recorrências. Os demais membros perdem o acesso na hora.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-danger/40 text-danger hover:bg-danger-soft"
                onClick={() => setExcluirAberto(true)}
              >
                <Trash2 /> Excluir organização
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={excluirAberto}
        onOpenChange={setExcluirAberto}
        title={`Excluir "${activeMembership.org.name}"?`}
        description="Todos os dados financeiros desta organização serão apagados, e não há como recuperá-los. Os outros membros perdem o acesso imediatamente."
        confirmLabel="Excluir tudo"
        onConfirm={() => {
          setExcluirAberto(false);
          void excluir();
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Membros                                                                     */
/* -------------------------------------------------------------------------- */

function MembersTab({
  orgId,
  meuUserId,
  podeAdministrar,
  onLeft,
}: {
  orgId: string | null;
  meuUserId: string | null;
  podeAdministrar: boolean;
  onLeft: () => Promise<void>;
}) {
  const [membros, setMembros] = useState<org.OrgMember[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [remover, setRemover] = useState<org.OrgMember | null>(null);
  const [sairAberto, setSairAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!orgId) return;
    try {
      setErro(null);
      setMembros(await org.fetchMembers(orgId));
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível carregar os membros.");
      setMembros([]);
    }
  }, [orgId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const eu = useMemo(
    () => membros?.find((item) => item.userId === meuUserId) ?? null,
    [membros, meuUserId],
  );

  /*
   * O banco não impede a organização de ficar sem dono: nenhuma restrição
   * conta quantos `owner` existem. Enquanto isso não for uma regra no
   * Postgres, é a interface que segura — e a mensagem diz o motivo, em vez de
   * apenas desabilitar o botão sem explicação.
   */
  const donos = useMemo(
    () => (membros ?? []).filter((item) => item.role === "owner").length,
    [membros],
  );
  const souUnicoDono = eu?.role === "owner" && donos === 1;

  const trocarPapel = async (membro: org.OrgMember, role: MembershipRole) => {
    setOcupado(membro.membershipId);
    try {
      await org.updateMemberRole(membro.membershipId, role);
      await carregar();
      toast.success(`${membro.name} agora é ${ROLE_LABEL[role].toLowerCase()}.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível alterar o papel.");
    } finally {
      setOcupado(null);
    }
  };

  const removerMembro = async (membro: org.OrgMember) => {
    setOcupado(membro.membershipId);
    try {
      await org.removeMember(membro.membershipId);
      await carregar();
      toast.success(`${membro.name} não tem mais acesso.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível remover.");
    } finally {
      setOcupado(null);
    }
  };

  const sair = async () => {
    if (!eu) return;
    try {
      await org.removeMember(eu.membershipId);
      await onLeft();
      toast.success("Você saiu da organização.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível sair.");
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quem tem acesso</CardTitle>
          <CardDescription>
            O papel decide o que cada pessoa pode fazer, e vale no banco de dados — não só na
            interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {membros === null ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : erro ? (
            <EmptyState
              icon={ShieldAlert}
              variant="inline"
              title="Não foi possível carregar"
              description={erro}
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {membros.map((membro) => {
                const souEu = membro.userId === meuUserId;
                const travado = ocupado === membro.membershipId;

                return (
                  <li
                    key={membro.membershipId}
                    className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11.5px] font-semibold text-primary-deep">
                        {membro.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">
                          {membro.name}
                          {souEu && (
                            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">{membro.email}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                      {/*
                        Ninguém muda o próprio papel. Um administrador que se
                        rebaixasse por engano perderia o acesso que precisaria
                        para desfazer o engano.
                      */}
                      {podeAdministrar && !souEu ? (
                        <Select
                          value={membro.role}
                          disabled={travado}
                          onValueChange={(value) => void trocarPapel(membro, value as MembershipRole)}
                        >
                          <SelectTrigger className="h-9 w-[11.5rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={ROLE_TONE[membro.role]}>{ROLE_LABEL[membro.role]}</Badge>
                      )}

                      {podeAdministrar && !souEu && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={travado}
                          aria-label={`Remover ${membro.name}`}
                          onClick={() => setRemover(membro)}
                        >
                          <Trash2 className="text-danger" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {eu && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-4 w-4" /> Sair da organização
            </CardTitle>
            <CardDescription>
              Você perde o acesso a todos os dados dela. Os lançamentos permanecem.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {souUnicoDono ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Você é o único proprietário. Promova outra pessoa a proprietário antes de sair —
                caso contrário a organização ficaria sem ninguém para administrá-la.
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-danger/40 text-danger hover:bg-danger-soft"
                onClick={() => setSairAberto(true)}
              >
                <LogOut /> Sair desta organização
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(remover)}
        onOpenChange={(open) => !open && setRemover(null)}
        title={remover ? `Remover ${remover.name}?` : ""}
        description="A pessoa perde o acesso imediatamente. Os lançamentos que ela criou permanecem na organização."
        confirmLabel="Remover acesso"
        onConfirm={() => {
          const alvo = remover;
          setRemover(null);
          if (alvo) void removerMembro(alvo);
        }}
      />

      <ConfirmDialog
        open={sairAberto}
        onOpenChange={setSairAberto}
        title="Sair desta organização?"
        description="Você perde o acesso aos dados dela. Para voltar, precisará ser adicionado novamente por um administrador."
        confirmLabel="Sair"
        onConfirm={() => {
          setSairAberto(false);
          void sair();
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conta                                                                       */
/* -------------------------------------------------------------------------- */

function AccountTab({
  nome,
  email,
  papel,
  onSignOut,
}: {
  nome: string;
  email: string;
  papel: MembershipRole;
  onSignOut: () => Promise<void>;
}) {
  const { updatePassword } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const trocarSenha = async () => {
    if (salvando) return;
    if (senha.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }

    setSalvando(true);
    try {
      await updatePassword(senha);
      setSenha("");
      setConfirmacao("");
      toast.success("Senha alterada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>
            Nome e cargo são editados no seu perfil; o e-mail é a credencial de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <ReadOnlyField label="Nome" value={nome || "Sem nome"} />
          <ReadOnlyField
            label="E-mail"
            value={email}
            hint="Trocar o e-mail exige confirmação pelos dois endereços."
          />
          <div className="flex items-center justify-between pt-1 text-[13px]">
            <span className="text-muted-foreground">Papel na organização atual</span>
            <Badge variant={ROLE_TONE[papel]}>{ROLE_LABEL[papel]}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" /> Alterar senha
            </CardTitle>
            <CardDescription>Vale a partir do próximo acesso em outros dispositivos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-2">
              <Label htmlFor="senha-nova">Nova senha</Label>
              <Input
                id="senha-nova"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="new-password"
                placeholder="Ao menos 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha-confirma">Confirmar</Label>
              <Input
                id="senha-confirma"
                type="password"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button disabled={!senha || !confirmacao || salvando} onClick={() => void trocarSenha()}>
                {salvando ? "Alterando…" : "Alterar senha"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> Sessão
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="outline" size="sm" onClick={() => void onSignOut()}>
              <LogOut /> Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
