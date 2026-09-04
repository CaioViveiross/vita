/**
 * Organização e membros.
 *
 * Separado de `services/finance.ts` porque responde a outra pergunta: lá é o
 * dinheiro da operação, aqui é quem tem acesso a ele. As duas coisas mudam por
 * motivos diferentes e em telas diferentes.
 */

import type { ID } from "@/types";
import type { MembershipRole, OrganizationRow, ProfileRow } from "@/types/database";
import { describeError, supabase } from "@/lib/supabase";

/** Uma pessoa com acesso à organização, já com nome e e-mail resolvidos. */
export interface OrgMember {
  membershipId: ID;
  userId: ID;
  role: MembershipRole;
  name: string;
  email: string;
  initials: string;
  /** Entrada na organização, não criação da conta. */
  joinedAt: string;
}

function fail(error: { code?: string; message: string } | null): never {
  throw new Error(describeError(error));
}

/**
 * Lista quem tem acesso à organização.
 *
 * São duas consultas em vez de um join aninhado porque não existe chave
 * estrangeira entre `memberships` e `profiles` — as duas apontam para
 * `auth.users`, e o PostgREST só monta o aninhamento quando há FK direta
 * declarada entre as tabelas.
 *
 * Poderia existir: `profiles.id` é chave primária e serviria de alvo. Não foi
 * criada de propósito, para que uma associação nunca dependa da existência
 * prévia do perfil — o perfil nasce de um gatilho, e se ele falhasse, a FK
 * transformaria uma linha de perfil ausente em impossibilidade de dar acesso.
 * Equipes são pequenas; duas consultas curtas custam menos que esse
 * acoplamento.
 */
export async function fetchMembers(orgId: string): Promise<OrgMember[]> {
  const membership = await supabase
    .from("memberships")
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at");

  if (membership.error) fail(membership.error);

  const rows = (membership.data ?? []) as {
    id: string;
    user_id: string;
    role: MembershipRole;
    created_at: string;
  }[];

  if (rows.length === 0) return [];

  const profile = await supabase
    .from("profiles")
    .select("id, name, email, initials")
    .in("id", rows.map((row) => row.user_id));

  if (profile.error) fail(profile.error);

  const byId = new Map(
    ((profile.data ?? []) as Pick<ProfileRow, "id" | "name" | "email" | "initials">[]).map(
      (row) => [row.id, row],
    ),
  );

  return rows.map((row) => {
    const found = byId.get(row.user_id);
    return {
      membershipId: row.id,
      userId: row.user_id,
      role: row.role,
      /*
       * O RLS de `profiles` só entrega quem divide organização com você, o que
       * cobre todos os casos desta lista. O fallback existe para o intervalo
       * entre o cadastro e o gatilho do perfil — nunca para esconder erro.
       */
      name: found?.name || "Sem nome",
      email: found?.email ?? "",
      initials: found?.initials || "??",
      joinedAt: row.created_at.slice(0, 10),
    };
  });
}

/** Renomear exige `admin` ou `owner` — quem barra é o RLS, não a interface. */
export async function updateOrganization(
  orgId: string,
  patch: { name?: string },
): Promise<OrganizationRow> {
  const { data, error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", orgId)
    .select()
    .single();

  if (error) fail(error);
  return data as OrganizationRow;
}

export async function updateMemberRole(
  membershipId: ID,
  role: MembershipRole,
): Promise<void> {
  const { error } = await supabase.from("memberships").update({ role }).eq("id", membershipId);
  if (error) fail(error);
}

/**
 * Remove alguém — ou a si mesmo, que é como se sai da organização.
 *
 * A política `memberships_delete` aceita os dois casos: `user_id = auth.uid()`
 * ou administrador. A distinção entre "sair" e "remover" é só de vocabulário
 * na interface; para o banco é a mesma linha que deixa de existir.
 */
export async function removeMember(membershipId: ID): Promise<void> {
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) fail(error);
}

/** Só o dono apaga, e leva junto tudo que pertence à organização. */
export async function deleteOrganization(orgId: string): Promise<void> {
  const { error } = await supabase.from("organizations").delete().eq("id", orgId);
  if (error) fail(error);
}
