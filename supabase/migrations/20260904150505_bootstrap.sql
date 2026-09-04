/*
 * Vita — bootstrap de conta.
 *
 * Resolve o problema do ovo e da galinha do multi-tenant: para inserir uma
 * organização é preciso ser membro dela, e para ser membro ela precisa existir.
 * `create_organization()` faz os dois passos numa transação só, rodando como
 * dono para atravessar o RLS — e é a ÚNICA porta de entrada, já que
 * `organizations` não tem política de INSERT.
 */

/* -------------------------------------------------------------------------- */
/* Perfil automático                                                           */
/* -------------------------------------------------------------------------- */

/*
 * Todo usuário que se cadastra ganha um perfil. Sem isso, a interface teria de
 * lidar com "usuário logado sem nome" em cada tela que mostra o avatar.
 *
 * `initials` sai das iniciais do nome — mesma regra de `initialsFrom()` no
 * front. Sem nome, cai para as duas primeiras letras do e-mail.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name  text := coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '');
  v_email text := coalesce(new.email, '');
  v_parts text[];
begin
  v_parts := regexp_split_to_array(btrim(v_name), '\s+');

  insert into public.profiles (id, name, email, role, initials)
  values (
    new.id,
    v_name,
    v_email,
    '',
    upper(
      case
        when v_name = '' then substr(v_email, 1, 2)
        when array_length(v_parts, 1) = 1 then substr(v_parts[1], 1, 2)
        else substr(v_parts[1], 1, 1) || substr(v_parts[array_length(v_parts, 1)], 1, 1)
      end
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* -------------------------------------------------------------------------- */
/* Criação de organização                                                      */
/* -------------------------------------------------------------------------- */

/*
 * `unaccent` é uma extensão que nem todo projeto tem habilitada, e exigir isso
 * para criar uma conta seria um acoplamento tolo. Esta tradução cobre o
 * português, que é o alfabeto dos nomes que passam por aqui.
 */
create or replace function public.unaccent_fallback(p_text text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select translate(
    p_text,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

create or replace function public.create_organization(p_name text, p_slug text default null)
returns public.organizations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_slug text;
  v_org  public.organizations;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado para criar uma organização.'
      using errcode = '42501';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A organização precisa de um nome.' using errcode = '22023';
  end if;

  /* Slug a partir do nome: minúsculas, sem acento, hífen no lugar do resto. */
  v_slug := coalesce(
    nullif(btrim(lower(p_slug)), ''),
    btrim(
      regexp_replace(
        regexp_replace(lower(unaccent_fallback(p_name)), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      )
    )
  );

  if length(v_slug) < 3 then
    v_slug := 'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  /* Colisão de slug resolvida com sufixo, não com erro na cara do usuário. */
  if exists (select 1 from public.organizations o where o.slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.organizations (name, slug)
  values (btrim(p_name), v_slug)
  returning * into v_org;

  /* Quem cria é dono: o único papel que pode apagar a organização depois. */
  insert into public.memberships (org_id, user_id, role)
  values (v_org.id, v_user, 'owner');

  return v_org;
end;
$$;

comment on function public.create_organization is
  'Cria a organização e a associação de dono numa transação só. Única forma de inserir em organizations.';

grant execute on function public.create_organization(text, text) to authenticated;

/* -------------------------------------------------------------------------- */
/* Calendário nacional                                                         */
/* -------------------------------------------------------------------------- */

/*
 * Feriados nacionais são os mesmos para todas as organizações, então entram
 * com `org_id` nulo e são lidos por qualquer usuário autenticado. Os regionais
 * de cada organização convivem na mesma tabela, com `org_id` preenchido.
 *
 * Mesma lista que hoje vive em `NATIONAL_HOLIDAYS` (src/lib/businessDays.ts).
 */
insert into public.holidays (org_id, date, name, scope) values
  (null, '2026-01-01', 'Confraternização Universal', 'nacional'),
  (null, '2026-02-16', 'Carnaval',                   'nacional'),
  (null, '2026-02-17', 'Carnaval',                   'nacional'),
  (null, '2026-04-03', 'Sexta-feira Santa',          'nacional'),
  (null, '2026-04-21', 'Tiradentes',                 'nacional'),
  (null, '2026-05-01', 'Dia do Trabalho',            'nacional'),
  (null, '2026-06-04', 'Corpus Christi',             'nacional'),
  (null, '2026-09-07', 'Independência do Brasil',    'nacional'),
  (null, '2026-10-12', 'Nossa Senhora Aparecida',    'nacional'),
  (null, '2026-11-02', 'Finados',                    'nacional'),
  (null, '2026-11-15', 'Proclamação da República',   'nacional'),
  (null, '2026-11-20', 'Consciência Negra',          'nacional'),
  (null, '2026-12-25', 'Natal',                      'nacional'),
  (null, '2027-01-01', 'Confraternização Universal', 'nacional'),
  (null, '2027-02-08', 'Carnaval',                   'nacional'),
  (null, '2027-02-09', 'Carnaval',                   'nacional'),
  (null, '2027-03-26', 'Sexta-feira Santa',          'nacional'),
  (null, '2027-04-21', 'Tiradentes',                 'nacional'),
  (null, '2027-05-01', 'Dia do Trabalho',            'nacional')
on conflict do nothing;
