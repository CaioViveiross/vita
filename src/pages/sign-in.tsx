import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/config/brand";
import { useAuth } from "@/store/auth-context";

/**
 * Entrada do sistema: acessar uma conta existente ou criar a primeira.
 *
 * As duas metades vivem no mesmo componente porque compartilham o formulário
 * inteiro menos um campo. Separá-las em duas rotas duplicaria a validação e o
 * tratamento de erro para ganhar apenas uma URL a mais.
 */
export function SignInPage() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const criando = mode === "criar";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    if (criando && !name.trim()) {
      setError("Informe o seu nome.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (criando) {
        await signUp(email.trim(), password, name.trim());
        /*
         * Com confirmação de e-mail ligada no projeto, `signUp` devolve sucesso
         * sem sessão — a conta existe, mas o acesso só vem depois do clique no
         * link. Sem este aviso, a tela pareceria não ter feito nada.
         */
        setNotice("Conta criada. Verifique seu e-mail para confirmar o acesso.");
      } else {
        await signIn(email.trim(), password);
        /* Nada a fazer no sucesso: a mudança de sessão troca a tela sozinha. */
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="brand-mark h-9 w-14 text-primary" role="img" aria-label={brand.name} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{brand.name}</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{brand.tagline}</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-pop"
        >
          <div>
            <h2 className="text-[15px] font-semibold">
              {criando ? "Criar conta" : "Entrar"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {criando
                ? "Depois de confirmar o e-mail, você cria a sua organização."
                : "Use o e-mail e a senha da sua conta."}
            </p>
          </div>

          {criando && (
            <div className="space-y-2">
              <Label htmlFor="signin-name">Nome</Label>
              <Input
                id="signin-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Caio Viveiros"
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="signin-email">E-mail</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com.br"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signin-password">Senha</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={criando ? "new-password" : "current-password"}
            />
          </div>

          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          {notice && <p className="text-[12.5px] text-success">{notice}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde…" : criando ? "Criar conta" : "Entrar"}
          </Button>

          <button
            type="button"
            className="w-full text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setMode(criando ? "entrar" : "criar");
              setError(null);
              setNotice(null);
            }}
          >
            {criando ? "Já tenho uma conta" : "Criar uma conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
