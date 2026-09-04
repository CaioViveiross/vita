# Vita — Sistema financeiro

Sistema de gestão financeira empresarial. Os dados vivem no **Supabase** (Postgres +
Auth + RLS), em arquitetura **multi-tenant por organização**: toda tabela carrega
`org_id`, e o Row Level Security decide o acesso por associação do usuário.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173
```

Sem `.env.local` preenchido a aplicação para na inicialização com a mensagem dizendo
o que falta — de propósito: uma consulta falhando por falta de chave manda quem
depura para o lado errado (rede, CORS).

Outros comandos: `npm run build`, `npm run preview`, `npm run typecheck`.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Radix UI (padrão shadcn/ui) · Lucide · Recharts · Sonner.

## Estrutura

```
supabase/
  migrations/       Schema, RLS, bootstrap de conta e plano de contas padrão

src/
  config/brand.ts   Nome e assinatura do produto
  types/
    index.ts        Modelo de domínio (camelCase) — o que a aplicação fala
    database.ts     Linhas do Postgres (snake_case) — o que o banco devolve
  services/         Acesso ao banco: o único módulo que monta consultas
  mocks/            Sementes originais — sem uso desde a migração (ver "Mocks")
  lib/
    supabase.ts     Cliente único e tradução de erro do Postgres
    mappers.ts      Linha ↔ domínio: o único lugar que conhece os dois lados
    date.ts         Datas em ISO `YYYY-MM-DD`, formatação e períodos
    businessDays.ts Feriados e a regra de dia não útil
    recurrence.ts   Motor de recorrências (ocorrências e dias não úteis)
    finance.ts      Regras financeiras: status, saldos, agregações
    format.ts       Moeda, percentuais, CNPJ, máscara de conta
  store/
    auth-context.tsx          Sessão, perfil e organização ativa
    finance-context.tsx       Camada de dados (Supabase)
    workspace-context.tsx     Empresa e período selecionados no cabeçalho
    balance-watch-context.tsx Conta observada pelo painel e lançamento em digitação
  hooks/            Índices por id e recorte por empresa
  components/
    ui/             Primitivos (Button, Card, Dialog, Select, Table…)
    common/         Blocos transversais (MoneyValue, StatusBadge, FilterBar…)
    finance/        Componentes de domínio (tabela, cards, gráfico, formulários)
    layout/         Sidebar, topbar e o shell da aplicação
  pages/            Uma página por rota
```

## Trocar o nome do sistema

`src/config/brand.ts` → `brand`. É o único lugar onde o nome aparece.

## Identidade visual

O símbolo (a marca "V") é um arquivo só: `public/brand/vita-mark.png` — o traço em
branco sobre fundo transparente, já recortado nas bordas.

Ele nunca é exibido como `<img>`. A classe `.brand-mark` (em `src/index.css`) o usa como
**máscara CSS**: só o alfa do PNG entra, e a cor vem do `currentColor` de quem aplica a
classe. Por isso o mesmo arquivo serve no tema claro e no escuro, e mudar a cor da marca
é trocar uma classe de texto (`text-primary`) — não gerar uma variante de imagem.

O favicon (`favicon-16.png`, `favicon-32.png`) é o traço na cor primária sobre fundo
transparente; os ícones de app (`apple-touch-icon.png`, `icon-192.png`) são o traço em
branco sobre um quadrado arredondado na cor primária, porque o iOS não lida bem com
transparência. Todos saem do mesmo original enviado pelo usuário.

O original em alta resolução (1024×1024) fica solto em `public/`. Ele não é usado em
tempo de execução, mas o Vite copia tudo de `public/` para `dist/` — ou seja, ~1,3 MB de
imagem morta no build. Vale movê-lo para fora de `public/` quando não for mais
necessário como referência para gerar novos recortes.

## Regras de negócio

- **Atraso** não é persistido. `resolveStatus()` apresenta como *Atrasado* qualquer
  lançamento pendente cuja data prevista já passou — se a data mudar, ele volta a *Pendente*.
- **Liquidação**: `entrada → recebido`, `saída → pago`, com a data de liquidação registrada.
- **Saldo atual** de uma conta = saldo de abertura + movimentações já liquidadas.
  O **saldo projetado** soma também os pendentes do período.
- **Recorrência não é um cadastro à parte**: é uma movimentação com a bandeira
  *Movimentação recorrente* ligada, que abre a escolha do tipo (frequência) e da duração
  (número de vezes, até uma data, ou sem fim). As parcelas ainda não lançadas aparecem
  entre as movimentações com o status *Prevista*, e é de lá que a série é gerada,
  editada, pausada ou excluída.
- **Dia não útil**: o sistema não decide sozinho. Ao salvar, ele **alerta** quais parcelas
  caem em fim de semana ou feriado — dizendo a data e o motivo — e **pergunta** o que fazer
  com cada pagamento: *antecipar* (dia útil anterior), *adiar* (próximo dia útil) ou
  *manter* no dia. Cada resposta vale só para a sua parcela e fica em
  `Recurrence.adjustments`, indexada pela data teórica; `nonBusinessDayRule` é o que
  sobra para as parcelas não decididas (`manter`, por padrão). Séries longas têm as
  primeiras `CONFLICT_HORIZON` parcelas conferidas; as demais reaparecem como aviso na
  lista de movimentações quando se aproximam.
  Fins de semana e feriados são considerados. Os feriados nacionais vivem na tabela
  `holidays` com `org_id` nulo (compartilhados por todas as organizações); os regionais
  entram na mesma tabela com `org_id` preenchido. `src/lib/recurrence.ts` ainda usa a
  lista estática `NATIONAL_HOLIDAYS` como padrão dos parâmetros — ligá-la aos feriados
  do contexto é o passo que falta para os regionais valerem no motor de recorrências.
- **Painel de saldo** (`BalancePanel`): uma coluna fixa na lateral direita — parte do
  layout, como a sidebar, não um flutuante por cima do conteúdo. Sempre visível a
  partir de `lg`, com um botão para recolher a uma pílula estreita (preferência salva em
  `localStorage`, lida na inicialização do estado); abaixo de `lg` não há largura para uma
  coluna fixa, e o essencial aparece dentro do próprio formulário de lançamento
  (`AccountBalanceStrip`, `lg:hidden` em `transaction-form-dialog.tsx`). Mostra o
  **saldo atual** (abertura + liquidados) — o número do extrato do banco —, o efeito do
  lançamento em digitação (se ele já nasce liquidado, o saldo de hoje muda; se fica
  pendente, só o previsto), o previsto do período e os últimos lançamentos liquidados da
  conta observada, para riscar item a item contra o extrato sem sair do painel. Continua
  visível e clicável com um formulário aberto — para isso usa `DialogSatellite`
  (`components/ui/dialog.tsx`), que evita que um clique nele feche o diálogo por
  contar como "interação fora do modal", com `pointer-events-auto` para desfazer o
  `pointer-events: none` que o Radix aplica ao `<body>` enquanto o diálogo está aberto,
  e `z-[60]` para ficar acima do overlay do diálogo (`z-50`) e abaixo dos popovers
  flutuantes do sistema (`z-[70]` em select/dropdown/tooltip). O satélite marca
  `pointerdown` e `focus` em variáveis separadas — um clique em `<button>` dispara os
  dois, e uma variável compartilhada deixava o segundo sobrescrever o primeiro antes
  de o Radix conferir, escapando a dispensa por uma corrida de variável.
- **Cancelados** são preservados no histórico e excluídos de todos os totais.

## Deploy (Vercel)

A configuração está em `vercel.json`. Ela não aceita comentários — o schema da
Vercel rejeita qualquer chave que não conheça, `comment` inclusive — então o
porquê de cada linha fica aqui.

**`rewrites`** — o roteamento é do navegador (`BrowserRouter`), não do
servidor. Sem a regra que manda tudo para `index.html`, abrir `/movimentacoes`
direto, ou apenas recarregar a página, pede ao servidor um arquivo que não
existe e devolve 404. São 8 rotas nessa condição. A Vercel só aplica o rewrite
depois de não encontrar um arquivo estático, então `/assets/*` continua sendo
servido normalmente.

**`headers`** — cache separado por natureza do arquivo. Os nomes em `/assets`
carregam o hash do conteúdo (mudou o arquivo, mudou o nome), então podem ser
guardados para sempre: nunca haverá versão nova no mesmo endereço. O
`index.html` é o oposto — endereço fixo, conteúdo novo a cada deploy —, e
guardá-lo serviria uma versão antiga apontando para assets que já não existem.
Os três cabeçalhos de segurança fecham iframe e adivinhação de MIME.

### Antes do primeiro deploy

**1. Variáveis de ambiente na Vercel.** O `.env.local` é ignorado pelo git e
não sobe — corretamente. Mas o Vite injeta as variáveis **no momento do
build**, então elas precisam existir na Vercel *antes* de buildar; sem isso o
site sobe e para na mensagem "Supabase não configurado".

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

Repita trocando `production` por `preview` para que os deploys de branch
também funcionem.

**2. URLs de redirecionamento no Supabase.** O link de confirmação de e-mail
aponta para o `Site URL` do projeto. Enquanto ele for `localhost`, quem criar
conta pelo site publicado receberá um e-mail que redireciona para o próprio
computador.

Painel → Authentication → URL Configuration:
- `Site URL`: o domínio da Vercel
- `Redirect URLs`: `https://<projeto>.vercel.app/**`, mantendo
  `http://localhost:5173/**` para seguir desenvolvendo

## Como a integração está montada

Quatro camadas, de baixo para cima. Cada uma só conhece a de baixo:

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Banco | `supabase/migrations/` | Tabelas, enums, chaves e RLS |
| Tradução | `src/lib/mappers.ts` | `snake_case` ↔ `camelCase`, `numeric` → número, `null` ↔ `undefined` |
| Acesso | `src/services/finance.ts` | Monta as consultas; o único módulo que fala Supabase |
| Estado | `src/store/finance-context.tsx` | Cache em memória e as ações que as telas chamam |

Os componentes continuam consumindo `useFinance()` e falando `Transaction` e `dueDate`,
sem saber que existe um banco do outro lado. Foi por isso que a troca do `localStorage`
pelo Supabase não exigiu reescrever nenhuma tela — só tornar assíncronos os três pontos
que usavam o retorno imediato de uma escrita.

**As ações agora devolvem `Promise`.** O que entra no estado é a linha que o servidor
devolveu, não o rascunho enviado: é o banco que preenche `id`, aplica `default` e valida
`check`.

### Decisões que ficaram no schema

- **`atrasado` não existe no banco.** O enum `transaction_status` tem três valores
  (`pendente`, `pago`, `recebido`); atraso é derivado por `resolveStatus()`. Persistir
  exigiria um job reescrevendo linhas todo dia.
- **Chaves compostas com `org_id`.** As FKs referenciam `(id, org_id)`, não só `id` —
  o Postgres recusa uma conta que aponte para banco ou empresa de outra organização.
  É a rede de proteção abaixo do RLS.
- **`(expense_id, category_id)`** referencia `expenses (id, category_id)`: um lançamento
  não consegue citar o item "Energia elétrica" declarando a seção "Marketing".
- **Exclusão não destrói histórico.** Apagar conta solta o vínculo dos lançamentos
  (`on delete set null`); apagar banco com conta é recusado (`restrict`).
- **Dinheiro é `numeric(14,2)`**, e chega ao cliente como string — convertida uma única
  vez, no mapeador.

### Papéis

`owner` · `admin` · `member` escrevem; `viewer` só lê. As três funções auxiliares do RLS
(`is_org_member`, `has_org_write`, `is_org_admin`) são `security definer` para evitar a
recursão infinita de uma política de `memberships` que consultasse `memberships`.

## Plano de contas padrão

Criar uma organização dispara `seed_default_chart()`: 7 bancos, 8 categorias e 28 itens
de plano de contas, na mesma transação. Empresas, contas e movimentações **não** são
semeadas — são os dados reais de cada cliente, e inventá-los faria o usuário começar
apagando coisas.

## Mocks

`src/mocks/` não é mais importado por nenhum módulo desde a migração. As listas de
bancos e do plano de contas viraram `seed_default_chart()` no banco; as empresas, contas
e movimentações de demonstração continuam ali apenas como referência. A pasta pode ser
removida quando não servir mais para consulta.
