import type { UserProfile } from "@/types";

export { companies } from "./companies";
export { banks } from "./banks";
export { accounts } from "./accounts";
export { categories, expenses } from "./categories";
export { transactions, buildTransactions } from "./transactions";
export { recurrences } from "./recurrences";

export const currentUser: UserProfile = {
  name: "Caio Viveiros",
  role: "Gerência financeira",
  email: "caio.viveiross@outlook.com",
  initials: "CV",
};

/**
 * Identidade do produto isolada num único ponto: trocar o nome do sistema
 * significa alterar apenas este objeto.
 */
export const brand = {
  name: "Vita",
  tagline: "Gestão financeira",
};
