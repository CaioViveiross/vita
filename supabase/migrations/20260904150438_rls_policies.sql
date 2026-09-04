/*
 * Vita — Row Level Security.
 *
 * Regra única do sistema: você enxerga uma linha se for membro da organização
 * dona dela. Tudo abaixo é essa frase aplicada tabela a tabela.
 *
 * As três funções auxiliares são `security definer` de propósito. Uma política
 * de `memberships` que consultasse `memberships` diretamente entraria em
 * recursão infinita — o Postgres reavaliaria a política para checar a própria
 * política. Rodando como dono, a função ignora o RLS e corta o ciclo.
 *
 * `set search_path` fechado em cada função: sem isso, um schema malicioso no
 * caminho de busca poderia sequestrar a resolução dos nomes dentro de uma
 * função que roda com privilégio elevado.
 */

/* -------------------------------------------------------------------------- */
/* Funções auxiliares                                                          */
/* -------------------------------------------------------------------------- */

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
  );
$$;

comment on function public.is_org_member is
  'Leitura: o usuário pertence à organização, em qualquer papel.';

/*
 * Escrita. `viewer` fica de fora — é o papel de quem acompanha os números sem
 * poder lançar, o caso do contador externo ou do sócio que só consulta.
 */
create or replace function public.has_org_write(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'member')
  );
$$;

/* Administração: convidar gente, mudar papéis, renomear a organização. */
create or replace function public.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

/* -------------------------------------------------------------------------- */
/* Habilita o RLS                                                              */
/* -------------------------------------------------------------------------- */

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.memberships   enable row level security;
alter table public.companies     enable row level security;
alter table public.banks         enable row level security;
alter table public.accounts      enable row level security;
alter table public.categories    enable row level security;
alter table public.expenses      enable row level security;
alter table public.recurrences   enable row level security;
alter table public.transactions  enable row level security;
alter table public.holidays      enable row level security;

/* -------------------------------------------------------------------------- */
/* Organizações                                                                */
/* -------------------------------------------------------------------------- */

create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

/*
 * Sem política de INSERT: criar organização passa obrigatoriamente pela função
 * `create_organization()`. Inserir a organização e a associação de dono são
 * dois passos que não podem ficar separados — uma organização sem dono seria
 * invisível para todo mundo, inclusive para quem acabou de criá-la.
 */

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

/* -------------------------------------------------------------------------- */
/* Perfis                                                                      */
/* -------------------------------------------------------------------------- */

/* Ver o próprio perfil, e o de quem divide alguma organização com você —
   é o que permite mostrar "lançado por Fulano" sem expor a base inteira. */
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.memberships mine
      join public.memberships theirs on theirs.org_id = mine.org_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

/* -------------------------------------------------------------------------- */
/* Associações                                                                 */
/* -------------------------------------------------------------------------- */

create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_org_member(org_id));

create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy memberships_update on public.memberships
  for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

/* Sair da organização é direito de qualquer membro; remover os outros, não. */
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (user_id = auth.uid() or public.is_org_admin(org_id));

/* -------------------------------------------------------------------------- */
/* Tabelas de domínio                                                          */
/* -------------------------------------------------------------------------- */

/*
 * O mesmo quarteto para as sete tabelas. Um `do` em vez de 28 políticas
 * escritas à mão: a regra é idêntica, e repetir o texto é repetir o risco de
 * uma delas sair diferente das outras sem ninguém perceber.
 */
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'banks', 'accounts', 'categories', 'expenses', 'recurrences', 'transactions'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_member(org_id))',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_org_write(org_id))',
      t || '_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_org_write(org_id)) with check (public.has_org_write(org_id))',
      t || '_update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_org_write(org_id))',
      t || '_delete', t
    );
  end loop;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Feriados                                                                    */
/* -------------------------------------------------------------------------- */

/* Os nacionais (`org_id` nulo) são de todos; os regionais, de quem os cadastrou. */
create policy holidays_select on public.holidays
  for select to authenticated
  using (org_id is null or public.is_org_member(org_id));

create policy holidays_insert on public.holidays
  for insert to authenticated
  with check (org_id is not null and public.has_org_write(org_id));

create policy holidays_update on public.holidays
  for update to authenticated
  using (org_id is not null and public.has_org_write(org_id))
  with check (org_id is not null and public.has_org_write(org_id));

create policy holidays_delete on public.holidays
  for delete to authenticated
  using (org_id is not null and public.has_org_write(org_id));

/* -------------------------------------------------------------------------- */
/* Privilégios                                                                 */
/* -------------------------------------------------------------------------- */

/*
 * O RLS filtra linhas, mas quem nem deveria alcançar a tabela é barrado antes,
 * no privilégio. `anon` é o visitante sem sessão: nada de financeiro é público.
 */
revoke all on all tables in schema public from anon;

grant select, insert, update, delete on
  public.companies, public.banks, public.accounts, public.categories,
  public.expenses, public.recurrences, public.transactions, public.holidays,
  public.memberships, public.profiles
to authenticated;

grant select, update, delete on public.organizations to authenticated;
