import type { Frequency, Transaction, TransactionStatus, TransactionType } from "@/types";
import { addDays, addMonths, today } from "@/lib/date";
import { recurrences } from "./recurrences";

interface Seed {
  id: string;
  type: TransactionType;
  description: string;
  counterparty?: string;
  amount: number;
  /** Deslocamento em dias em relação a hoje — mantém a demonstração sempre atual. */
  offset: number;
  companyId: string;
  accountId: string;
  categoryId: string;
  expenseId: string;
  status: Extract<TransactionStatus, "pendente" | "pago" | "recebido">;
  notes?: string;
  recurrenceId?: string;
}

const seeds: Seed[] = [
  /* ------------------------------- Hoje ---------------------------------- */
  {
    id: "trx_001", type: "entrada", description: "Pedido #4820 — Supermercado Bom Preço",
    counterparty: "Supermercado Bom Preço LTDA", amount: 8_500, offset: 0,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "pendente",
    notes: "Boleto com vencimento hoje. Cliente costuma pagar no fim do dia.",
  },
  {
    id: "trx_002", type: "entrada", description: "Contrato mensal — Rede Vivá",
    counterparty: "Rede Vivá Alimentos", amount: 12_400, offset: 0,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_receitas", expenseId: "exp_contratos", status: "pendente",
    recurrenceId: "rec_009",
  },
  {
    id: "trx_003", type: "entrada", description: "Vendas do dia — PDV Loja Centro",
    amount: 4_318.75, offset: 0,
    companyId: "cmp_loja_centro", accountId: "acc_nubank_loja",
    categoryId: "cat_receitas", expenseId: "exp_vendas_varejo", status: "pendente",
  },
  {
    id: "trx_004", type: "saida", description: "Insumos — Fornecedor Delta Embalagens",
    counterparty: "Delta Embalagens ME", amount: 2_350, offset: 0,
    companyId: "cmp_fabrica", accountId: "acc_santander_fabrica",
    categoryId: "cat_fornecedores", expenseId: "exp_embalagens", status: "pendente",
    notes: "Nota fiscal 11.284. Pagamento via boleto.",
  },
  {
    id: "trx_005", type: "saida", description: "Energia elétrica — unidade industrial",
    counterparty: "CPFL Energia", amount: 6_742.9, offset: 0,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_servicos_publicos", expenseId: "exp_energia", status: "pendente",
    recurrenceId: "rec_002",
  },
  {
    id: "trx_006", type: "saida", description: "Mídia paga — campanha de agosto",
    counterparty: "Google Ads", amount: 1_890, offset: 0,
    companyId: "cmp_loja_centro", accountId: "acc_bradesco_loja",
    categoryId: "cat_marketing", expenseId: "exp_midia_paga", status: "pendente",
  },
  {
    id: "trx_007", type: "saida", description: "Frete de distribuição — rota sul",
    counterparty: "TransRápido Logística", amount: 3_120, offset: 0,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_operacional", expenseId: "exp_frete", status: "pendente",
  },

  /* ------------------------------ Atrasados ------------------------------ */
  {
    id: "trx_008", type: "saida", description: "Manutenção da envasadora",
    counterparty: "Mecânica Industrial Prisma", amount: 4_780, offset: -3,
    companyId: "cmp_fabrica", accountId: "acc_santander_fabrica",
    categoryId: "cat_operacional", expenseId: "exp_manutencao", status: "pendente",
    notes: "Aguardando segunda via do boleto.",
  },
  {
    id: "trx_009", type: "entrada", description: "Pedido #4791 — Mercado São Jorge",
    counterparty: "Mercado São Jorge", amount: 5_260, offset: -6,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "pendente",
    notes: "Cliente pediu prorrogação. Cobrar novamente.",
  },
  {
    id: "trx_010", type: "saida", description: "Material gráfico — encartes",
    counterparty: "Gráfica Aurora", amount: 940, offset: -2,
    companyId: "cmp_loja_centro", accountId: "acc_bradesco_loja",
    categoryId: "cat_marketing", expenseId: "exp_material_grafico", status: "pendente",
  },
  {
    id: "trx_011", type: "saida", description: "Água e esgoto — loja",
    counterparty: "SABESP", amount: 618.4, offset: -1,
    companyId: "cmp_loja_centro", accountId: "acc_bradesco_loja",
    categoryId: "cat_servicos_publicos", expenseId: "exp_agua", status: "pendente",
  },

  /* ---------------------- Já liquidados (últimos dias) ------------------- */
  {
    id: "trx_012", type: "saida", description: "Folha de pagamento — agosto",
    amount: 38_400, offset: -1,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_funcionarios", expenseId: "exp_salarios", status: "pago",
    recurrenceId: "rec_004",
  },
  {
    id: "trx_013", type: "entrada", description: "Pedido #4805 — Atacadão Vila Nova",
    counterparty: "Atacadão Vila Nova", amount: 18_950, offset: -1,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "recebido",
  },
  {
    id: "trx_014", type: "entrada", description: "Vendas do dia — PDV Loja Centro",
    amount: 3_872.4, offset: -1,
    companyId: "cmp_loja_centro", accountId: "acc_nubank_loja",
    categoryId: "cat_receitas", expenseId: "exp_vendas_varejo", status: "recebido",
  },
  {
    id: "trx_015", type: "saida", description: "Matéria-prima — Cooperativa Serra Verde",
    counterparty: "Cooperativa Serra Verde", amount: 22_640, offset: -2,
    companyId: "cmp_fabrica", accountId: "acc_santander_fabrica",
    categoryId: "cat_fornecedores", expenseId: "exp_materia_prima", status: "pago",
  },
  {
    id: "trx_016", type: "saida", description: "Honorários contábeis",
    counterparty: "Contabilidade Marques", amount: 2_450, offset: -4,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_operacional", expenseId: "exp_contabilidade", status: "pago",
    recurrenceId: "rec_007",
  },
  {
    id: "trx_017", type: "entrada", description: "Rendimento da reserva de caixa",
    amount: 612.18, offset: -3,
    companyId: "cmp_fabrica", accountId: "acc_reserva_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_rendimentos", status: "recebido",
  },
  {
    id: "trx_018", type: "saida", description: "Assinatura do ERP",
    counterparty: "Omie Sistemas", amount: 1_290, offset: -5,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_operacional", expenseId: "exp_software", status: "pago",
    recurrenceId: "rec_008",
  },
  {
    id: "trx_019", type: "entrada", description: "Pedido #4788 — Rede Mais Você",
    counterparty: "Rede Mais Você", amount: 9_740, offset: -7,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "recebido",
  },
  {
    id: "trx_020", type: "saida", description: "Combustível da frota",
    counterparty: "Posto Trevo", amount: 4_215.6, offset: -6,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_operacional", expenseId: "exp_combustivel", status: "pago",
  },

  /* -------------------------- Próximos 7 dias ---------------------------- */
  {
    id: "trx_021", type: "saida", description: "Fornecedor ABC — insumos de produção",
    counterparty: "ABC Insumos Industriais", amount: 4_500, offset: 1,
    companyId: "cmp_fabrica", accountId: "acc_santander_fabrica",
    categoryId: "cat_fornecedores", expenseId: "exp_materia_prima", status: "pendente",
  },
  {
    id: "trx_022", type: "entrada", description: "Pedido #4834 — Distribuidora XYZ",
    counterparty: "Distribuidora XYZ", amount: 12_000, offset: 2,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "pendente",
  },
  {
    id: "trx_023", type: "saida", description: "Vale refeição — crédito mensal",
    counterparty: "Alelo Benefícios", amount: 7_820, offset: 3,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_funcionarios", expenseId: "exp_vale_refeicao", status: "pendente",
    recurrenceId: "rec_005",
  },
  {
    id: "trx_024", type: "saida", description: "Internet dedicada — fábrica e loja",
    counterparty: "Vero Telecom", amount: 1_180, offset: 4,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_servicos_publicos", expenseId: "exp_internet", status: "pendente",
    recurrenceId: "rec_003",
  },
  {
    id: "trx_025", type: "entrada", description: "Contrato mensal — Padaria Estrela",
    counterparty: "Padaria Estrela", amount: 6_300, offset: 5,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_contratos", status: "pendente",
  },
  {
    id: "trx_026", type: "saida", description: "Aluguel da fábrica",
    counterparty: "Imobiliária Progresso", amount: 8_500, offset: 6,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_imovel", expenseId: "exp_aluguel_fabrica", status: "pendente",
    recurrenceId: "rec_001",
  },

  /* -------------------------- Próximos 30 dias --------------------------- */
  {
    id: "trx_027", type: "saida", description: "Aluguel da loja centro",
    counterparty: "Adm. Predial Centro", amount: 5_400, offset: 8,
    companyId: "cmp_loja_centro", accountId: "acc_bradesco_loja",
    categoryId: "cat_imovel", expenseId: "exp_aluguel_loja", status: "pendente",
    recurrenceId: "rec_010",
  },
  {
    id: "trx_028", type: "saida", description: "Simples Nacional — competência agosto",
    amount: 14_780.35, offset: 10,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_impostos", expenseId: "exp_simples", status: "pendente",
  },
  {
    id: "trx_029", type: "entrada", description: "Pedido #4851 — Supermercado Bom Preço",
    counterparty: "Supermercado Bom Preço LTDA", amount: 11_250, offset: 11,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "pendente",
  },
  {
    id: "trx_030", type: "saida", description: "FGTS — competência agosto",
    amount: 3_960, offset: 12,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_impostos", expenseId: "exp_fgts", status: "pendente",
  },
  {
    id: "trx_031", type: "saida", description: "Mercadorias para revenda — lote setembro",
    counterparty: "Distribuidora Norte Sul", amount: 16_400, offset: 14,
    companyId: "cmp_loja_centro", accountId: "acc_bradesco_loja",
    categoryId: "cat_fornecedores", expenseId: "exp_mercadorias", status: "pendente",
  },
  {
    id: "trx_032", type: "entrada", description: "Contrato mensal — Rede Vivá",
    counterparty: "Rede Vivá Alimentos", amount: 12_400, offset: 17,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_receitas", expenseId: "exp_contratos", status: "pendente",
    recurrenceId: "rec_009",
  },
  {
    id: "trx_033", type: "saida", description: "IPTU — parcela 8/10",
    counterparty: "Prefeitura Municipal", amount: 1_845.2, offset: 19,
    companyId: "cmp_fabrica", accountId: "acc_santander_fabrica",
    categoryId: "cat_imovel", expenseId: "exp_iptu", status: "pendente",
  },
  {
    id: "trx_034", type: "entrada", description: "Pedido #4862 — Atacadão Vila Nova",
    counterparty: "Atacadão Vila Nova", amount: 21_800, offset: 22,
    companyId: "cmp_fabrica", accountId: "acc_itau_fabrica",
    categoryId: "cat_receitas", expenseId: "exp_vendas_atacado", status: "pendente",
  },
  {
    id: "trx_035", type: "saida", description: "Manutenção preventiva da frota",
    counterparty: "Auto Center Veloz", amount: 2_680, offset: 25,
    companyId: "cmp_distribuidora", accountId: "acc_bb_distribuidora",
    categoryId: "cat_operacional", expenseId: "exp_manutencao", status: "pendente",
  },
  {
    id: "trx_036", type: "entrada", description: "Vendas consolidadas — semana 5",
    amount: 19_430.6, offset: 28,
    companyId: "cmp_loja_centro", accountId: "acc_nubank_loja",
    categoryId: "cat_receitas", expenseId: "exp_vendas_varejo", status: "pendente",
  },
];

/** Quantas parcelas futuras acompanham cada lançamento de uma série. */
const PARCELAS_POR_SERIE = 6;

/** Avanço de um ciclo, conforme a frequência da série. */
function proximaData(date: string, frequency: Frequency): string {
  switch (frequency) {
    case "diaria":
      return addDays(date, 1);
    case "semanal":
      return addDays(date, 7);
    case "quinzenal":
      return addDays(date, 15);
    case "anual":
      return addMonths(date, 12);
    default:
      return addMonths(date, 1);
  }
}

/**
 * Materializa as sementes em lançamentos com datas relativas a hoje.
 *
 * Sementes ligadas a uma repetição viram uma série inteira: as parcelas não
 * são projetadas em tempo de exibição, elas existem como lançamentos comuns
 * para que o que está por vir conte no planejamento. Só a primeira carrega o
 * status da semente — as seguintes são futuras, e portanto pendentes.
 */
export function buildTransactions(reference: string = today()): Transaction[] {
  return seeds.flatMap((seed) => {
    const dueDate = addDays(reference, seed.offset);
    const settled = seed.status === "pago" || seed.status === "recebido";
    const base = {
      type: seed.type,
      description: seed.description,
      counterparty: seed.counterparty,
      amount: seed.amount,
      companyId: seed.companyId,
      accountId: seed.accountId,
      categoryId: seed.categoryId,
      expenseId: seed.expenseId,
      notes: seed.notes,
      recurrenceId: seed.recurrenceId,
    };

    const primeira: Transaction = {
      ...base,
      id: seed.id,
      dueDate,
      settledAt: settled ? dueDate : undefined,
      status: seed.status,
      createdAt: addDays(dueDate, -Math.max(4, Math.abs(seed.offset))),
      ...(seed.recurrenceId ? { installment: 1, installmentCount: PARCELAS_POR_SERIE } : {}),
    };

    if (!seed.recurrenceId) return [primeira];

    const frequency = recurrences.find((item) => item.id === seed.recurrenceId)?.frequency ?? "mensal";
    const restantes: Transaction[] = [];
    let cursor = dueDate;

    for (let indice = 2; indice <= PARCELAS_POR_SERIE; indice += 1) {
      cursor = proximaData(cursor, frequency);
      restantes.push({
        ...base,
        id: `${seed.id}_p${indice}`,
        dueDate: cursor,
        status: "pendente",
        createdAt: primeira.createdAt,
        installment: indice,
        installmentCount: PARCELAS_POR_SERIE,
      });
    }

    return [primeira, ...restantes];
  });
}

export const transactions: Transaction[] = buildTransactions();
