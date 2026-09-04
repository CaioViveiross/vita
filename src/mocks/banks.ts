import type { Bank } from "@/types";

/**
 * Bancos onde as contas são abertas. As cores saíram da paleta dessaturada
 * que antes vivia fixa em `bank-mark.tsx`, indexada por código FEBRABAN —
 * agora cada banco carrega a sua.
 */
export const banks: Bank[] = [
  { id: "bnk_itau", name: "Itaú Unibanco", code: "341", color: "#a55b09", createdAt: "2021-03-08" },
  { id: "bnk_santander", name: "Santander", code: "033", color: "#b3211a", createdAt: "2021-03-08" },
  { id: "bnk_bradesco", name: "Bradesco", code: "237", color: "#a3103a", createdAt: "2021-03-08" },
  { id: "bnk_bb", name: "Banco do Brasil", code: "001", color: "#8a6d0a", createdAt: "2021-03-08" },
  { id: "bnk_caixa", name: "Caixa Econômica", code: "104", color: "#28368f", createdAt: "2021-03-08" },
  { id: "bnk_nubank", name: "Nu Pagamentos", code: "260", color: "#6b2fb0", createdAt: "2022-07-19" },
  { id: "bnk_inter", name: "Banco Inter", code: "077", color: "#a8401d", createdAt: "2023-01-08" },
];
