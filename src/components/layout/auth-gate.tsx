import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { SignInPage } from "@/pages/sign-in";
import { useAuth } from "@/store/auth-context";

/**
 * Decide o que a aplicação mostra antes de qualquer rota.
 *
 * São três estados sem os quais o resto não funciona, e é melhor tratá-los aqui
 * do que fazer cada tela se defender de um deles:
 *
 * 1. sessão ainda não lida do armazenamento — nada é decidido ainda;
 * 2. sem sessão — a tela de acesso;
 * 3. com sessão, mas sem nenhuma organização — não há onde gravar, então o
 *    caminho é criar a primeira.
 *
 * O RLS recusaria toda consulta nos casos 2 e 3. Barrando aqui, o erro nunca
 * chega em forma de tela vazia sem explicação.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, session, memberships } = useAuth();

  if (!ready) return <SplashScreen />;
  if (!session) return <SignInPage />;
  if (memberships.length === 0) return <CreateOrganizationScreen />;

  return <>{children}</>;
}

/**
 * A marca sozinha enquanto a sessão é lida.
 *
 * Sem texto e sem spinner: a leitura do armazenamento local termina em
 * milissegundos, e uma mensagem de carregamento que pisca e some incomoda mais
 * do que informa.
 */
function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span
        className="brand-mark h-9 w-14 animate-pulse text-primary"
        role="img"
        aria-label={brand.name}
      />
    </div>
  );
}

function CreateOrganizationScreen() {
  const { createOrganization, signOut, profile } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (!name.trim()) {
      setError("Informe o nome da organização.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createOrganization(name.trim());
      /* Sem navegação: assim que a organização entra na lista, o portão
         libera as rotas normais. */
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a organização.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="brand-mark h-9 w-14 text-primary" role="img" aria-label={brand.name} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {profile?.name ? `Boas-vindas, ${profile.name.split(" ")[0]}` : `Boas-vindas ao ${brand.name}`}
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              A organização guarda tudo: empresas, contas, plano de contas e lançamentos. É também
              por ela que outras pessoas passam a ter acesso.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-pop"
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">Nome da organização</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Grupo Vita"
              autoFocus
            />
            <p className="text-[11.5px] text-muted-foreground">
              Costuma ser o nome do grupo ou do escritório — as empresas você cadastra depois.
            </p>
            {error && <p className="text-[12.5px] text-danger">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Criando…" : "Criar organização"}
          </Button>

          <button
            type="button"
            className="w-full text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => void signOut()}
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
