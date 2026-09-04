/*
 * Vita — plano de contas e bancos padrão.
 *
 * Uma organização recém-criada com o plano de contas vazio é uma tela em
 * branco pedindo trabalho antes do primeiro lançamento. Estas listas saíram
 * de `src/mocks/categories.ts` e `src/mocks/banks.ts` — deixaram de ser dados
 * de demonstração e viraram o ponto de partida do produto.
 *
 * O que NÃO é semeado: empresas, contas e movimentações. Esses são os dados
 * reais de cada cliente, e inventá-los faria o usuário começar apagando coisas.
 */

create or replace function public.seed_default_chart(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_categoria uuid;
begin
  /* ------------------------------ Bancos ------------------------------- */
  insert into public.banks (org_id, name, code, color) values
    (p_org, 'Itaú Unibanco',    '341', '#a55b09'),
    (p_org, 'Santander',        '033', '#b3211a'),
    (p_org, 'Bradesco',         '237', '#a3103a'),
    (p_org, 'Banco do Brasil',  '001', '#8a6d0a'),
    (p_org, 'Caixa Econômica',  '104', '#28368f'),
    (p_org, 'Nu Pagamentos',    '260', '#6b2fb0'),
    (p_org, 'Banco Inter',      '077', '#a8401d');

  /* --------------------------- Plano de contas -------------------------- */

  /*
   * Categoria e itens inseridos em pares: o `returning into` devolve o uuid
   * gerado, que os itens precisam para apontar de volta. É o preço de usar
   * chave gerada pelo banco — e vale o preço, porque o cliente não escolhe id.
   */

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Imóvel', 'Aluguéis, condomínios e custos de ocupação das unidades.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Aluguel'),
    (p_org, v_categoria, 'Condomínio'),
    (p_org, v_categoria, 'IPTU');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Serviços Públicos', 'Despesas relacionadas aos serviços essenciais das empresas.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Energia elétrica'),
    (p_org, v_categoria, 'Água'),
    (p_org, v_categoria, 'Internet'),
    (p_org, v_categoria, 'Telefone');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Funcionários', 'Folha de pagamento, encargos e benefícios da equipe.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Salários'),
    (p_org, v_categoria, 'Vale transporte'),
    (p_org, v_categoria, 'Vale refeição'),
    (p_org, v_categoria, 'FGTS');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Impostos', 'Tributos federais, estaduais e municipais das operações.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Simples Nacional'),
    (p_org, v_categoria, 'INSS'),
    (p_org, v_categoria, 'ICMS');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Fornecedores', 'Compra de matéria-prima, insumos e mercadorias para revenda.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Matéria-prima'),
    (p_org, v_categoria, 'Embalagens'),
    (p_org, v_categoria, 'Mercadorias para revenda');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Marketing', 'Investimento em mídia, campanhas e material promocional.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Mídia paga'),
    (p_org, v_categoria, 'Material gráfico');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Operacional', 'Custos de logística, manutenção e funcionamento do dia a dia.', 'saida')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Frete e logística'),
    (p_org, v_categoria, 'Manutenção de equipamentos'),
    (p_org, v_categoria, 'Softwares e assinaturas'),
    (p_org, v_categoria, 'Contabilidade'),
    (p_org, v_categoria, 'Combustível da frota');

  insert into public.categories (org_id, name, description, kind)
  values (p_org, 'Receitas', 'Entradas de vendas, contratos e demais receitas da operação.', 'entrada')
  returning id into v_categoria;
  insert into public.expenses (org_id, category_id, name) values
    (p_org, v_categoria, 'Vendas no atacado'),
    (p_org, v_categoria, 'Vendas no varejo'),
    (p_org, v_categoria, 'Contratos recorrentes'),
    (p_org, v_categoria, 'Rendimentos financeiros');
end;
$$;

comment on function public.seed_default_chart is
  'Popula bancos e plano de contas iniciais de uma organização. Chamada por create_organization.';

/* -------------------------------------------------------------------------- */
/* create_organization passa a semear                                          */
/* -------------------------------------------------------------------------- */

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

  if exists (select 1 from public.organizations o where o.slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.organizations (name, slug)
  values (btrim(p_name), v_slug)
  returning * into v_org;

  insert into public.memberships (org_id, user_id, role)
  values (v_org.id, v_user, 'owner');

  /*
   * Na mesma transação: uma organização criada sem o plano de contas, porque
   * a semeadura falhou no meio, é pior que nenhuma organização — o usuário
   * teria de descobrir sozinho o que ficou faltando.
   */
  perform public.seed_default_chart(v_org.id);

  return v_org;
end;
$$;
