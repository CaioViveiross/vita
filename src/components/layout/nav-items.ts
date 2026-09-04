import {
  ArrowLeftRight,
  LayoutDashboard,
  Layers,
  Landmark,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Rota exata — usado apenas no Dashboard, que é a raiz. */
  end?: boolean;
}

export const primaryNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/empresas", label: "Empresas", icon: Landmark },
  { to: "/plano-de-contas", label: "Plano de Contas", icon: Layers },
];

export const secondaryNav: NavItem[] = [
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/perfil", label: "Perfil", icon: UserRound },
];
