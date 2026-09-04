/*
 * Vita — schema inicial.
 *
 * Multi-tenant por organização: `organizations` é a raiz de isolamento e
 * `memberships` liga usuários do `auth.users` a ela. Toda tabela de domínio
 * carrega `org_id`, e é por essa coluna que o RLS decide o acesso.
 *
 * `companies` continua existindo como a divisão INTERNA de cada organização
 * (Fábrica, Loja, Distribuidora) — não é o limite de segurança.
 *
 * Convenção: snake_case no banco, camelCase no TypeScript. A tradução entre os
 * dois vive em `src/lib/mappers.ts`; nada de linha crua vaza para os componentes.
 *
 * Requer PostgreSQL 15+ pela sintaxe `on delete set null (coluna)`, usada nas
 * chaves compostas para anular só a referência sem tocar em `org_id`.
 */

/* -------------------------------------------------------------------------- */
/* Enums — espelham as uniões de tipo de src/types/index.ts                    */
/* -------------------------------------------------------------------------- */

create type public.membership_role       as enum ('owner', 'admin', 'member', 'viewer');
create type public.account_type          as enum ('corrente', 'poupanca', 'investimento', 'caixa');
create type public.category_kind         as enum ('entrada', 'saida');
create type public.transaction_type      as enum ('entrada', 'saida');

/*
 * Apenas os três status PERSISTIDOS. `atrasado` é derivado em tempo de
 * execução por `resolveStatus()` e nunca chega ao banco: ele muda sozinho
 * quando a data passa, e gravá-lo exigiria um job reescrevendo linhas todo dia.
 */
create type public.transaction_status    as enum ('pendente', 'pago', 'recebido');

create type public.frequency             as enum ('diaria', 'semanal', 'quinzenal', 'mensal', 'anual');
create type public.non_business_day_rule as enum ('manter', 'antecipar', 'postergar');
create type public.recurrence_status     as enum ('ativa', 'pausada');
create type public.holiday_scope         as enum ('nacional', 'regional');

/* -------------------------------------------------------------------------- */
/* Organização e associados                                                    */
/* -------------------------------------------------------------------------- */

create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null check (length(btrim(name)) > 0),
  slug       text        not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  created_at timestamptz not null default now()
);

comment on table public.organizations is
  'Raiz do isolamento multi-tenant. Todo dado de domínio pertence a exatamente uma organização.';

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text        not null default '',
  email      text        not null default '',
  role       text        not null default '',
  initials   text        not null default '',
  created_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Cargo exibido na interface ("Gerência financeira") — texto livre. Não confundir com membership_role, que é permissão.';

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references auth.users (id)           on delete cascade,
  role       public.membership_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

/* -------------------------------------------------------------------------- */
/* Empresas                                                                    */
/* -------------------------------------------------------------------------- */

create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  legal_name text not null default '',
  tax_id     text not null default '',
  initials   text,
  color      text,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),

  /* Redundante como unicidade (id já é PK), mas necessário como alvo das
     chaves compostas que amarram cada filho à mesma organização. */
  unique (id, org_id)
);

create index companies_org_idx on public.companies (org_id);

/* -------------------------------------------------------------------------- */
/* Bancos                                                                      */
/* -------------------------------------------------------------------------- */

create table public.banks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  code       text not null default '',
  color      text not null default '#64748b',
  created_at timestamptz not null default now(),

  unique (id, org_id)
);

create index banks_org_idx on public.banks (org_id);

/* -------------------------------------------------------------------------- */
/* Contas bancárias                                                            */
/* -------------------------------------------------------------------------- */

create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  name            text not null check (length(btrim(name)) > 0),
  bank_id         uuid not null,
  company_id      uuid not null,
  branch          text not null default '',
  number          text not null default '',
  type            public.account_type not null default 'corrente',
  /*
   * Saldo de ABERTURA. O saldo atual nunca é gravado: sai de
   * `accountBalance()` somando as movimentações liquidadas. Guardar os dois
   * criaria duas fontes de verdade que divergem no primeiro erro de escrita.
   */
  opening_balance numeric(14, 2) not null default 0,
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),

  unique (id, org_id),

  /*
   * Chaves compostas em vez de FK simples: incluir `org_id` na referência faz
   * o próprio Postgres recusar uma conta que aponte para banco ou empresa de
   * outra organização. É a rede de proteção abaixo do RLS.
   *
   * O banco é RESTRICT porque `bank_id` é NOT NULL — apagar deixaria a conta
   * órfã. Espelha a regra que `deleteBank()` já aplica na interface.
   */
  foreign key (bank_id, org_id)    references public.banks     (id, org_id) on delete restrict,
  foreign key (company_id, org_id) references public.companies (id, org_id) on delete cascade
);

create index accounts_org_idx     on public.accounts (org_id);
create index accounts_company_idx on public.accounts (company_id);
create index accounts_bank_idx    on public.accounts (bank_id);

/* -------------------------------------------------------------------------- */
/* Plano de contas                                                             */
/* -------------------------------------------------------------------------- */

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  description text not null default '',
  kind        public.category_kind not null,
  created_at  timestamptz not null default now(),

  unique (id, org_id)
);

create index categories_org_idx on public.categories (org_id);

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  category_id uuid not null,
  name        text not null check (length(btrim(name)) > 0),
  description text,
  created_at  timestamptz not null default now(),

  unique (id, org_id),
  /*
   * Alvo da FK composta de movimentações e recorrências: é o que impede um
   * lançamento de apontar para o item "Energia elétrica" declarando a seção
   * "Marketing". O item só pode ser usado junto da categoria a que pertence.
   */
  unique (id, category_id),

  /* Apagar a seção leva os itens junto — igual a `deleteCategory()`. */
  foreign key (category_id, org_id) references public.categories (id, org_id) on delete cascade
);

create index expenses_org_idx      on public.expenses (org_id);
create index expenses_category_idx on public.expenses (category_id);

/* -------------------------------------------------------------------------- */
/* Recorrências                                                                */
/* -------------------------------------------------------------------------- */

create table public.recurrences (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations (id) on delete cascade,
  name                  text not null check (length(btrim(name)) > 0),
  type                  public.transaction_type not null,
  amount                numeric(14, 2) not null check (amount >= 0),
  company_id            uuid not null,
  account_id            uuid,
  category_id           uuid,
  expense_id            uuid,
  frequency             public.frequency not null,
  start_date            date not null,
  end_date              date,
  due_day               smallint not null check (due_day between 1 and 31),
  /* Informativo: quem realmente limita a série é `end_date`. */
  occurrences           smallint check (occurrences is null or occurrences > 0),
  non_business_day_rule public.non_business_day_rule not null default 'manter',
  /*
   * Decisões tomadas parcela a parcela, indexadas pela data TEÓRICA:
   * { "2026-05-10": "postergar" }. As ocorrências sem entrada aqui seguem
   * `non_business_day_rule`.
   */
  adjustments           jsonb not null default '{}'::jsonb,
  status                public.recurrence_status not null default 'ativa',
  notes                 text,
  created_at            timestamptz not null default now(),

  unique (id, org_id),

  check (end_date is null or end_date >= start_date),
  check (jsonb_typeof(adjustments) = 'object'),

  foreign key (company_id, org_id)      references public.companies  (id, org_id) on delete cascade,
  foreign key (account_id, org_id)      references public.accounts   (id, org_id) on delete set null (account_id),
  foreign key (category_id, org_id)     references public.categories (id, org_id) on delete set null (category_id),
  foreign key (expense_id, category_id) references public.expenses   (id, category_id) on delete set null (expense_id)
);

create index recurrences_org_idx     on public.recurrences (org_id);
create index recurrences_company_idx on public.recurrences (company_id);

/* -------------------------------------------------------------------------- */
/* Movimentações                                                               */
/* -------------------------------------------------------------------------- */

create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id) on delete cascade,
  type              public.transaction_type not null,
  description       text not null check (length(btrim(description)) > 0),
  amount            numeric(14, 2) not null check (amount > 0),
  due_date          date not null,
  settled_at        date,
  company_id        uuid not null,
  account_id        uuid,
  category_id       uuid,
  expense_id        uuid,
  status            public.transaction_status not null default 'pendente',
  notes             text,
  counterparty      text,
  recurrence_id     uuid,
  /*
   * Posição na série ("2/5"). As parcelas são gravadas TODAS na criação, e não
   * projetadas: para planejar, o que vem pela frente precisa contar nos totais
   * como qualquer outro pendente.
   */
  installment       smallint,
  installment_count smallint,
  created_at        timestamptz not null default now(),

  /* `pago` é de saída e `recebido` é de entrada — ver `settledStatusFor()`. */
  constraint transactions_status_matches_type check (
    status = 'pendente'
    or (status = 'pago'     and type = 'saida')
    or (status = 'recebido' and type = 'entrada')
  ),

  /* Liquidado tem data de liquidação; pendente não tem. Sem meio-termo. */
  constraint transactions_settled_at_consistent check (
    (status = 'pendente' and settled_at is null)
    or (status <> 'pendente' and settled_at is not null)
  ),

  constraint transactions_installment_pair check (
    (installment is null and installment_count is null)
    or (installment is not null and installment_count is not null
        and installment between 1 and installment_count)
  ),

  foreign key (company_id, org_id)      references public.companies   (id, org_id) on delete cascade,
  foreign key (account_id, org_id)      references public.accounts    (id, org_id) on delete set null (account_id),
  foreign key (category_id, org_id)     references public.categories  (id, org_id) on delete set null (category_id),
  foreign key (expense_id, category_id) references public.expenses    (id, category_id) on delete set null (expense_id),
  /* Apagar a série não apaga o histórico: as parcelas só perdem o vínculo. */
  foreign key (recurrence_id, org_id)   references public.recurrences (id, org_id) on delete set null (recurrence_id)
);

/* O par (org, vencimento) é o acesso mais quente: todo filtro de período passa por ele. */
create index transactions_org_due_idx     on public.transactions (org_id, due_date);
create index transactions_org_company_idx on public.transactions (org_id, company_id);
create index transactions_account_idx     on public.transactions (account_id);
create index transactions_recurrence_idx  on public.transactions (recurrence_id);
/* Parcial: as telas de pendências e atrasados só olham para o que está em aberto. */
create index transactions_open_idx        on public.transactions (org_id, due_date)
  where status = 'pendente';

/* -------------------------------------------------------------------------- */
/* Feriados                                                                    */
/* -------------------------------------------------------------------------- */

/*
 * `org_id` nulo = feriado nacional, visível a todas as organizações. Preenchido
 * = calendário regional daquela organização. É o "mesclado com os feriados
 * regionais" que `businessDays.ts` já previa na assinatura das funções.
 */
create table public.holidays (
  id     uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  date   date not null,
  name   text not null,
  scope  public.holiday_scope not null default 'nacional',

  check ((scope = 'nacional' and org_id is null) or (scope = 'regional' and org_id is not null))
);

create unique index holidays_national_unique on public.holidays (date, name) where org_id is null;
create index holidays_org_idx on public.holidays (org_id, date);
