import type { Company } from "@/types";

export const companies: Company[] = [
  {
    id: "cmp_fabrica",
    name: "Fábrica",
    legalName: "Vita Indústria de Alimentos LTDA",
    taxId: "18.472.905/0001-42",
    initials: "FB",
    color: "#0f766e",
    active: true,
    createdAt: "2021-03-08",
  },
  {
    id: "cmp_loja_centro",
    name: "Loja Centro",
    legalName: "Vita Comércio Varejista LTDA",
    taxId: "18.472.905/0002-23",
    initials: "LC",
    color: "#1d4ed8",
    active: true,
    createdAt: "2022-07-19",
  },
  {
    id: "cmp_distribuidora",
    name: "Distribuidora",
    legalName: "Vita Logística e Distribuição LTDA",
    taxId: "31.905.664/0001-08",
    initials: "DS",
    color: "#b45309",
    active: true,
    createdAt: "2024-02-05",
  },
];
