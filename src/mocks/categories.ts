import type { Category, Expense } from "@/types";

export const categories: Category[] = [
  {
    id: "cat_imovel",
    name: "Imóvel",
    description: "Aluguéis, condomínios e custos de ocupação das unidades.",
    kind: "saida",
    createdAt: "2021-03-08",
  },
  {
    id: "cat_servicos_publicos",
    name: "Serviços Públicos",
    description: "Despesas relacionadas aos serviços essenciais das empresas.",
    kind: "saida",
    createdAt: "2021-03-08",
  },
  {
    id: "cat_funcionarios",
    name: "Funcionários",
    description: "Folha de pagamento, encargos e benefícios da equipe.",
    kind: "saida",
    createdAt: "2021-03-08",
  },
  {
    id: "cat_impostos",
    name: "Impostos",
    description: "Tributos federais, estaduais e municipais das operações.",
    kind: "saida",
    createdAt: "2021-03-08",
  },
  {
    id: "cat_fornecedores",
    name: "Fornecedores",
    description: "Compra de matéria-prima, insumos e mercadorias para revenda.",
    kind: "saida",
    createdAt: "2021-03-08",
  },
  {
    id: "cat_marketing",
    name: "Marketing",
    description: "Investimento em mídia, campanhas e material promocional.",
    kind: "saida",
    createdAt: "2022-01-20",
  },
  {
    id: "cat_operacional",
    name: "Operacional",
    description: "Custos de logística, manutenção e funcionamento do dia a dia.",
    kind: "saida",
    createdAt: "2022-01-20",
  },
  {
    id: "cat_receitas",
    name: "Receitas",
    description: "Entradas de vendas, contratos e demais receitas da operação.",
    kind: "entrada",
    createdAt: "2021-03-08",
  },
];

export const expenses: Expense[] = [
  // Imóvel
  { id: "exp_aluguel_fabrica", categoryId: "cat_imovel", name: "Aluguel da fábrica", description: "Galpão industrial — contrato de 60 meses", createdAt: "2021-03-08" },
  { id: "exp_aluguel_loja", categoryId: "cat_imovel", name: "Aluguel da loja", createdAt: "2022-07-19" },
  { id: "exp_condominio", categoryId: "cat_imovel", name: "Condomínio", createdAt: "2022-07-19" },
  { id: "exp_iptu", categoryId: "cat_imovel", name: "IPTU", createdAt: "2021-03-08" },

  // Serviços Públicos
  { id: "exp_energia", categoryId: "cat_servicos_publicos", name: "Energia elétrica", description: "Unidades industrial e comercial", createdAt: "2021-03-08" },
  { id: "exp_agua", categoryId: "cat_servicos_publicos", name: "Água", createdAt: "2021-03-08" },
  { id: "exp_internet", categoryId: "cat_servicos_publicos", name: "Internet", createdAt: "2021-03-08" },
  { id: "exp_telefone", categoryId: "cat_servicos_publicos", name: "Telefone", createdAt: "2021-03-08" },

  // Funcionários
  { id: "exp_salarios", categoryId: "cat_funcionarios", name: "Salários", createdAt: "2021-03-08" },
  { id: "exp_vale_transporte", categoryId: "cat_funcionarios", name: "Vale transporte", createdAt: "2021-03-08" },
  { id: "exp_vale_refeicao", categoryId: "cat_funcionarios", name: "Vale refeição", createdAt: "2021-03-08" },
  { id: "exp_fgts", categoryId: "cat_funcionarios", name: "FGTS", createdAt: "2021-03-08" },

  // Impostos
  { id: "exp_simples", categoryId: "cat_impostos", name: "Simples Nacional", createdAt: "2021-03-08" },
  { id: "exp_inss", categoryId: "cat_impostos", name: "INSS", createdAt: "2021-03-08" },
  { id: "exp_icms", categoryId: "cat_impostos", name: "ICMS", createdAt: "2021-03-08" },

  // Fornecedores
  { id: "exp_materia_prima", categoryId: "cat_fornecedores", name: "Matéria-prima", createdAt: "2021-03-08" },
  { id: "exp_embalagens", categoryId: "cat_fornecedores", name: "Embalagens", createdAt: "2021-03-08" },
  { id: "exp_mercadorias", categoryId: "cat_fornecedores", name: "Mercadorias para revenda", createdAt: "2022-07-19" },

  // Marketing
  { id: "exp_midia_paga", categoryId: "cat_marketing", name: "Mídia paga", createdAt: "2022-01-20" },
  { id: "exp_material_grafico", categoryId: "cat_marketing", name: "Material gráfico", createdAt: "2022-01-20" },

  // Operacional
  { id: "exp_frete", categoryId: "cat_operacional", name: "Frete e logística", createdAt: "2022-01-20" },
  { id: "exp_manutencao", categoryId: "cat_operacional", name: "Manutenção de equipamentos", createdAt: "2022-01-20" },
  { id: "exp_software", categoryId: "cat_operacional", name: "Softwares e assinaturas", createdAt: "2022-01-20" },
  { id: "exp_contabilidade", categoryId: "cat_operacional", name: "Contabilidade", createdAt: "2021-03-08" },
  { id: "exp_combustivel", categoryId: "cat_operacional", name: "Combustível da frota", createdAt: "2024-02-05" },

  // Receitas
  { id: "exp_vendas_atacado", categoryId: "cat_receitas", name: "Vendas no atacado", createdAt: "2021-03-08" },
  { id: "exp_vendas_varejo", categoryId: "cat_receitas", name: "Vendas no varejo", createdAt: "2022-07-19" },
  { id: "exp_contratos", categoryId: "cat_receitas", name: "Contratos recorrentes", createdAt: "2023-05-11" },
  { id: "exp_rendimentos", categoryId: "cat_receitas", name: "Rendimentos financeiros", createdAt: "2023-01-08" },
];
