import { createClient } from "@supabase/supabase-js";

/**
 * Cliente único do Supabase.
 *
 * Um só por aplicação: cada instância abre o seu próprio canal de renovação de
 * token, e duas delas competindo pelo mesmo `localStorage` derrubam a sessão
 * uma da outra na hora do refresh.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * A ausência de configuração é dita na hora, e não quando a primeira consulta
 * falhar com "Failed to fetch" — erro que manda quem for depurar para o lado
 * errado (rede, CORS) em vez do `.env.local` que não existe.
 */
/* O placeholder conta como ausência: ele é truthy, e sem esta checagem passaria
   pela validação para falhar depois como "chave inválida" no primeiro fetch. */
const PLACEHOLDER = "COLE_AQUI_A_CHAVE_PUBLICA";

if (!url || !anonKey || anonKey === PLACEHOLDER) {
  throw new Error(
    "Supabase não configurado. Copie `.env.example` para `.env.local` e preencha " +
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Painel → Project Settings → API Keys).",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    /**
     * A sessão volta pela URL depois do fluxo de e-mail/OAuth. Fica ligado
     * porque o app usa rotas de caminho (`/movimentacoes`), não hash.
     */
    detectSessionInUrl: true,
  },
});

/**
 * Erro de banco traduzido para a linguagem de quem está usando o sistema.
 *
 * O Postgres devolve códigos, não frases: `23503` é violação de chave
 * estrangeira, que aqui quase sempre significa "esse banco ainda tem contas".
 * Deixar o código cru chegar ao `toast` seria empurrar o problema para o
 * usuário resolver.
 */
export function describeError(error: { code?: string; message: string } | null): string {
  if (!error) return "Erro desconhecido.";

  switch (error.code) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro está em uso e não pode ser removido.";
    case "23514":
      return "Os dados informados violam uma regra do sistema.";
    case "42501":
    case "PGRST301":
      return "Você não tem permissão para esta ação.";
    case "PGRST116":
      return "Registro não encontrado.";
    default:
      return error.message;
  }
}
