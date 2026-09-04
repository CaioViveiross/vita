/// <reference types="vite/client" />

/**
 * Variáveis de ambiente declaradas uma a uma, em vez de aceitar o
 * `Record<string, string>` genérico do Vite.
 *
 * Assim um `VITE_SUPABSE_URL` com o dedo trocado vira erro de compilação, e não
 * um `undefined` silencioso que só aparece quando o app já está no ar.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
