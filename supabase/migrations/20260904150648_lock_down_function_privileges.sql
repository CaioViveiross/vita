/*
 * Vita — fecha o EXECUTE das funções.
 *
 * O Postgres concede EXECUTE a PUBLIC em toda função criada, e o Supabase
 * ainda soma grants a `anon` e `authenticated` por privilégio padrão. O efeito
 * é que TODA função vira endpoint em `/rest/v1/rpc/<nome>` — inclusive as que
 * só deveriam ser chamadas por dentro.
 *
 * A que importava de verdade: `seed_default_chart(uuid)` é `security definer`
 * e insere sem checar quem chamou. Aberta a `anon`, qualquer um que
 * descobrisse o uuid de uma organização podia repetir a chamada e encher o
 * plano de contas alheio de duplicatas. Fechar não é higiene — é a correção
 * de uma porta destrancada.
 *
 * Encontrada pelo linter do Supabase (`get_advisors`) logo após aplicar as
 * quatro migrations anteriores. Vale rodá-lo a cada mudança de DDL.
 *
 * O que continua aberto, e por quê:
 * - `create_organization` a `authenticated`: é a porta legítima de entrada, e
 *   ela mesma recusa quem não tem sessão.
 * - os três auxiliares a `authenticated`: as políticas de RLS os invocam, e a
 *   expressão da política roda com os privilégios de quem consulta. Sem
 *   EXECUTE, toda consulta falharia.
 */

/* ------------------------- Interno: ninguém chama ------------------------ */

revoke execute on function public.seed_default_chart(uuid)
  from public, anon, authenticated;

/*
 * `handle_new_user` é gatilho de `auth.users`. Quem insere ali é o
 * `supabase_auth_admin`, então o grant a ele é explícito: sem isso, um cadastro
 * poderia falhar por falta de privilégio — trocar uma brecha por um sistema
 * que não deixa ninguém entrar seria um péssimo negócio.
 */
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

/* ------------------------ Exposto só a quem precisa ---------------------- */

revoke execute on function public.create_organization(text, text) from public, anon;
grant  execute on function public.create_organization(text, text) to authenticated;

revoke execute on function public.is_org_member(uuid)  from public, anon;
grant  execute on function public.is_org_member(uuid)  to authenticated;

revoke execute on function public.has_org_write(uuid)  from public, anon;
grant  execute on function public.has_org_write(uuid)  to authenticated;

revoke execute on function public.is_org_admin(uuid)   from public, anon;
grant  execute on function public.is_org_admin(uuid)   to authenticated;

/* `security invoker` e sem efeito colateral, mas não há motivo para expô-la. */
revoke execute on function public.unaccent_fallback(text) from public, anon;
