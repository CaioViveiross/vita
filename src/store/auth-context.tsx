import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "@/types";
import type { MembershipRole, OrganizationRow, ProfileRow } from "@/types/database";
import { describeError, supabase } from "@/lib/supabase";
import { toUserProfile } from "@/lib/mappers";

/**
 * Sessão, perfil e organização ativa.
 *
 * Fica separado de `finance-context` de propósito: identidade muda por login e
 * logout, dados de domínio mudam a cada lançamento. Juntos, trocar de empresa
 * no cabeçalho revalidaria a sessão, e um refresh de token recarregaria a
 * tela inteira de movimentações.
 *
 * A organização ativa é o eixo do multi-tenant: é ela que `finance-context`
 * usa para carregar e gravar. Um usuário pode pertencer a várias — a
 * contadora que atende três clientes é o caso comum — então a escolha é
 * explícita e sobrevive ao recarregamento.
 */

/** Organização com o papel que o usuário atual tem nela. */
export interface Membership {
  org: OrganizationRow;
  role: MembershipRole;
}

interface AuthContextValue {
  /** `false` enquanto a sessão do storage ainda não foi lida. */
  ready: boolean;
  session: Session | null;
  profile: UserProfile | null;
  memberships: Membership[];
  activeOrgId: string | null;
  activeMembership: Membership | null;
  /** `viewer` acompanha os números sem poder lançar — espelha o RLS. */
  canWrite: boolean;

  setActiveOrg: (orgId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  createOrganization: (name: string) => Promise<OrganizationRow>;
  /** Atualiza nome, cargo e iniciais do próprio perfil. */
  updateProfile: (patch: { name?: string; role?: string; initials?: string }) => Promise<void>;
  /** Recarrega perfil e associações — após aceitar convite, por exemplo. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** A organização escolhida é preferência do navegador, não dado de domínio. */
const ACTIVE_ORG_KEY = "vita:active-org";

function readStoredOrg(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

function storeOrg(orgId: string | null): void {
  try {
    if (orgId) window.localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    else window.localStorage.removeItem(ACTIVE_ORG_KEY);
  } catch {
    // Aba anônima ou cota cheia: a escolha vale só para esta sessão.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  /* --------------------------- Carga do usuário --------------------------- */

  const loadUserData = useCallback(async (userId: string) => {
    /*
     * Uma consulta só para as associações: o `select` aninhado traz a
     * organização junto, evitando o clássico N+1 de buscar os vínculos e
     * depois cada organização pelo id.
     */
    const [profileResult, membershipResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("memberships")
        .select("role, org:organizations(*)")
        .eq("user_id", userId)
        .order("created_at"),
    ]);

    if (profileResult.data) setProfile(toUserProfile(profileResult.data as ProfileRow));

    /*
     * O `as unknown` intermediário é exigido pelo TypeScript: sem os tipos
     * gerados do banco, o cliente descreve o join aninhado como array — ele
     * não tem como saber que `memberships.org_id` é único e que a relação
     * devolve um objeto só.
     */
    const rows = (membershipResult.data ?? []) as unknown as {
      role: MembershipRole;
      org: OrganizationRow | null;
    }[];
    /* `flatMap` em vez de `filter` + `map`: é o que estreita `org` para
       não-nulo aos olhos do TypeScript numa passagem só. */
    const list = rows.flatMap<Membership>((row) =>
      row.org ? [{ org: row.org, role: row.role }] : [],
    );
    setMemberships(list);

    /*
     * A organização guardada só vale se o usuário ainda pertencer a ela — o
     * acesso pode ter sido revogado desde a última visita, e insistir nela
     * daria uma tela vazia sem explicação. Sem escolha válida, cai na primeira.
     */
    setActiveOrgId((current) => {
      const stored = current ?? readStoredOrg();
      const valid = stored && list.some((item) => item.org.id === stored) ? stored : null;
      const next = valid ?? list[0]?.org.id ?? null;
      if (next !== stored) storeOrg(next);
      return next;
    });
  }, []);

  /* ------------------------------- Sessão -------------------------------- */

  useEffect(() => {
    let alive = true;

    /*
     * `onAuthStateChange` dispara com a sessão restaurada logo na inscrição,
     * então ele cobre também a carga inicial — não é preciso um `getSession()`
     * à parte, que só criaria uma corrida entre os dois caminhos.
     */
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive) return;
      setSession(next);

      if (!next?.user) {
        setProfile(null);
        setMemberships([]);
        setActiveOrgId(null);
        setReady(true);
        return;
      }

      /*
       * A carga fica FORA do callback porque ele roda dentro de um lock do
       * cliente de auth: chamar o Supabase aqui dentro trava o refresh de
       * token. O `void` sinaliza que a promessa é deliberadamente solta.
       */
      void (async () => {
        try {
          await loadUserData(next.user.id);
        } finally {
          if (alive) setReady(true);
        }
      })();
    });

    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadUserData]);

  /* ------------------------------- Ações --------------------------------- */

  const setActiveOrg = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    storeOrg(orgId);
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(describeError(error));
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (email, password, name) => {
    /* `name` vai nos metadados: é de lá que o gatilho `handle_new_user`
       monta o perfil e as iniciais do avatar. */
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(describeError(error));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    storeOrg(null);
  }, []);

  const createOrganization = useCallback<AuthContextValue["createOrganization"]>(async (name) => {
    /* Função no banco, e não dois inserts daqui: a organização e a associação
       de dono precisam nascer na mesma transação. */
    const { data, error } = await supabase.rpc("create_organization", { p_name: name });
    if (error) throw new Error(describeError(error));

    const org = data as OrganizationRow;
    if (session?.user) await loadUserData(session.user.id);
    setActiveOrg(org.id);
    return org;
  }, [session, loadUserData, setActiveOrg]);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(
    async (patch) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error("Sessão expirada. Entre novamente.");

      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw new Error(describeError(error));
      setProfile(toUserProfile(data as ProfileRow));
    },
    [session],
  );

  const refresh = useCallback(async () => {
    if (session?.user) await loadUserData(session.user.id);
  }, [session, loadUserData]);

  const activeMembership = useMemo(
    () => memberships.find((item) => item.org.id === activeOrgId) ?? null,
    [memberships, activeOrgId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      profile,
      memberships,
      activeOrgId,
      activeMembership,
      canWrite: activeMembership ? activeMembership.role !== "viewer" : false,
      setActiveOrg,
      signIn,
      signUp,
      signOut,
      createOrganization,
      updateProfile,
      refresh,
    }),
    [
      ready, session, profile, memberships, activeOrgId, activeMembership,
      setActiveOrg, signIn, signUp, signOut, createOrganization, updateProfile, refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return context;
}
